# Web Dashboard

This directory contains the static frontend served by the FastAPI backend.

## Scope

- Display the latest uploaded frame
- Poll camera status
- Browse stored snapshots
- Download and delete snapshots
- Persist dashboard settings through the backend API

## Files

- [`index.html`](index.html): dashboard markup
- [`assets/js/app.js`](assets/js/app.js): page shell interactions such as tabs, theme, modal, and clock
- [`assets/js/camera.js`](assets/js/camera.js): camera API client and dashboard actions
- [`assets/css/styles.css`](assets/css/styles.css): custom styling layered on top of Tailwind utilities

## Backend Contract

The frontend expects the backend to expose the `/api/camera/*` endpoints documented in the root README.

## Publishing Note

The frontend intentionally remains framework-free so it can be hosted directly by the API service or copied to another static host with only the API base URL adjusted.
