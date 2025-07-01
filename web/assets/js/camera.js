// Camera Control Module
class CameraController {
  constructor() {
    this.streamInterval = null;
    this.streamActive = false;
    this.apiBaseUrl = '/api/camera';
    this.initElements();
    this.bindEvents();
    this.loadSettings();
  }

  initElements() {
    this.elements = {
      liveFeed: document.getElementById('liveFeed'),
      feedTimestamp: document.getElementById('feedTimestamp'),
      startStreamBtn: document.getElementById('startStreamBtn'),
      snapshotBtn: document.getElementById('snapshotBtn'),
      recordingsGrid: document.getElementById('recordingsGrid'),
      authToken: document.getElementById('authToken'),
      settingsForm: document.getElementById('cameraSettingsForm')
    };
  }

  bindEvents() {
    // Stream control
    this.elements.startStreamBtn.addEventListener('click', () => 
      this.streamActive ? this.stopStream() : this.startStream());
    
    // Snapshot button
    this.elements.snapshotBtn.addEventListener('click', () => this.takeSnapshot());
    
    // Settings form
    this.elements.settingsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveSettings();
    });
    
    // Refresh recordings
    document.getElementById('refreshRecordingsBtn').addEventListener('click', () => 
      this.loadRecordings());
    
    // Generate new token
    document.getElementById('generateTokenBtn').addEventListener('click', () => 
      this.generateNewToken());
  }

  startStream() {
    if (this.streamActive) return;
    
    this.streamActive = true;
    this.elements.startStreamBtn.innerHTML = '<i class="fas fa-stop mr-2"></i>Stop Stream';
    this.updateLiveFeed();
    
    // Update every 3 seconds
    this.streamInterval = setInterval(() => this.updateLiveFeed(), 3000);
    
    this.showToast('Live stream started', 'success');
  }

  stopStream() {
    if (!this.streamActive) return;
    
    this.streamActive = false;
    clearInterval(this.streamInterval);
    this.elements.startStreamBtn.innerHTML = '<i class="fas fa-play mr-2"></i>Start Stream';
    
    this.showToast('Live stream stopped', 'info');
  }

  async updateLiveFeed() {
    try {
      const timestamp = new Date().toLocaleString();
      this.elements.feedTimestamp.textContent = timestamp;
      
      // Add cache busting parameter
      const url = `${this.apiBaseUrl}/latest?t=${Date.now()}`;
      this.elements.liveFeed.src = url;
      
      // Update status
      await this.checkCameraStatus();
    } catch (error) {
      console.error('Error updating live feed:', error);
      this.showToast('Failed to update live feed', 'error');
    }
  }

  async takeSnapshot() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/snapshot`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.ok) {
        this.showToast('Snapshot captured successfully', 'success');
        this.loadRecordings(); // Refresh the recordings list
      } else {
        throw new Error('Failed to capture snapshot');
      }
    } catch (error) {
      console.error('Error taking snapshot:', error);
      this.showToast('Failed to capture snapshot', 'error');
    }
  }

  async loadRecordings(dateFilter = null) {
    try {
      this.elements.recordingsGrid.innerHTML = `
        <div class="col-span-full text-center py-8">
          <i class="fas fa-spinner fa-spin fa-2x mb-2 text-slate-400"></i>
          <p class="text-slate-500">Loading snapshots...</p>
        </div>
      `;
      
      let url = `${this.apiBaseUrl}/list?limit=100`;
      if (dateFilter) {
        url += `&date=${dateFilter}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.images && data.images.length > 0) {
        this.renderRecordings(data.images);
      } else {
        this.elements.recordingsGrid.innerHTML = `
          <div class="col-span-full text-center py-8 text-slate-400">
            <i class="fas fa-camera-slash fa-2x mb-2"></i>
            <p>No snapshots found</p>
          </div>
        `;
      }
    } catch (error) {
      console.error('Error loading recordings:', error);
      this.showToast('Failed to load recordings', 'error');
    }
  }

  renderRecordings(images) {
    this.elements.recordingsGrid.innerHTML = images.map(image => `
      <div class="snapshot-thumb" data-id="${image.filename}">
        <img src="${this.apiBaseUrl}/download/${encodeURIComponent(image.filename)}" 
             class="w-full h-40 object-cover rounded-lg"
             onclick="cameraController.openSnapshotModal('${image.filename}', ${image.timestamp})">
        <div class="text-xs mt-1 truncate">
          ${new Date(image.timestamp * 1000).toLocaleString()}
        </div>
      </div>
    `).join('');
  }

  openSnapshotModal(filename, timestamp) {
    const modal = document.getElementById('snapshotModal');
    const modalImg = document.getElementById('modalSnapshot');
    const modalTimestamp = document.getElementById('modalTimestamp');
    
    modalImg.src = `${this.apiBaseUrl}/download/${encodeURIComponent(filename)}`;
    modalTimestamp.textContent = new Date(timestamp * 1000).toLocaleString();
    
    // Set up delete button
    document.getElementById('deleteSnapshotBtn').onclick = () => {
      this.deleteSnapshot(filename);
    };
    
    // Set up download button
    document.getElementById('downloadSnapshotBtn').onclick = () => {
      this.downloadSnapshot(filename);
    };
    
    modal.style.display = 'block';
  }

  async deleteSnapshot(filename) {
    if (!confirm('Are you sure you want to delete this snapshot?')) return;
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/delete/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.ok) {
        this.showToast('Snapshot deleted', 'success');
        this.closeModal();
        this.loadRecordings();
      } else {
        throw new Error('Failed to delete snapshot');
      }
    } catch (error) {
      console.error('Error deleting snapshot:', error);
      this.showToast('Failed to delete snapshot', 'error');
    }
  }

  downloadSnapshot(filename) {
    const link = document.createElement('a');
    link.href = `${this.apiBaseUrl}/download/${encodeURIComponent(filename)}`;
    link.download = filename;
    link.click();
    this.showToast('Download started', 'success');
  }

  async checkCameraStatus() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/status`);
      const data = await response.json();
      
      // Update status indicators
      document.getElementById('espStatus').textContent = data.connected ? 'Connected' : 'Disconnected';
      document.getElementById('wifiStrength').textContent = data.wifiStrength ? `${data.wifiStrength}%` : '--';
      
      return data.connected;
    } catch (error) {
      console.error('Error checking camera status:', error);
      document.getElementById('espStatus').textContent = 'Error';
      return false;
    }
  }

  loadSettings() {
    // Load from localStorage or server
    const settings = JSON.parse(localStorage.getItem('cameraSettings')) || {
      captureInterval: 10,
      imageQuality: 20,
      resolution: 'vga',
      nightMode: false
    };
    
    document.getElementById('captureInterval').value = settings.captureInterval;
    document.getElementById('imageQuality').value = settings.imageQuality;
    document.getElementById('resolution').value = settings.resolution;
    document.getElementById('nightMode').checked = settings.nightMode;
    
    // Load auth token
    this.elements.authToken.value = localStorage.getItem('authToken') || 'default_token';
  }

  async saveSettings() {
    const settings = {
      captureInterval: parseInt(document.getElementById('captureInterval').value),
      imageQuality: parseInt(document.getElementById('imageQuality').value),
      resolution: document.getElementById('resolution').value,
      nightMode: document.getElementById('nightMode').checked
    };
    
    try {
      // Save to server
      const response = await fetch(`${this.apiBaseUrl}/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(settings)
      });
      
      if (response.ok) {
        // Save to localStorage
        localStorage.setItem('cameraSettings', JSON.stringify(settings));
        this.showToast('Settings saved successfully', 'success');
        
        // Apply settings to live view if active
        if (this.streamActive) {
          this.stopStream();
          this.startStream();
        }
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showToast('Failed to save settings', 'error');
    }
  }

  generateNewToken() {
    const newToken = Math.random().toString(36).substring(2, 15) + 
                     Math.random().toString(36).substring(2, 15);
    this.elements.authToken.value = newToken;
    localStorage.setItem('authToken', newToken);
    this.showToast('New token generated', 'success');
  }

  showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'error' : ''}`;
    toast.textContent = message;
    
    const container = document.getElementById('toastContainer');
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 4000);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.cameraController = new CameraController();
});