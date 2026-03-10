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
  resultsDiv.innerHTML = `<div class="loading">Searching for "${word}"...</div>`;

  try {
    const data = await browser.runtime.sendMessage({ action: "lookup", word: word });

    if (!data) throw new Error("Word not found");

    let html = `<div class="word">${data.word}</div>`;
    if (data.phonetic) html += `<div class="phonetic">${data.phonetic}</div>`;

    data.meanings.forEach(meaning => {
      html += `<div class="definition">
        <span class="part-of-speech">${meaning.partOfSpeech}:</span>
        <div>${meaning.definitions[0].definition}</div>
      </div>`;
    });

    resultsDiv.innerHTML = html;
  } catch (err) {
    resultsDiv.innerHTML = `<div class="error">Sorry, we couldn't find a definition for "${word}".</div>`;
  }
}
