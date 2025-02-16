document.addEventListener("DOMContentLoaded", () => {
  const startButton = document.getElementById("start-capture");
  const stopButton = document.getElementById("stop-capture");

  // Check the current status when popup opens
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(
      tabs[0].id,
      { action: "checkStatus" },
      (response) => {
        if (response && response.isCapturing) {
          startButton.disabled = true;
          stopButton.disabled = false;
        } else {
          startButton.disabled = false;
          stopButton.disabled = true;
        }
      }
    );
  });

  startButton.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "startCapture" });
      startButton.disabled = true;
      stopButton.disabled = false;
    });
  });

  stopButton.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "stopCapture" });
      startButton.disabled = false;
      stopButton.disabled = true;
    });
  });
});

// Add message listener to handle button state updates
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateButtons") {
    const startButton = document.getElementById("start-capture");
    const stopButton = document.getElementById("stop-capture");

    if (startButton && stopButton) {
      startButton.disabled = request.isCapturing;
      stopButton.disabled = !request.isCapturing;
    }
  }
});
