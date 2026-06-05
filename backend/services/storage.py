import os
import uuid
import httpx
import logging
from fastapi import UploadFile

logger = logging.getLogger("storage_service")

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://weaneytlhxiexrsiqepy.supabase.co")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "sb_publishable_D5qMQbj352cqbP5Ys9gu-w_w2lT0uUo")
SUPABASE_BUCKET = "menu-images"
LOCAL_UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "uploads")

# Ensure local upload dir exists
os.makedirs(LOCAL_UPLOAD_DIR, exist_ok=True)

async def upload_image(file: UploadFile) -> str:
    """
    Uploads an image to Supabase Storage via REST API.
    Falls back to local storage if the Supabase upload fails.
    """
    file_content = await file.read()
    await file.seek(0) # reset file cursor

    file_ext = os.path.splitext(file.filename)[1]
    if not file_ext:
        file_ext = ".jpg"
    unique_filename = f"{uuid.uuid4()}{file_ext}"

    # Try Supabase Storage REST upload first
    try:
        url = f"{SUPABASE_URL}/storage/v1/object/{SUPABASE_BUCKET}/{unique_filename}"
        headers = {
            "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
            "apikey": SUPABASE_ANON_KEY,
            "Content-Type": file.content_type or "image/jpeg"
        }

        logger.info(f"Attempting Supabase upload to: {url}")
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, content=file_content, headers=headers)
            
            if response.status_code == 200:
                download_url = f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_BUCKET}/{unique_filename}"
                logger.info(f"Supabase upload success: {download_url}")
                return download_url
            else:
                logger.warning(f"Supabase returned status {response.status_code}: {response.text}")
    except Exception as e:
        logger.error(f"Error uploading to Supabase: {str(e)}")

    # Fallback: Save to local directory
    logger.info("Falling back to local storage upload")
    try:
        local_path = os.path.join(LOCAL_UPLOAD_DIR, unique_filename)
        with open(local_path, "wb") as buffer:
            buffer.write(file_content)
        
        # In development/VM context, we serve static files from /static/uploads
        # We assume the API server runs on the current host, so a relative path is fine.
        # Let's return the relative url /static/uploads/{filename} which can be resolved by the client
        return f"/static/uploads/{unique_filename}"
    except Exception as e:
        logger.error(f"Error saving file locally: {str(e)}")
        raise RuntimeError(f"Could not save file: {str(e)}")

