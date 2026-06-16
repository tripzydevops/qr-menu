import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any, List
import uuid
try:
    from ..models import AnalyticsEvent, MenuItem, Category, Order, OrderItem, Recipe
except ImportError:
    from models import AnalyticsEvent, MenuItem, Category, Order, OrderItem, Recipe

def log_view(db: Session, venue_id: str, table_id: str = None, locale: str = None, path: str = None, user_agent: str = None):
    """
    Log a menu view event to the database.
    """
    event = AnalyticsEvent(
        id=str(uuid.uuid4()),
        venueId=venue_id,
        tableId=table_id,
        locale=locale,
        path=path,
        userAgent=user_agent
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event

def get_analytics_summary(db: Session, venue_id: str) -> Dict[str, Any]:
    """
    Get aggregated analytics for a venue.
    Includes view counts, top items, and language breakdown.
    """
    now = datetime.datetime.utcnow()
    today_start = datetime.datetime(now.year, now.month, now.day)
    week_start = today_start - datetime.timedelta(days=7)

    # 1. Total views
    total_views = db.query(AnalyticsEvent).filter(AnalyticsEvent.venueId == venue_id).count()
    
    # 2. Views today
    views_today = db.query(AnalyticsEvent).filter(
        AnalyticsEvent.venueId == venue_id,
        AnalyticsEvent.createdAt >= today_start
    ).count()

    # 3. Views this week
    views_week = db.query(AnalyticsEvent).filter(
        AnalyticsEvent.venueId == venue_id,
        AnalyticsEvent.createdAt >= week_start
    ).count()

    # 4. Language breakdown
    lang_stats = db.query(
        AnalyticsEvent.locale,
        func.count(AnalyticsEvent.id)
    ).filter(AnalyticsEvent.venueId == venue_id).group_by(AnalyticsEvent.locale).all()

    languages = {lang or "unknown": count for lang, count in lang_stats}

    # 5. Top items - in a real app we'd track clicks on specific items, but for now
    # let's mock the top items based on seeded menu items, or count visits to paths like /menu/item-id.
    # Let's count items where the path ends with or contains the item ID.
    item_visits = db.query(
        AnalyticsEvent.path,
        func.count(AnalyticsEvent.id)
    ).filter(
        AnalyticsEvent.venueId == venue_id,
        AnalyticsEvent.path.like("%/menu/item-%")
    ).group_by(AnalyticsEvent.path).all()

    # Resolve paths to item names
    top_items = []
    # Fetch all items to map path -> name
    items = db.query(MenuItem).all()
    item_map = {f"item-{item.id}": item.nameTr for item in items}
    
    for path, count in item_visits:
        if path:
            item_id = path.split("/")[-1]
            if item_id in item_map:
                top_items.append({
                    "name": item_map[item_id],
                    "views": count
                })
            else:
                top_items.append({
                    "name": item_id,
                    "views": count
                })
                
    # Sort top items
    top_items = sorted(top_items, key=lambda x: x["views"], reverse=True)[:5]
    
    # Default top items if database is empty
    if not top_items:
        # Fallback to some items for showcase
        items = db.query(MenuItem).join(Category).filter(Category.venueId == venue_id).limit(5).all()
        top_items = [{"name": item.nameTr, "views": 0} for item in items]

    return {
        "totalViews": total_views,
        "viewsToday": views_today,
        "viewsThisWeek": views_week,
        "languages": languages,
        "topItems": top_items
    }

def get_sales_analytics(db: Session, venue_id: str, days: int = 30) -> Dict[str, Any]:
    """
    Calculate sales summary, best/worst sellers (with views conversion rate),
    and Menu Engineering Matrix (Stars, Plowhorses, Puzzles, Dogs) using recipe costing.
    """
    now = datetime.datetime.utcnow()
    start_date = now - datetime.timedelta(days=days)

    # 1. Fetch completed or paid orders for the venue in the time range
    orders = db.query(Order).filter(
        Order.venueId == venue_id,
        Order.createdAt >= start_date,
        (Order.status == "completed") | (Order.paidAt.isnot(None))
    ).all()

    # 2. Compute key metrics
    total_orders = len(orders)
    total_revenue = sum(float(order.netAmount) for order in orders)
    aov = total_revenue / total_orders if total_orders > 0 else 0.0
    
    # Fetch all menu items for the venue to map and get items with 0 sales
    venue_items = db.query(MenuItem).join(Category).filter(
        Category.venueId == venue_id,
        MenuItem.isDeleted == False
    ).all()

    # Get views count for all items in the time range
    view_events = db.query(AnalyticsEvent).filter(
        AnalyticsEvent.venueId == venue_id,
        AnalyticsEvent.createdAt >= start_date
    ).all()

    # Count views by item ID (path pattern like "/menu/item-{id}")
    item_views = {}
    for event in view_events:
        if event.path and "/menu/item-" in event.path:
            token = event.path.split("/")[-1]
            if token.startswith("item-"):
                item_id = token.replace("item-", "", 1)
                item_views[item_id] = item_views.get(item_id, 0) + 1

    # Map item ID to sales quantity & revenue
    item_sales = {}
    total_items_sold = 0
    
    order_ids = [order.id for order in orders]
    if order_ids:
        order_items = db.query(OrderItem).filter(OrderItem.orderId.in_(order_ids)).all()
        for oi in order_items:
            item_id = oi.menuItemId
            if item_id not in item_sales:
                item_sales[item_id] = {"quantity": 0, "revenue": 0.0}
            item_sales[item_id]["quantity"] += oi.quantity
            item_sales[item_id]["revenue"] += float(oi.price) * oi.quantity
            total_items_sold += oi.quantity

    # Resolve items with details
    items_performance = []
    for item in venue_items:
        sales = item_sales.get(item.id, {"quantity": 0, "revenue": 0.0})
        views = item_views.get(item.id, 0)
        
        # Get recipe cost
        recipe_cost = 0.0
        recipe = db.query(Recipe).filter(Recipe.menuItemId == item.id, Recipe.isDeleted == False).first()
        if recipe:
            recipe_cost = float(recipe.currentCost)
            
        price = float(item.price)
        margin = price - recipe_cost
        
        qty = sales["quantity"]
        rev = sales["revenue"]
        conv_rate = (qty / views * 100) if views > 0 else 0.0
        
        items_performance.append({
            "id": item.id,
            "name": item.nameTr,
            "nameEn": item.nameEn,
            "price": price,
            "recipeCost": recipe_cost,
            "margin": margin,
            "quantity": qty,
            "revenue": rev,
            "views": views,
            "conversionRate": round(conv_rate, 2)
        })

    # Sort to find best and worst sellers
    # Best sellers: sorted by quantity descending
    best_sellers = sorted(items_performance, key=lambda x: x["quantity"], reverse=True)[:5]
    # Worst sellers: sorted by quantity ascending
    worst_sellers = sorted(items_performance, key=lambda x: x["quantity"])[:5]

    # 3. Menu Engineering Matrix classification
    # Calculate thresholds: average popularity and margin of active venue items
    avg_quantity = sum(x["quantity"] for x in items_performance) / len(items_performance) if items_performance else 0
    avg_margin = sum(x["margin"] for x in items_performance) / len(items_performance) if items_performance else 0

    stars = []
    plowhorses = []
    puzzles = []
    dogs = []

    for ip in items_performance:
        is_high_popularity = ip["quantity"] >= avg_quantity
        is_high_margin = ip["margin"] >= avg_margin

        item_data = {
            "id": ip["id"],
            "name": ip["name"],
            "nameEn": ip["nameEn"],
            "price": ip["price"],
            "recipeCost": ip["recipeCost"],
            "margin": ip["margin"],
            "quantity": ip["quantity"],
            "revenue": ip["revenue"],
            "views": ip["views"],
            "conversionRate": ip["conversionRate"]
        }

        if is_high_popularity and is_high_margin:
            item_data["recommendation"] = "Popüler ve karlı! Kalitesini koruyun ve menüde görünürlüğünü sürdürün."
            stars.append(item_data)
        elif is_high_popularity and not is_high_margin:
            item_data["recommendation"] = "Çok satıyor ama karı düşük. Porsiyon küçültmeyi, fiyatı hafif artırmayı veya malzeme maliyetini düşürmeyi deneyin."
            plowhorses.append(item_data)
        elif not is_high_popularity and is_high_margin:
            item_data["recommendation"] = "Karlı ama az satıyor. Menüde daha görünür yapın, görsel ekleyin veya yapay zeka garson ile önerilmesini sağlayın."
            puzzles.append(item_data)
        else:
            item_data["recommendation"] = "Hem az satıyor hem karı düşük. Menüden kaldırmayı veya tarifini/fiyatını yeniden gözden geçirmeyi düşünün."
            dogs.append(item_data)

    return {
        "summary": {
            "totalRevenue": round(total_revenue, 2),
            "totalOrders": total_orders,
            "averageOrderValue": round(aov, 2),
            "totalItemsSold": total_items_sold
        },
        "bestSellers": best_sellers,
        "worstSellers": worst_sellers,
        "matrix": {
            "stars": stars,
            "plowhorses": plowhorses,
            "puzzles": puzzles,
            "dogs": dogs,
            "thresholds": {
                "popularity": round(avg_quantity, 2),
                "margin": round(avg_margin, 2)
            }
        }
    }

