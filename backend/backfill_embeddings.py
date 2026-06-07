import os
import sys
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
import models
from services.embeddings import get_embedding_sync

def backfill_embeddings():
    db = SessionLocal()
    try:
        # Check if vector extension is enabled (just in case)
        db.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        db.commit()
        
        # Get all menu items
        items = db.query(models.MenuItem).all()
        print(f"Found {len(items)} menu items in database.")
        
        count = 0
        for item in items:
            parts = [item.nameTr, item.nameEn]
            if item.descriptionTr:
                parts.append(item.descriptionTr)
            if item.descriptionEn:
                parts.append(item.descriptionEn)
            text_to_embed = " | ".join(parts)
            
            print(f"Generating embedding for '{item.nameEn}'...")
            vector = get_embedding_sync(text_to_embed)
            vector_str = "[" + ",".join(map(str, vector)) + "]"
            
            db.execute(
                text("UPDATE \"MenuItem\" SET embedding = cast(:vector as vector) WHERE id = :id"),
                {"vector": vector_str, "id": item.id}
            )
            count += 1
            
        db.commit()
        print(f"Successfully backfilled embeddings for {count} menu items.")
    except Exception as e:
        db.rollback()
        print(f"Error during backfill: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    backfill_embeddings()
