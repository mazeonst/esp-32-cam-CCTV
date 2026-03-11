function applyInitialTheme() {
  const preferredTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  const savedTheme = localStorage.getItem("theme") || preferredTheme;
  document.documentElement.classList.toggle("dark", savedTheme === "dark");
}

function toggleTheme() {
  const isDark = document.documentElement.classList.toggle("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
}

function toggleMobileMenu() {
  const menu = document.getElementById("mobileMenu");
  menu.classList.toggle("hidden");
  menu.classList.toggle("active");
}

function setActiveTab(tabId) {
  document.querySelectorAll(".tab-content").forEach((content) => content.classList.remove("active"));
  document.querySelectorAll(".tab-btn[data-tab]").forEach((button) => button.classList.remove("active"));

  document.getElementById(`${tabId}Tab`).classList.add("active");
  document.querySelectorAll(`.tab-btn[data-tab="${tabId}"]`).forEach((button) => button.classList.add("active"));

  const menu = document.getElementById("mobileMenu");
  menu.classList.add("hidden");
  menu.classList.remove("active");

  if (tabId === "recordings") {
    window.cameraController.loadRecordings(document.getElementById("recordingsDateFilter").value);
  }

  if (tabId === "live" && !window.cameraController.streamActive) {
    window.cameraController.startStream();
  }
}

function initTabs() {
  document.querySelectorAll(".tab-btn[data-tab]").forEach((button) => {
    button.addEventListener("click", () => setActiveTab(button.dataset.tab));
  });
}

function initClock() {
  const clock = document.getElementById("clock");
  const renderClock = () => {
    clock.textContent = new Date().toLocaleString();
  };
  renderClock();
  window.setInterval(renderClock, 1000);
}

function initModal() {
  const modal = document.getElementById("snapshotModal");
  document.querySelector(".modal-close").addEventListener("click", () => window.cameraController.closeModal());
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      window.cameraController.closeModal();
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  applyInitialTheme();

  window.cameraController = new window.CameraController();
  await window.cameraController.loadSettings();
  await window.cameraController.loadRecordings();
  await window.cameraController.checkCameraStatus();
  window.cameraController.startStream();

  document.getElementById("themeToggle").addEventListener("click", toggleTheme);
  document.getElementById("mobileMenuBtn").addEventListener("click", toggleMobileMenu);
  document.getElementById("mobileLogoutBtn").addEventListener("click", () => {
    localStorage.removeItem("authToken");
    document.getElementById("authToken").value = "";
    window.cameraController.showToast("Local token cleared", "info");
  });

  initTabs();
  initClock();
  initModal();
});
