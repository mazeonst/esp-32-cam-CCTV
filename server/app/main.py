from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")

from server.app.camera import router as camera_router

WEB_DIR = BASE_DIR / "web"
ASSETS_DIR = WEB_DIR / "assets"

app = FastAPI(title="ESP32-CAM CCTV", version="1.0.0")
app.include_router(camera_router)

app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")


@app.get("/", include_in_schema=False)
def index():
    return FileResponse(WEB_DIR / "index.html")


@app.get("/health", include_in_schema=False)
def health():
    return {"status": "ok"}
