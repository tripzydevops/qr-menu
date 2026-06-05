import os
import uuid
import httpx
import logging
from fastapi import UploadFile

logger = logging.getLogger("storage_service")

FIREBASE_BUCKET = os.getenv("FIREBASE_STORAGE_BUCKET", "travel-c8012.firebasestorage.app")
LOCAL_UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "uploads")

# Ensure local upload dir exists
os.makedirs(LOCAL_UPLOAD_DIR, exist_ok=True)

async def upload_image(file: UploadFile) -> str:
    """
    Uploads an image to Firebase Storage via REST API.
    Falls back to local storage if the Firebase upload fails.
    """
    file_content = await file.read()
    await file.seek(0) # reset file cursor

    file_ext = os.path.splitext(file.filename)[1]
    if not file_ext:
        file_ext = ".jpg"
    unique_filename = f"{uuid.uuid4()}{file_ext}"

    # Try Firebase Storage REST upload first
    try:
        url = f"https://firebasestorage.googleapis.com/v0/b/{FIREBASE_BUCKET}/o"
        params = {"name": f"menu-items/{unique_filename}"}
        headers = {"Content-Type": file.content_type or "image/jpeg"}

        logger.info(f"Attempting Firebase upload to: {url} with name menu-items/{unique_filename}")
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, content=file_content, params=params, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                download_token = data.get("downloadTokens")
                # Construct the media link
                encoded_name = f"menu-items%2F{unique_filename}"
                download_url = f"https://firebasestorage.googleapis.com/v0/b/{FIREBASE_BUCKET}/o/{encoded_name}?alt=media"
                if download_token:
                    download_url += f"&token={download_token}"
                
                logger.info(f"Firebase upload success: {download_url}")
                return download_url
            else:
                logger.warning(f"Firebase returned status {response.status_code}: {response.text}")
    except Exception as e:
        logger.error(f"Error uploading to Firebase: {str(e)}")

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
