import json
import logging
import os
import shutil
import time
from pathlib import Path

from fastapi import APIRouter, File, Header, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/camera", tags=["camera"])

CAMERA_DIR = Path(os.getenv("CAMERA_STORAGE_DIR", "storage/camera"))
CAMERA_DIR.mkdir(parents=True, exist_ok=True)

SETTINGS_FILE = CAMERA_DIR / "settings.json"
LOG_FILE = CAMERA_DIR / "camera.log"

MAX_IMAGES = int(os.getenv("CAMERA_MAX_IMAGES", "50"))
AUTH_TOKEN = os.getenv("CAMERA_AUTH_TOKEN", "CHANGE_ME")
CONNECTED_WINDOW_SECONDS = int(os.getenv("CAMERA_CONNECTED_WINDOW_SECONDS", "120"))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    filename=LOG_FILE,
)
logger = logging.getLogger(__name__)

DEFAULT_SETTINGS = {
    "captureInterval": 10,
    "imageQuality": 20,
    "resolution": "vga",
    "nightMode": False,
}


class CameraSettings(BaseModel):
    captureInterval: int = Field(default=10, ge=1, le=3600)
    imageQuality: int = Field(default=20, ge=1, le=100)
    resolution: str = Field(default="vga")
    nightMode: bool = False


def is_authorized(x_auth_token: str | None = None, authorization: str | None = None) -> bool:
    if x_auth_token == AUTH_TOKEN:
        return True
    if authorization == f"Bearer {AUTH_TOKEN}":
        return True
    return False


def require_auth(x_auth_token: str | None = None, authorization: str | None = None) -> None:
    if not is_authorized(x_auth_token=x_auth_token, authorization=authorization):
        raise HTTPException(status_code=403, detail="Invalid token")


def list_images() -> list[Path]:
    return sorted(CAMERA_DIR.glob("cam_*.jpg"), key=os.path.getmtime, reverse=True)


def get_latest_image() -> Path | None:
    images = list_images()
    return images[0] if images else None


def trim_old_images() -> None:
    images = list_images()
    for old_file in images[MAX_IMAGES:]:
        old_file.unlink(missing_ok=True)


def load_settings() -> dict:
    if not SETTINGS_FILE.exists():
        return DEFAULT_SETTINGS.copy()

    try:
        return {**DEFAULT_SETTINGS, **json.loads(SETTINGS_FILE.read_text())}
    except Exception:
        logger.exception("Failed to read settings file, falling back to defaults")
        return DEFAULT_SETTINGS.copy()


def save_settings(settings: dict) -> None:
    SETTINGS_FILE.write_text(json.dumps(settings, indent=2))


@router.post("/upload")
async def upload_cam_image(
    file: UploadFile = File(...),
    x_auth_token: str | None = Header(default=None),
):
    """Accept an uploaded frame from the ESP32-CAM device."""
    require_auth(x_auth_token=x_auth_token)

    timestamp = int(time.time())
    filename = f"cam_{timestamp}.jpg"
    file_path = CAMERA_DIR / filename

    try:
        with file_path.open("wb") as buffer:
            while content := await file.read(1024 * 1024):
                buffer.write(content)

        trim_old_images()
        logger.info("Stored uploaded image as %s", filename)
        return {"status": "success", "filename": filename}
    except Exception as exc:
        logger.exception("Camera upload failed")
        raise HTTPException(status_code=500, detail="Camera upload failed") from exc


@router.get("/latest")
def get_latest_cam_image():
    """Return the newest stored camera image."""
    latest = get_latest_image()
    if not latest:
        raise HTTPException(status_code=404, detail="No images available")

    return FileResponse(latest)


@router.get("/list")
def list_cam_images(limit: int = 25):
    """Return recent camera images sorted by newest first."""
    images = list_images()
    safe_limit = max(1, min(limit, 500))

    return {
        "images": [
            {
                "filename": img.name,
                "timestamp": os.path.getmtime(img),
                "size": img.stat().st_size,
            }
            for img in images[:safe_limit]
        ]
    }


@router.get("/download/{filename}")
def download_cam_image(filename: str):
    """Download a stored snapshot by file name."""
    file_path = CAMERA_DIR / Path(filename).name
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")

    return FileResponse(file_path, filename=file_path.name)


@router.delete("/delete/{filename}")
def delete_cam_image(
    filename: str,
    authorization: str | None = Header(default=None),
):
    """Delete a single snapshot."""
    require_auth(authorization=authorization)

    file_path = CAMERA_DIR / Path(filename).name
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")

    file_path.unlink()
    logger.info("Deleted image %s", file_path.name)
    return {"status": "success", "filename": file_path.name}


@router.delete("/delete")
def delete_all_cam_images(authorization: str | None = Header(default=None)):
    """Delete all stored snapshots."""
    require_auth(authorization=authorization)

    deleted = 0
    for image in list_images():
        image.unlink(missing_ok=True)
        deleted += 1

    logger.info("Deleted %s images", deleted)
    return {"status": "success", "deleted": deleted}


@router.post("/snapshot")
def create_snapshot_copy(authorization: str | None = Header(default=None)):
    """Create a stored copy of the latest uploaded frame."""
    require_auth(authorization=authorization)

    latest = get_latest_image()
    if not latest:
        raise HTTPException(status_code=404, detail="No source image available")

    filename = f"cam_{int(time.time())}_snapshot.jpg"
    target = CAMERA_DIR / filename
    shutil.copy2(latest, target)
    trim_old_images()
    logger.info("Created manual snapshot %s", filename)
    return {"status": "success", "filename": filename}


@router.get("/status")
def get_camera_status():
    """Return a simple health snapshot for the dashboard."""
    images = list_images()
    latest = images[0] if images else None
    latest_timestamp = os.path.getmtime(latest) if latest else None
    now = time.time()
    connected = bool(latest_timestamp and now - latest_timestamp <= CONNECTED_WINDOW_SECONDS)

    return {
        "connected": connected,
        "latestTimestamp": latest_timestamp,
        "storedImages": len(images),
        "maxImages": MAX_IMAGES,
        "wifiStrength": None,
    }


@router.get("/settings")
def get_camera_settings():
    """Return persisted dashboard settings."""
    return load_settings()


@router.post("/settings")
def update_camera_settings(
    settings: CameraSettings,
    authorization: str | None = Header(default=None),
):
    """Persist dashboard-side camera settings."""
    require_auth(authorization=authorization)
    payload = settings.model_dump()
    save_settings(payload)
    logger.info("Updated dashboard settings")
    return {"status": "success", "settings": payload}
