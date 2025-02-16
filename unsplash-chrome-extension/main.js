const apiScreen = document.querySelector(".api-input");
const searchScreen = document.querySelector(".query-input");

// Check if chrome storage has an API key
chrome.storage.local.get(["unsplash-api-key"], function(result) {
    if (!result["unsplash-api-key"]) {
        apiScreen.style.display = "block";
        searchScreen.style.display = "none";
    } else {
        apiScreen.style.display = "none";
        searchScreen.style.display = "block";
    }
});


document.getElementById("api-key-submit").addEventListener("click", () => {
    const apiKey = document.getElementById("api-key-input").value;
    if (apiKey.length < 10) {
        alert("Invalid API key");
        return;
    }
    chrome.storage.local.set({ "unsplash-api-key": apiKey }, () => {
        alert("Access Key saved");
    });
});