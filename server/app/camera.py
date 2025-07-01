from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Header
from fastapi.responses import FileResponse
import os
import time
from pathlib import Path
import logging

router = APIRouter(prefix="/api/camera", tags=["camera"])

# Configuration
CAMERA_DIR = Path("storage/camera")
CAMERA_DIR.mkdir(parents=True, exist_ok=True)
MAX_IMAGES = 50  # Keep last 50 images
AUTH_TOKEN = "YOUR_AUTH_TOKEN"  # Change this in production

# Logger setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    filename=CAMERA_DIR / 'camera.log'
)
logger = logging.getLogger(__name__)

@router.post("/upload")
async def upload_cam_image(
    file: UploadFile = File(...),
    x_auth_token: str = Header(None)
):
    """Endpoint for ESP32-CAM to upload images"""
    if x_auth_token != AUTH_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid token")
    
    try:
        # Generate filename with timestamp
        timestamp = int(time.time())
        filename = f"cam_{timestamp}.jpg"
        file_path = CAMERA_DIR / filename
        
        # Save the file
        with file_path.open("wb") as buffer:
            while content := await file.read(1024 * 1024):  # Read in 1MB chunks
                buffer.write(content)
                
        # Keep only the last MAX_IMAGES images
        all_files = sorted(CAMERA_DIR.glob("cam_*.jpg"), key=os.path.getmtime)
        for old_file in all_files[:-MAX_IMAGES]:
            old_file.unlink()
            
        return {"status": "success", "filename": filename}
        
    except Exception as e:
        logger.error(f"Camera upload failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Camera upload failed")

@router.get("/latest")
def get_latest_cam_image():
    """Get the latest captured image"""
    if not CAMERA_DIR.exists():
        raise HTTPException(status_code=404, detail="No camera images")
    
    # Find the newest file
    latest = max(CAMERA_DIR.glob("cam_*.jpg"), key=os.path.getmtime, default=None)
    if not latest:
        raise HTTPException(status_code=404, detail="No images available")
    
    return FileResponse(latest)

@router.get("/list")
def list_cam_images(limit: int = 10):
    """List recent camera images"""
    if not CAMERA_DIR.exists():
        return {"images": []}
    
    images = sorted(CAMERA_DIR.glob("cam_*.jpg"), key=os.path.getmtime, reverse=True)
    return {
        "images": [{
            "filename": img.name,
            "timestamp": os.path.getmtime(img),
            "size": img.stat().st_size
        } for img in images[:limit]]
    }