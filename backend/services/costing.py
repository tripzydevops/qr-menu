"""
Inventory Costing & Recipe Engine – Core Business Logic
========================================================
All public functions accept a SQLAlchemy ``Session`` as the first argument.
"""

import uuid
import datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Optional, Dict

from sqlalchemy.orm import Session

try:
    from .. import models, schemas
except ImportError:
    import models
    import schemas


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_ZERO = Decimal("0")
_ONE = Decimal("1")


def _dec(value) -> Decimal:
    """Safely convert any numeric value to Decimal via string to avoid
    float-precision issues."""
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


# ---------------------------------------------------------------------------
# 1. process_invoice
# ---------------------------------------------------------------------------

def process_invoice(db: Session, invoice_id: str) -> models.Invoice:
    """
    Process a pending invoice:
    1. For each InvoiceItem, compute WAC and update Ingredient stock / cost.
    2. Log cost changes to IngredientCostLog.
    3. Mark invoice status = "processed".
    4. Cascade-recalculate affected recipes.
    """
    invoice = db.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
    if not invoice:
        raise ValueError(f"Invoice {invoice_id} not found")
    if invoice.status != "pending":
        raise ValueError(f"Invoice {invoice_id} is already {invoice.status}")

    affected_ingredient_ids: set = set()

    for item in invoice.items:
        ingredient = db.query(models.Ingredient).filter(
            models.Ingredient.id == item.ingredientId
        ).first()
        if not ingredient:
            raise ValueError(f"Ingredient {item.ingredientId} not found")

        current_stock = _dec(ingredient.currentStock)
        current_wac = _dec(ingredient.weightedCost)
        qty = _dec(item.quantity)
        entered_unit_cost = _dec(item.unitCost)
        vat_rate = _dec(item.vatRate)
        is_inclusive = item.isVatInclusive

        # Calculate Net Unit Cost (KDV-hariç)
        if is_inclusive:
            unit_cost = entered_unit_cost / (_ONE + vat_rate)
        else:
            unit_cost = entered_unit_cost

        # WAC formula: (currentStock * currentWAC + qty * unitCost) / (currentStock + qty)
        new_total_stock = current_stock + qty
        if new_total_stock > _ZERO:
            new_wac = (current_stock * current_wac + qty * unit_cost) / new_total_stock
        else:
            new_wac = unit_cost

        old_cost = current_wac

        ingredient.currentStock = new_total_stock
        ingredient.weightedCost = new_wac
        ingredient.updatedAt = datetime.datetime.utcnow()

        # Log cost change
        cost_log = models.IngredientCostLog(
            id=str(uuid.uuid4()),
            ingredientId=ingredient.id,
            oldCost=old_cost,
            newCost=new_wac,
            reason="invoice",
        )
        db.add(cost_log)

        affected_ingredient_ids.add(ingredient.id)

    invoice.status = "processed"
    invoice.updatedAt = datetime.datetime.utcnow()
    db.flush()

    # Cascade to recipes
    for ingredient_id in affected_ingredient_ids:
        recalculate_affected_recipes(db, ingredient_id)

    db.commit()
    db.refresh(invoice)
    return invoice


# ---------------------------------------------------------------------------
# 2. recalculate_recipe_cost
# ---------------------------------------------------------------------------

def recalculate_recipe_cost(db: Session, recipe_id: str) -> Decimal:
    """
    cost = SUM(amountUsed * ingredient.weightedCost)
    Updates Recipe.currentCost and returns the cost.
    """
    recipe = db.query(models.Recipe).filter(models.Recipe.id == recipe_id).first()
    if not recipe:
        raise ValueError(f"Recipe {recipe_id} not found")

    total_cost = _ZERO
    for ri in recipe.ingredients:
        ingredient = db.query(models.Ingredient).filter(
            models.Ingredient.id == ri.ingredientId
        ).first()
        if ingredient:
            total_cost += _dec(ri.amountUsed) * _dec(ingredient.weightedCost)

    recipe.currentCost = total_cost
    recipe.updatedAt = datetime.datetime.utcnow()
    db.flush()
    return total_cost


# ---------------------------------------------------------------------------
# 3. recalculate_affected_recipes
# ---------------------------------------------------------------------------

def recalculate_affected_recipes(db: Session, ingredient_id: str) -> None:
    """
    Find every recipe that uses this ingredient and recalculate its cost.
    Then trigger margin-alert check for each.
    """
    recipe_ingredients = (
        db.query(models.RecipeIngredient)
        .filter(models.RecipeIngredient.ingredientId == ingredient_id)
        .all()
    )

    seen_recipe_ids: set = set()
    for ri in recipe_ingredients:
        if ri.recipeId not in seen_recipe_ids:
            seen_recipe_ids.add(ri.recipeId)
            recalculate_recipe_cost(db, ri.recipeId)
            check_margin_alert(db, ri.recipeId)


# ---------------------------------------------------------------------------
# 4. check_margin_alert
# ---------------------------------------------------------------------------

def check_margin_alert(
    db: Session, recipe_id: str
) -> Optional[models.PricingAlert]:
    """
    Compare current margin with target margin.  If deviation exceeds the
    venue's ``PricingAlertRule.swingThreshold`` → create a ``PricingAlert``
    with a suggested price.  Returns the alert or ``None``.
    """
    recipe = db.query(models.Recipe).filter(models.Recipe.id == recipe_id).first()
    if not recipe:
        return None

    menu_item = recipe.menuItem
    if not menu_item:
        return None

    price = _dec(menu_item.price)
    cost = _dec(recipe.currentCost)
    target_margin = _dec(recipe.targetMargin)

    if price <= _ZERO:
        return None

    current_margin = (price - cost) / price
    deviation = target_margin - current_margin

    # Load venue alert rule
    category = db.query(models.Category).filter(
        models.Category.id == menu_item.categoryId
    ).first()
    if not category:
        return None

    venue_id = category.venueId

    rule = (
        db.query(models.PricingAlertRule)
        .filter(models.PricingAlertRule.venueId == venue_id)
        .first()
    )
    swing_threshold = _dec(rule.swingThreshold) if rule else Decimal("0.05")

    if not rule or not rule.isActive:
        # If no rule or rule disabled, still create alert at default threshold
        pass

    if deviation >= swing_threshold:
        # Compute suggested price = cost / (1 - target_margin)
        denominator = _ONE - target_margin
        suggested_price = (cost / denominator).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        ) if denominator > _ZERO else price

        alert = models.PricingAlert(
            id=str(uuid.uuid4()),
            venueId=venue_id,
            menuItemId=menu_item.id,
            recipeId=recipe.id,
            alertType="margin_drop",
            message=(
                f"Margin for '{menu_item.nameEn}' dropped to "
                f"{(current_margin * 100).quantize(Decimal('0.01'))}% "
                f"(target {(target_margin * 100).quantize(Decimal('0.01'))}%)"
            ),
            currentMargin=current_margin,
            targetMargin=target_margin,
            suggestedPrice=suggested_price,
            isResolved=False,
        )
        db.add(alert)
        db.flush()
        return alert

    return None


# ---------------------------------------------------------------------------
# 5. get_profitability_dashboard
# ---------------------------------------------------------------------------

def get_profitability_dashboard(
    db: Session, venue_id: str
) -> schemas.ProfitabilityDashboard:
    """
    Build a profitability dashboard for all menu items with recipes in the venue.
    """
    # All menu items belonging to this venue
    menu_items = (
        db.query(models.MenuItem)
        .join(models.Category, models.MenuItem.categoryId == models.Category.id)
        .filter(models.Category.venueId == venue_id)
        .all()
    )

    items_list: List[schemas.MenuItemProfitability] = []
    healthy = warning = critical = 0
    margin_sum = _ZERO
    items_with_recipes = 0

    for mi in menu_items:
        recipe = mi.recipe
        if not recipe:
            continue
        items_with_recipes += 1

        price = _dec(mi.price)
        cost = _dec(recipe.currentCost)
        target_margin = _dec(recipe.targetMargin)

        if price > _ZERO:
            margin = (price - cost) / price
        else:
            margin = _ZERO

        deviation = abs(target_margin - margin)

        denominator = _ONE - target_margin
        suggested_price = (
            (cost / denominator).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            if denominator > _ZERO
            else price
        )

        if deviation < Decimal("0.02"):
            item_status = "healthy"
            healthy += 1
        elif deviation < Decimal("0.05"):
            item_status = "warning"
            warning += 1
        else:
            item_status = "critical"
            critical += 1

        margin_sum += margin

        items_list.append(
            schemas.MenuItemProfitability(
                menuItemId=mi.id,
                menuItemName=mi.nameEn,
                menuPrice=price,
                recipeCost=cost,
                margin=margin,
                targetMargin=target_margin,
                marginDeviation=target_margin - margin,
                suggestedPrice=suggested_price,
                status=item_status,
            )
        )

    avg_margin = (
        (margin_sum / Decimal(str(items_with_recipes))).quantize(
            Decimal("0.0001"), rounding=ROUND_HALF_UP
        )
        if items_with_recipes > 0
        else _ZERO
    )

    return schemas.ProfitabilityDashboard(
        venueId=venue_id,
        totalMenuItems=len(menu_items),
        itemsWithRecipes=items_with_recipes,
        healthyCount=healthy,
        warningCount=warning,
        criticalCount=critical,
        averageMargin=avg_margin,
        items=items_list,
    )


# ---------------------------------------------------------------------------
# 6. sync_prices
# ---------------------------------------------------------------------------

def sync_prices(
    db: Session,
    venue_id: str,
    menu_item_ids: List[str],
    sync_type: str = "suggested",
    custom_prices: Optional[Dict[str, Decimal]] = None,
) -> List[schemas.PriceSyncResult]:
    """
    Update MenuItem.price with the suggested or custom price.
    Mark matching PricingAlerts as resolved.
    """
    results: List[schemas.PriceSyncResult] = []

    for mi_id in menu_item_ids:
        menu_item = db.query(models.MenuItem).filter(models.MenuItem.id == mi_id).first()
        if not menu_item:
            continue

        recipe = menu_item.recipe
        if not recipe:
            continue

        old_price = _dec(menu_item.price)
        cost = _dec(recipe.currentCost)
        target_margin = _dec(recipe.targetMargin)

        if sync_type == "custom" and custom_prices and mi_id in custom_prices:
            new_price = _dec(custom_prices[mi_id])
        else:
            denominator = _ONE - target_margin
            new_price = (
                (cost / denominator).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                if denominator > _ZERO
                else old_price
            )

        menu_item.price = new_price
        menu_item.updatedAt = datetime.datetime.utcnow()

        new_margin = (
            ((new_price - cost) / new_price)
            if new_price > _ZERO
            else _ZERO
        )

        # Resolve open alerts for this item in the venue
        open_alerts = (
            db.query(models.PricingAlert)
            .filter(
                models.PricingAlert.venueId == venue_id,
                models.PricingAlert.menuItemId == mi_id,
                models.PricingAlert.isResolved == False,
            )
            .all()
        )
        for alert in open_alerts:
            alert.isResolved = True

        results.append(
            schemas.PriceSyncResult(
                menuItemId=mi_id,
                menuItemName=menu_item.nameEn,
                oldPrice=old_price,
                newPrice=new_price,
                newMargin=new_margin,
            )
        )

    db.commit()
    return results


# ---------------------------------------------------------------------------
# 7. deduct_stock_from_order
# ---------------------------------------------------------------------------

def deduct_stock_from_order(db: Session, order_id: str) -> List[dict]:
    """
    For each OrderItem, look up the recipe and deduct
    ``amountUsed * quantity`` from ``Ingredient.currentStock``.
    Returns a list of low-stock warnings (if any).

    Respects ``PricingAlertRule.stockDeductionMode`` – when set to
    ``"manual"`` the deduction is skipped entirely.
    """
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise ValueError(f"Order {order_id} not found")

    # Check venue-level deduction mode
    rule = (
        db.query(models.PricingAlertRule)
        .filter(models.PricingAlertRule.venueId == order.venueId)
        .first()
    )
    if rule and rule.stockDeductionMode == "manual":
        return []

    low_stock_warnings: List[dict] = []

    for order_item in order.items:
        menu_item = db.query(models.MenuItem).filter(
            models.MenuItem.id == order_item.menuItemId
        ).first()
        if not menu_item or not menu_item.recipe:
            continue

        recipe = menu_item.recipe
        qty = _dec(order_item.quantity)

        for ri in recipe.ingredients:
            ingredient = db.query(models.Ingredient).filter(
                models.Ingredient.id == ri.ingredientId
            ).first()
            if not ingredient:
                continue

            deduction = _dec(ri.amountUsed) * qty
            ingredient.currentStock = _dec(ingredient.currentStock) - deduction
            ingredient.updatedAt = datetime.datetime.utcnow()

            # Check reorder level
            if (
                ingredient.reorderLevel is not None
                and _dec(ingredient.currentStock) <= _dec(ingredient.reorderLevel)
            ):
                low_stock_warnings.append(
                    {
                        "ingredientId": ingredient.id,
                        "ingredientName": ingredient.name,
                        "currentStock": str(ingredient.currentStock),
                        "reorderLevel": str(ingredient.reorderLevel),
                    }
                )

    db.commit()
    return low_stock_warnings
