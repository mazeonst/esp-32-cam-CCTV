# Web Interface for ESP32-CAM Surveillance

This is the web interface for the ESP32-CAM surveillance system. It provides real-time viewing of the camera feed, access to recorded snapshots, and system configuration.

## Features

- **Live View**: Real-time streaming from the ESP32-CAM
- **Recordings**: Browse and manage captured snapshots
- **Settings**: Configure camera parameters and system settings
- **Responsive Design**: Works on desktop and mobile devices
- **Dark/Light Mode**: Toggle between dark and light themes

## Installation

1. Place all files in your web server's root directory
2. Ensure the server API endpoints match those in `camera.js`
3. Configure the base API URL in `camera.js` if needed

## Dependencies

- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Font Awesome](https://fontawesome.com/) - Icon library
- Modern browser with ES6 support

## API Endpoints

The web interface expects the following API endpoints:

- `GET /api/camera/latest` - Get latest camera image
- `GET /api/camera/list` - List available snapshots
- `GET /api/camera/download/{filename}` - Download specific snapshot
- `POST /api/camera/snapshot` - Capture new snapshot
- `DELETE /api/camera/delete/{filename}` - Delete snapshot
- `GET /api/camera/status` - Get camera status
- `POST /api/camera/settings` - Update camera settings

## Customization

You can customize:

- Colors in `assets/css/styles.css`
- API endpoints in `assets/js/camera.js`
- Layout in `index.html`