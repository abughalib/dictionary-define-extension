function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

browser.runtime.onMessage.addListener((message) => {
  if (message.action === "showDefinition") {
    displayDefinition(message.word);
  } else if (message.action === "defineCurrentSelection") {
    const word = window.getSelection().toString().trim();
    if (word) {
      displayDefinition(word);
    }
  }
});

async function displayDefinition(word) {
  const selection = window.getSelection();
  let rect = { top: 20, left: 20, bottom: 20, right: 20, width: 0, height: 0 };

  if (selection.rangeCount > 0) {
    rect = selection.getRangeAt(0).getBoundingClientRect();
  }

  let overlay = document.getElementById("dictionary-define-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "dictionary-define-overlay";
    const shadow = overlay.attachShadow({ mode: "open" });
    document.body.appendChild(overlay);

    const style = document.createElement("style");
    style.textContent = `
      #overlay-container {
        position: fixed;
        width: 350px;
        max-height: 400px;
        background: #fff;
        color: #333;
        border: 1px solid #ccc;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transition: opacity 0.2s;
      }
      header {
        background: #f4f4f4;
        padding: 3px;
        border-bottom: 1px solid #eee;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.9em;
      }
      #close-btn {
        cursor: pointer;
        font-weight: bold;
        background: none;
        border: none;
        font-size: 16px;
        padding: 0 4px;
      }
      .content {
        padding: 3px;
        overflow-y: auto;
      }
      .word {
        font-size: 1.2em;
        font-weight: bold;
        margin-bottom: 4px;
        color: #000;
      }
      .phonetic {
        color: #666;
        font-style: italic;
        margin-bottom: 8px;
      }
      .definition {
        margin-bottom: 6px;
      }
      .part-of-speech {
        font-weight: bold;
        text-transform: capitalize;
        font-size: 0.85em;
        color: #555;
        margin-right: 4px;
      }
      .definition-text {
        display: inline;
        white-space: pre-wrap;
      }
      .loading { font-style: italic; color: #888; }
      .source { font-size: 0.7em; color: #aaa; text-align: right; margin-top: 8px; border-top: 1px solid #eee; padding-top: 4px; }
      .error { color: #d32f2f; }
    `;
    shadow.appendChild(style);

    const container = document.createElement("div");
    container.id = "overlay-container";
    container.innerHTML = `
      <header>
        <span>Dictionary Define</span>
        <button id="close-btn">&times;</button>
      </header>
      <div id="results" class="content">
        <div class="loading">Searching...</div>
      </div>
    `;
    shadow.appendChild(container);

    const closeOverlay = () => {
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
      document.removeEventListener("mousedown", outsideClickListener);
    };

    container.querySelector("#close-btn").addEventListener("click", closeOverlay);

    function outsideClickListener(event) {
      if (!overlay.contains(event.target)) {
        closeOverlay();
      }
    }

    setTimeout(() => {
      document.addEventListener("mousedown", outsideClickListener);
    }, 10);
  }

  const container = overlay.shadowRoot.getElementById("overlay-container");

  // Positioning Logic
  const PADDING = 10;
  const modalWidth = 350;
  const modalHeight = 250; // Reduced expected height for better positioning

  // 1. Try Top (Priority)
  let top = rect.top - modalHeight - PADDING;
  let left = rect.left;

  // 2. If no room at top, try Bottom
  if (top < PADDING) {
    top = rect.bottom + PADDING;
  }

  // Horizontal Collision
  if (left + modalWidth > window.innerWidth) {
    left = window.innerWidth - modalWidth - PADDING;
  }
  if (left < PADDING) left = PADDING;

  // Final Safety Check
  if (top + modalHeight > window.innerHeight) {
    top = window.innerHeight - modalHeight - PADDING;
  }
  if (top < PADDING) top = PADDING;

  container.style.top = top + "px";
  container.style.left = left + "px";

  const resultsDiv = overlay.shadowRoot.getElementById("results");
  const safeWord = escapeHTML(word);
  resultsDiv.innerHTML = `<div class="loading">Searching for "${safeWord}"...</div>`;

  try {
    const data = await browser.runtime.sendMessage({ action: "lookup", word: word });

    if (!data) throw new Error("Word not found");

    let html = `<div class="word">${escapeHTML(data.word)}</div>`;
    if (data.phonetic) html += `<div class="phonetic">${escapeHTML(data.phonetic)}</div>`;

    data.meanings.forEach(meaning => {
      html += `<div class="definition">
        <span class="part-of-speech">${escapeHTML(meaning.partOfSpeech)}:</span>
        <span class="definition-text">${escapeHTML(meaning.definitions[0].definition.trim())}</span>
      </div>`;
    });

    const sourceLabel = data.source === "offline" ? "Offline dictionary" : "Free Dictionary API";
    html += `<div class="source">Source: ${escapeHTML(sourceLabel)}</div>`;

    resultsDiv.innerHTML = html;
  } catch (err) {
    resultsDiv.innerHTML = `<div class="error">Sorry, we couldn't find a definition for "${safeWord}".</div>`;
  }
}
