# ESP32-CAM Surveillance System

A complete surveillance system using ESP32-CAM module with remote server storage and web interface.

## Features

- ESP32-CAM captures images periodically and uploads to server
- Secure authentication with token-based system
- Web interface to view latest images and manage snapshots
- Automatic cleanup of old images
- Easy integration with existing projects

## Hardware Requirements

- ESP32-CAM module
- FTDI programmer or compatible USB-to-serial converter
- Power supply (5V recommended)

## Setup

### 1. Flash the ESP32-CAM

1. Install PlatformIO (VS Code extension recommended)
2. Clone this repository
3. Update Wi-Fi and server credentials in `firmware/src/config.h`
4. Connect ESP32-CAM to your computer
5. Build and upload the firmware

### 2. Set Up the Server

1. Install Python 3.8+
2. Create virtual environment: `python -m venv venv`
3. Activate environment: `source venv/bin/activate` (Linux/Mac) or `venv\Scripts\activate` (Windows)
4. Install dependencies: `pip install -r server/requirements.txt`
5. Configure environment variables in `.env` file
6. Run server: `uvicorn server.app.main:app --host 0.0.0.0 --port 8000`

### 3. Access Web Interface

1. Open browser to `http://your-server-ip:8000`
2. Login with admin credentials

## API Reference

### Camera Endpoints

- `POST /api/camera/upload` - Upload image from ESP32-CAM
- `GET /api/camera/latest` - Get latest captured image
- `GET /api/camera/list` - List recent images

## License

MIT License - see LICENSE file for details