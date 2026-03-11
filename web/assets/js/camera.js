// Camera control module for the dashboard.
class CameraController {
  constructor() {
    this.streamInterval = null;
    this.streamActive = false;
    this.apiBaseUrl = "/api/camera";
    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.elements = {
      liveFeed: document.getElementById("liveFeed"),
      feedTimestamp: document.getElementById("feedTimestamp"),
      feedResolution: document.getElementById("feedResolution"),
      startStreamBtn: document.getElementById("startStreamBtn"),
      snapshotBtn: document.getElementById("snapshotBtn"),
      fullscreenBtn: document.getElementById("fullscreenBtn"),
      recordingsGrid: document.getElementById("recordingsGrid"),
      authToken: document.getElementById("authToken"),
      settingsForm: document.getElementById("cameraSettingsForm"),
      securityForm: document.getElementById("securitySettingsForm"),
      refreshRecordingsBtn: document.getElementById("refreshRecordingsBtn"),
      dateFilter: document.getElementById("recordingsDateFilter"),
      deleteAllBtn: document.getElementById("deleteAllBtn"),
      resetSettingsBtn: document.getElementById("resetSettingsBtn"),
      generateTokenBtn: document.getElementById("generateTokenBtn"),
      storageStatus: document.getElementById("storageStatus")
    };
  }

  bindEvents() {
    this.elements.startStreamBtn.addEventListener("click", () =>
      this.streamActive ? this.stopStream() : this.startStream()
    );

    this.elements.snapshotBtn.addEventListener("click", () => this.takeSnapshot());
    this.elements.fullscreenBtn.addEventListener("click", () => this.openFullscreen());
    this.elements.settingsForm.addEventListener("submit", (event) => {
      event.preventDefault();
      this.saveSettings();
    });
    this.elements.securityForm.addEventListener("submit", (event) => {
      event.preventDefault();
      this.showToast("Token changes are stored locally in the browser.", "info");
    });
    this.elements.refreshRecordingsBtn.addEventListener("click", () => this.loadRecordings());
    this.elements.dateFilter.addEventListener("change", () => this.loadRecordings(this.elements.dateFilter.value));
    this.elements.deleteAllBtn.addEventListener("click", () => this.deleteAllSnapshots());
    this.elements.resetSettingsBtn.addEventListener("click", () => this.resetSettings());
    this.elements.generateTokenBtn.addEventListener("click", () => this.generateNewToken());
  }

  getAuthHeaders() {
    const authToken = localStorage.getItem("authToken") || this.elements.authToken.value;
    return authToken ? { Authorization: `Bearer ${authToken}` } : {};
  }

  startStream() {
    if (this.streamActive) {
      return;
    }

    this.streamActive = true;
    this.elements.startStreamBtn.innerHTML = '<i class="fas fa-stop mr-2"></i>Stop Stream';
    this.updateLiveFeed();
    this.streamInterval = setInterval(() => this.updateLiveFeed(), 3000);
    this.showToast("Live stream started");
  }

  stopStream() {
    if (!this.streamActive) {
      return;
    }

    this.streamActive = false;
    clearInterval(this.streamInterval);
    this.streamInterval = null;
    this.elements.startStreamBtn.innerHTML = '<i class="fas fa-play mr-2"></i>Start Stream';
    this.showToast("Live stream stopped", "info");
  }

  async updateLiveFeed() {
    try {
      const imageUrl = `${this.apiBaseUrl}/latest?t=${Date.now()}`;
      this.elements.liveFeed.src = imageUrl;
      this.elements.feedTimestamp.textContent = new Date().toLocaleString();
      this.elements.feedResolution.textContent = document.getElementById("resolution").value.toUpperCase();
      await this.checkCameraStatus();
    } catch (error) {
      console.error("Error updating live feed:", error);
      this.showToast("Failed to update the live feed", "error");
    }
  }

  async takeSnapshot() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/snapshot`, {
        method: "POST",
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error("Snapshot request failed");
      }

      this.showToast("Snapshot created successfully");
      await this.loadRecordings(this.elements.dateFilter.value);
      await this.updateLiveFeed();
    } catch (error) {
      console.error("Error taking snapshot:", error);
      this.showToast("Failed to create a snapshot", "error");
    }
  }

  async loadRecordings(dateFilter = "") {
    this.elements.recordingsGrid.innerHTML = `
      <div class="col-span-full text-center py-8">
        <i class="fas fa-spinner fa-spin fa-2x mb-2 text-slate-400"></i>
        <p class="text-slate-500">Loading snapshots...</p>
      </div>
    `;

    try {
      const response = await fetch(`${this.apiBaseUrl}/list?limit=100`);
      const data = await response.json();
      const images = Array.isArray(data.images) ? data.images : [];
      const filteredImages = dateFilter
        ? images.filter((image) => new Date(image.timestamp * 1000).toISOString().slice(0, 10) === dateFilter)
        : images;

      if (!filteredImages.length) {
        this.elements.recordingsGrid.innerHTML = `
          <div class="col-span-full text-center py-8 text-slate-400">
            <i class="fas fa-camera-slash fa-2x mb-2"></i>
            <p>No snapshots found</p>
          </div>
        `;
        return;
      }

      this.renderRecordings(filteredImages);
    } catch (error) {
      console.error("Error loading recordings:", error);
      this.showToast("Failed to load snapshots", "error");
    }
  }

  renderRecordings(images) {
    this.elements.recordingsGrid.innerHTML = images
      .map(
        (image) => `
          <div class="snapshot-thumb" data-id="${image.filename}">
            <img
              src="${this.apiBaseUrl}/download/${encodeURIComponent(image.filename)}"
              class="w-full h-40 object-cover rounded-lg"
              alt="${image.filename}"
            >
            <div class="text-xs mt-1 truncate">
              ${new Date(image.timestamp * 1000).toLocaleString()}
            </div>
          </div>
        `
      )
      .join("");

    this.elements.recordingsGrid.querySelectorAll(".snapshot-thumb").forEach((thumb, index) => {
      thumb.addEventListener("click", () => {
        const image = images[index];
        this.openSnapshotModal(image.filename, image.timestamp);
      });
    });
  }

  openSnapshotModal(filename, timestamp) {
    const modal = document.getElementById("snapshotModal");
    const modalImg = document.getElementById("modalSnapshot");
    const modalTimestamp = document.getElementById("modalTimestamp");

    modalImg.src = `${this.apiBaseUrl}/download/${encodeURIComponent(filename)}`;
    modalTimestamp.textContent = new Date(timestamp * 1000).toLocaleString();
    document.getElementById("deleteSnapshotBtn").onclick = () => this.deleteSnapshot(filename);
    document.getElementById("downloadSnapshotBtn").onclick = () => this.downloadSnapshot(filename);
    modal.classList.remove("hidden");
    modal.style.display = "block";
  }

  closeModal() {
    const modal = document.getElementById("snapshotModal");
    modal.classList.add("hidden");
    modal.style.display = "none";
  }

  async deleteSnapshot(filename) {
    if (!window.confirm("Delete this snapshot?")) {
      return;
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/delete/${encodeURIComponent(filename)}`, {
        method: "DELETE",
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error("Delete request failed");
      }

      this.closeModal();
      this.showToast("Snapshot deleted");
      await this.loadRecordings(this.elements.dateFilter.value);
      await this.checkCameraStatus();
    } catch (error) {
      console.error("Error deleting snapshot:", error);
      this.showToast("Failed to delete snapshot", "error");
    }
  }

  async deleteAllSnapshots() {
    if (!window.confirm("Delete all stored snapshots?")) {
      return;
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/delete`, {
        method: "DELETE",
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error("Bulk delete request failed");
      }

      this.showToast("All snapshots deleted");
      await this.loadRecordings(this.elements.dateFilter.value);
      await this.checkCameraStatus();
    } catch (error) {
      console.error("Error deleting all snapshots:", error);
      this.showToast("Failed to delete snapshots", "error");
    }
  }

  downloadSnapshot(filename) {
    const link = document.createElement("a");
    link.href = `${this.apiBaseUrl}/download/${encodeURIComponent(filename)}`;
    link.download = filename;
    link.click();
  }

  async checkCameraStatus() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/status`);
      if (!response.ok) {
        throw new Error("Status request failed");
      }

      const data = await response.json();
      document.getElementById("espStatus").textContent = data.connected ? "Connected" : "Disconnected";
      document.getElementById("wifiStrength").textContent = data.wifiStrength ?? "--";
      this.elements.storageStatus.textContent = `${data.storedImages}/${data.maxImages}`;
      return data.connected;
    } catch (error) {
      console.error("Error checking camera status:", error);
      document.getElementById("espStatus").textContent = "Error";
      this.elements.storageStatus.textContent = "--";
      return false;
    }
  }

  async loadSettings() {
    const localSettings = JSON.parse(localStorage.getItem("cameraSettings") || "null");
    try {
      const response = await fetch(`${this.apiBaseUrl}/settings`);
      const serverSettings = response.ok ? await response.json() : null;
      const settings = serverSettings || localSettings || {
        captureInterval: 10,
        imageQuality: 20,
        resolution: "vga",
        nightMode: false
      };
      this.applySettings(settings);
    } catch (error) {
      console.error("Error loading settings:", error);
      this.applySettings(localSettings || {
        captureInterval: 10,
        imageQuality: 20,
        resolution: "vga",
        nightMode: false
      });
    }

    this.elements.authToken.value = localStorage.getItem("authToken") || "";
  }

  applySettings(settings) {
    document.getElementById("captureInterval").value = settings.captureInterval;
    document.getElementById("imageQuality").value = settings.imageQuality;
    document.getElementById("resolution").value = settings.resolution;
    document.getElementById("nightMode").checked = settings.nightMode;
  }

  async saveSettings() {
    const settings = {
      captureInterval: Number.parseInt(document.getElementById("captureInterval").value, 10),
      imageQuality: Number.parseInt(document.getElementById("imageQuality").value, 10),
      resolution: document.getElementById("resolution").value,
      nightMode: document.getElementById("nightMode").checked
    };

    try {
      const response = await fetch(`${this.apiBaseUrl}/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.getAuthHeaders()
        },
        body: JSON.stringify(settings)
      });

      if (!response.ok) {
        throw new Error("Settings request failed");
      }

      localStorage.setItem("cameraSettings", JSON.stringify(settings));
      this.showToast("Settings saved");

      if (this.streamActive) {
        await this.updateLiveFeed();
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      this.showToast("Failed to save settings", "error");
    }
  }

  resetSettings() {
    const defaults = {
      captureInterval: 10,
      imageQuality: 20,
      resolution: "vga",
      nightMode: false
    };
    this.applySettings(defaults);
    this.showToast("Settings reset locally", "info");
  }

  generateNewToken() {
    const newToken = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    this.elements.authToken.value = newToken;
    localStorage.setItem("authToken", newToken);
    this.showToast("New token stored locally");
  }

  openFullscreen() {
    if (!this.elements.liveFeed.requestFullscreen) {
      return;
    }
    this.elements.liveFeed.requestFullscreen().catch((error) => {
      console.error("Error opening fullscreen:", error);
      this.showToast("Fullscreen is unavailable", "error");
    });
  }

  showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast ${type === "error" ? "error" : ""}`;
    toast.textContent = message;
    document.getElementById("toastContainer").appendChild(toast);
    window.setTimeout(() => toast.remove(), 4000);
  }
}

window.CameraController = CameraController;
