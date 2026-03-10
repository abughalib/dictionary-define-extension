// Removed escapeHTML as we'll use safe DOM methods instead

const searchBox = document.getElementById("search-box");
const resultsDiv = document.getElementById("results");

const urlParams = new URLSearchParams(window.location.search);
const initialWord = urlParams.get("word");

if (initialWord) {
  searchBox.value = initialWord;
  fetchDefinition(initialWord);
}

searchBox.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    fetchDefinition(searchBox.value.trim());
  }
});

async function fetchDefinition(word) {
  if (!word) return;
  resultsDiv.innerHTML = "";
  let loadingDiv = document.createElement("div");
  loadingDiv.className = "loading";
  loadingDiv.textContent = `Searching for "${word}"...`;
  resultsDiv.appendChild(loadingDiv);

  try {
    const data = await browser.runtime.sendMessage({ action: "lookup", word: word });

    if (!data) throw new Error("Word not found");
    
    resultsDiv.innerHTML = "";

    let wordDiv = document.createElement("div");
    wordDiv.className = "word";
    wordDiv.textContent = data.word;
    resultsDiv.appendChild(wordDiv);

    if (data.phonetic) {
      let phoneticDiv = document.createElement("div");
      phoneticDiv.className = "phonetic";
      phoneticDiv.textContent = data.phonetic;
      resultsDiv.appendChild(phoneticDiv);
    }

    data.meanings.forEach(meaning => {
      let defDiv = document.createElement("div");
      defDiv.className = "definition";

      let posSpan = document.createElement("span");
      posSpan.className = "part-of-speech";
      posSpan.textContent = meaning.partOfSpeech + ":";
      defDiv.appendChild(posSpan);

      let textDiv = document.createElement("div");
      textDiv.textContent = meaning.definitions[0].definition;
      defDiv.appendChild(textDiv);

      resultsDiv.appendChild(defDiv);
    });

  } catch (err) {
    resultsDiv.innerHTML = "";
    let errDiv = document.createElement("div");
    errDiv.className = "error";
    errDiv.textContent = `Sorry, we couldn't find a definition for "${word}".`;
    resultsDiv.appendChild(errDiv);
  }
}
