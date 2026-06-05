import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any, List
import uuid
try:
    from ..models import AnalyticsEvent, MenuItem, Category
except ImportError:
    from models import AnalyticsEvent, MenuItem, Category

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
