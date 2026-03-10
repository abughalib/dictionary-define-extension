let db = null;
let SQL = null;
let isInitializing = false;

// Initialize when extension loads
initSQL();

async function initSQL() {
  if (isInitializing) return;
  isInitializing = true;

  try {
    // @ts-ignore
    if (typeof initSqlJs === 'undefined') {
      console.error("initSqlJs is not defined. Make sure sql-wasm.js is loaded first in manifest.json.");
      isInitializing = false;
      return;
    }

    const config = {
      // Use local file path for WASM
      locateFile: file => {
        if (file.endsWith(".wasm")) {
          return browser.runtime.getURL("sql-wasm.wasm");
        }
        return file;
      }
    };

    // @ts-ignore
    SQL = await initSqlJs(config);
    console.log("SQL.js initialized successfully from local library");
    await loadDB();
  } catch (err) {
    console.error("SQL initialization error:", err);
  } finally {
    isInitializing = false;
  }
}

async function loadDB() {
  try {
    const data = await browser.storage.local.get("offlineDB");
    if (data.offlineDB && SQL) {
      const uint8Array = new Uint8Array(data.offlineDB);
      db = new SQL.Database(uint8Array);
      console.log("Database loaded into memory");
    } else {
      db = null;
      console.log("No offline database found, cleared from memory.");
    }
  } catch (e) {
    console.error("Failed to load database from storage:", e);
  }
}

browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    browser.runtime.openOptionsPage();
  }
  const menuOptions = {
    id: "define-word",
    title: "Define '%s'",
    contexts: ["selection"]
  };

  try {
    browser.contextMenus.create({
      ...menuOptions,
      icons: {
        "48": "icons/icon-48.png"
      }
    });
  } catch (e) {
    browser.contextMenus.create(menuOptions);
  }
});

browser.runtime.onMessage.addListener((message, _) => {
  if (message.action === "lookup") {
    return performLookup(message.word);
  }
  if (message.action === "reloadDB") {
    return loadDB().then(() => ({ success: true }));
  }
});

async function performLookup(word) {
  word = word.trim();
  // If the selection has more than 1 word, do not check definitions
  if (!word || word.split(/\s+/).length > 1) {
    return null;
  }

  // If SQL or db is not ready, try one quick init
  if (!SQL || (!db && (await browser.storage.local.get("isDownloaded")).isDownloaded)) {
    await initSQL();
  }

  let result = null;

  // 1. Try SQLite Database
  if (db) {
    try {
      // Your schema uses 'dictionary' table with 'word' and 'data' (JSON string)
      const stmt = db.prepare("SELECT data FROM dictionary WHERE word = ? LIMIT 1");
      stmt.bind([word.toLowerCase()]);
      if (stmt.step()) {
        const row = stmt.getAsObject();
        // Parse the JSON string from the 'data' column
        const jsonData = JSON.parse(row.data);

        result = {
          word: jsonData.word || word,
          phonetic: jsonData.phonetic || "",
          source: "offline",
          meanings: jsonData.meanings.map(m => ({
            partOfSpeech: m.partOfSpeech || "noun",
            definitions: m.definitions
          }))
        };
      }
      stmt.free();
    } catch (e) {
      console.error("SQLite lookup error:", e);
    }
  }

  // 2. Try Online Fallback if enabled and not found in SQLite
  const settings = await browser.storage.local.get(["onlineFallback", "apiCache"]);
  if (!result && settings.onlineFallback !== false) {
    // Check our online API cache first
    let apiCache = settings.apiCache || {};
    if (apiCache[word.toLowerCase()]) {
      result = apiCache[word.toLowerCase()];
    } else {
      try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        if (response.ok) {
          const apiData = await response.json();
          result = apiData[0];
          // Save the successful response to our cache
          apiCache[word.toLowerCase()] = result;
          await browser.storage.local.set({ apiCache });
        }
      } catch (e) {
        console.warn("Online lookup failed", e);
      }
    }
  }

  return result;
}

browser.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "define-word") {
    const word = info.selectionText.trim();
    browser.tabs.sendMessage(tab.id, {
      action: "showDefinition",
      word: word
    }).catch(() => openFallback(word));
  }
});

if (browser.commands) {
  browser.commands.onCommand.addListener((command) => {
    if (command === "define-selection") {
      browser.storage.local.get("enableShortcut").then((data) => {
        if (data.enableShortcut !== false) {
          browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
            if (tabs.length > 0) {
              browser.tabs.sendMessage(tabs[0].id, {
                action: "defineCurrentSelection"
              }).catch(() => openFallback(""));
            }
          });
        }
      });
    }
  });
}

function openFallback(word = "") {
  browser.windows.create({
    url: "fallback.html?word=" + encodeURIComponent(word),
    type: "popup",
    width: 400,
    height: 400
  });
}
