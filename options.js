document.addEventListener("DOMContentLoaded", async () => {
  const data = await browser.storage.local.get(["isDownloaded", "onlineFallback", "enableShortcut"]);
  const offlineStatus = document.getElementById("offline-status");
  const downloadBtn = document.getElementById("download-btn");
  const onlineFallback = document.getElementById("online-fallback");
  const removeBtn = document.getElementById("remove-btn");
  const enableShortcut = document.getElementById("enable-shortcut");
  const changeShortcutBtn = document.getElementById("change-shortcut-btn");
  const shortcutDisplay = document.getElementById("shortcut-display");

  if (data.isDownloaded) {
    offlineStatus.textContent = "Status: Downloaded and Ready";
    downloadBtn.textContent = "Update Dictionary";
    removeBtn.style.display = "inline-block";
  }

  onlineFallback.checked = (data.onlineFallback !== false); // Default to true
  enableShortcut.checked = (data.enableShortcut !== false); // Default to true

  downloadBtn.addEventListener("click", () => {
    startDownload();
  });

  removeBtn.addEventListener("click", async () => {
    if (confirm("Are you sure you want to remove the offline dictionary? This will free up storage space.")) {
      await browser.storage.local.remove(["isDownloaded", "offlineDB"]);
      offlineStatus.textContent = "Status: Not Downloaded";
      downloadBtn.textContent = "Download Offline Dictionary";
      removeBtn.style.display = "none";
      await browser.runtime.sendMessage({ action: "reloadDB" });
    }
  });

  onlineFallback.addEventListener("change", () => {
    browser.storage.local.set({ onlineFallback: onlineFallback.checked });
  });

  enableShortcut.addEventListener("change", () => {
    browser.storage.local.set({ enableShortcut: enableShortcut.checked });
  });

  changeShortcutBtn.addEventListener("click", () => {
    const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
    if (isFirefox) {
      alert("To change shortcuts in Firefox, gently navigate to 'about:addons', click the gear icon, and select 'Manage Extension Shortcuts'.");
    } else {
      browser.tabs.create({ url: "chrome://extensions/shortcuts" });
    }
  });

  if (browser.commands) {
    browser.commands.getAll().then((commands) => {
      for (let command of commands) {
        if (command.name === "define-selection") {
          shortcutDisplay.textContent = command.shortcut ? `Current: ${command.shortcut}` : "Not set";
          break;
        }
      }
    });
  }
});

async function startDownload() {
  const downloadBtn = document.getElementById("download-btn");
  const progressDiv = document.getElementById("download-progress");
  const progressBar = document.getElementById("progress-bar");
  const offlineStatus = document.getElementById("offline-status");

  // Your provided GCIDE Dictionary URL
  const DICTIONARY_URL = "https://github.com/abughalib/English-Definition-GCIDE/releases/download/v1.0.1/dictionary.db";

  downloadBtn.disabled = true;
  progressDiv.style.display = "block";
  progressBar.style.width = "10%";
  offlineStatus.textContent = "Status: Connecting...";

  try {
    const response = await fetch(DICTIONARY_URL);
    if (!response.ok) throw new Error("Failed to download dictionary file");

    progressBar.style.width = "50%";
    offlineStatus.textContent = "Status: Downloading Dictionary...";

    // Store as Uint8Array directly - much more efficient
    const buffer = await response.arrayBuffer();
    const uint8 = new Uint8Array(buffer);

    progressBar.style.width = "90%";
    offlineStatus.textContent = "Status: Saving to storage...";

    await browser.storage.local.set({
      isDownloaded: true,
      offlineDB: uint8
    });

    // Notify background script to load the new DB
    await browser.runtime.sendMessage({ action: "reloadDB" });

    progressBar.style.width = "100%";
    offlineStatus.textContent = "Status: Downloaded and Ready";
    downloadBtn.textContent = "Update Dictionary";
    document.getElementById("remove-btn").style.display = "inline-block";
    downloadBtn.disabled = false;
    setTimeout(() => { progressDiv.style.display = "none"; }, 2000);

  } catch (err) {
    console.error(err);
    offlineStatus.textContent = "Error: " + err.message;
    downloadBtn.disabled = false;
    progressBar.style.backgroundColor = "#dc3545";
  }
}
