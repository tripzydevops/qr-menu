import uuid
import datetime
from sqlalchemy.orm import Session
from typing import List, Dict, Any

try:
    from .. import models
except ImportError:
    import models

def emit_order_signals(db: Session, order_id: str) -> None:
    """
    On order completion, aggregates order items and metadata (allergens, dietary labels, price brackets)
    and logs them as structured UserSignal events to enrich the Tripzy travel profile.
    """
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        return

    # Gather item names, pricing, and dietary labels
    items_summary = []
    dietary_labels_found = set()
    allergens_found = set()

    for item in order.items:
        menu_item = db.query(models.MenuItem).filter(models.MenuItem.id == item.menuItemId).first()
        if menu_item:
            items_summary.append({
                "itemId": menu_item.id,
                "nameEn": menu_item.nameEn,
                "price": str(item.price),
                "quantity": item.quantity
            })
            # Collect dietary labels
            for label in menu_item.dietaryLabels:
                dietary_labels_found.add(label.key)
            # Collect allergens
            if menu_item.allergens:
                for allergen in menu_item.allergens:
                    allergens_found.add(allergen)

    # 1. Emit base order_placed signal
    session_id = f"session-order-{order.id}"
    order_signal = models.UserSignal(
        id=str(uuid.uuid4()),
        sessionId=session_id,
        venueId=order.venueId,
        tableId=order.tableId,
        eventType="order_placed",
        eventData={
            "orderId": order.id,
            "totalAmount": str(order.totalAmount),
            "paymentMethod": order.paymentMethod or "unknown",
            "items": items_summary,
            "timestamp": order.paidAt.isoformat() if order.paidAt else datetime.datetime.utcnow().isoformat()
        }
    )
    db.add(order_signal)

    # 2. Emit dietary preferences signal if dietary labels are found
    if dietary_labels_found:
        dietary_signal = models.UserSignal(
            id=str(uuid.uuid4()),
            sessionId=session_id,
            venueId=order.venueId,
            tableId=order.tableId,
            eventType="implicit_dietary_preference",
            eventData={
                "orderId": order.id,
                "dietaryLabels": list(dietary_labels_found),
                "allergens": list(allergens_found)
            }
        )
        db.add(dietary_signal)

    # 3. Emit spending behavior signal (lifestyle bracket)
    price_level = "low"
    total_val = float(order.totalAmount)
    if total_val > 1000:
        price_level = "high"
    elif total_val > 400:
        price_level = "medium"

    spending_signal = models.UserSignal(
        id=str(uuid.uuid4()),
        sessionId=session_id,
        venueId=order.venueId,
        tableId=order.tableId,
        eventType="spending_bracket",
        eventData={
            "orderId": order.id,
            "amount": total_val,
            "bracket": price_level
        }
    )
    db.add(spending_signal)
    
    db.commit()

def export_lifestyle_signals(db: Session, venue_id: str) -> List[Dict[str, Any]]:
    """
    Export all signals collected at a venue to feed Tripzy's Cross-Domain Transfer Agent.
    Filters out internal DB noise and formats event details nicely.
    """
    signals = db.query(models.UserSignal).filter(models.UserSignal.venueId == venue_id).all()
    
    exported = []
    for sig in signals:
        exported.append({
            "id": sig.id,
            "sessionId": sig.sessionId,
            "venueId": sig.venueId,
            "tableId": sig.tableId,
            "eventType": sig.eventType,
            "eventData": sig.eventData,
            "createdAt": sig.createdAt.isoformat()
        })
    return exported
