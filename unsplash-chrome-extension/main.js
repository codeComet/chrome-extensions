const apiScreen = document.querySelector(".api-input");
const searchScreen = document.querySelector(".query-input");
const unsplashForm = document.querySelector(".for-unsplash");
const pexelsForm = document.querySelector(".for-pexels");
const resultDiv = document.querySelector(".result");
const spinner = document.createElement("div");
const logout = document.getElementById('logout')

// Track if click handler has been attached
let clickHandlerAttached = false;

// Setup spinner (only create one)
spinner.className = "spinner";
spinner.style.display = "none";
resultDiv.parentNode.insertBefore(spinner, resultDiv);

// Add click event listener to the result div ONCE for the entire application
if (!clickHandlerAttached) {
  resultDiv.addEventListener("click", (e) => {
    if (e.target.tagName === "IMG") {
      e.stopPropagation();
      e.preventDefault();
      chrome.tabs.create({ url: e.target.dataset.downloadUrl });
    }
  });
  clickHandlerAttached = true;
}

// Function to load the appropriate API handler
function loadApiHandler(service) {
  // Clear previous results
  resultDiv.innerHTML = "";

  // Clear any "load more" buttons
  const existingLoadMore = document.querySelector(".load-more");
  if (existingLoadMore) {
    existingLoadMore.remove();
  }

  // Load the correct API handler based on selection
  if (service === "unsplash") {
    loadUnsplashApi();
  } else if (service === "pexels") {
    loadPexelsApi();
  }
}

// Initially hide Pexels form
pexelsForm.style.display = "none";
unsplashForm.style.display = "block";

// Add radio button event listeners
document.querySelectorAll('input[name="service"]').forEach((radio) => {
  radio.addEventListener("change", (e) => {
    const selectedService = e.target.value;
    chrome.storage.local.set({ "selected-api": selectedService });

    if (selectedService === "unsplash") {
      unsplashForm.style.display = "block";
      pexelsForm.style.display = "none";
    } else {
      unsplashForm.style.display = "none";
      pexelsForm.style.display = "block";
    }

    // Load the appropriate API handler when service changes
    loadApiHandler(selectedService);
  });
});

// Check stored API keys and active API
chrome.storage.local.get(
  ["unsplash-api-key", "pexels-api-key", "selected-api"],
  function (result) {
    if (!result["unsplash-api-key"] && !result["pexels-api-key"]) {
      apiScreen.style.display = "block";
      searchScreen.style.display = "none";
    } else {
      apiScreen.style.display = "none";
      searchScreen.style.display = "block";

      // Set radio button state based on stored preference
      const selectedApi =
        result["selected-api"] ||
        (result["unsplash-api-key"] ? "unsplash" : "pexels");
      document.getElementById(selectedApi).checked = true;

      // Show/hide appropriate form
      if (selectedApi === "unsplash") {
        unsplashForm.style.display = "block";
        pexelsForm.style.display = "none";
      } else {
        unsplashForm.style.display = "none";
        pexelsForm.style.display = "block";
      }

      // Load the appropriate API handler
      loadApiHandler(selectedApi);
    }
  }
);

// Handle Unsplash API key submission
document
  .getElementById("unsplash-api-submit")
  .addEventListener("click", (e) => {
    e.preventDefault();
    const apiKey = document.getElementById("unsplash-api-input").value.trim();
    if (apiKey.length < 10) {
      alert("Invalid API key");
      return;
    }
    chrome.storage.local.set(
      { "unsplash-api-key": apiKey, "selected-api": "unsplash" },
      () => {
        alert("Unsplash Access Key saved");
        apiScreen.style.display = "none";
        searchScreen.style.display = "block";
        loadApiHandler("unsplash");
      }
    );
  });

// Handle Pexels API key submission
document.getElementById("pexels-api-submit").addEventListener("click", (e) => {
  e.preventDefault();
  const apiKey = document.getElementById("pexels-api-input").value.trim();
  if (apiKey.length < 10) {
    alert("Invalid API key");
    return;
  }
  chrome.storage.local.set(
    { "pexels-api-key": apiKey, "selected-api": "pexels" },
    () => {
      alert("Pexels API Key saved");
      apiScreen.style.display = "none";
      searchScreen.style.display = "block";
      loadApiHandler("pexels");
    }
  );
});

// Unsplash API Handler
function loadUnsplashApi() {
  chrome.storage.local.get(
    [
      "unsplash-api-key",
      "lastSearchResults",
      "lastQuery",
      "lastWidth",
      "lastHeight",
    ],
    function (result) {
      const apiKey = result["unsplash-api-key"];
      const baseURL = "https://api.unsplash.com/";
      let currentPage = 1;
      let per_page = 9;

      const searchForm = document.querySelector(".query-input form");
      const searchInput = document.getElementById("query-key-input");
      const width = document.getElementById("width");
      const height = document.getElementById("height");

      // Restore last used dimensions
      if (result.lastWidth) width.value = result.lastWidth;
      if (result.lastHeight) height.value = result.lastHeight;

      // Display last search results if they exist
      if (
        result.lastSearchResults &&
        result.lastQuery &&
        document.querySelector("#unsplash").checked
      ) {
        displayImages(result.lastSearchResults);
        searchInput.value = result.lastQuery;
      }

      function displayImages(images) {
        resultDiv.innerHTML = "";
        images.forEach((image) => {
          let downloadUrl = image.urls.raw;

          // Remove existing w, h, fit, dpr, auto=format parameters
          downloadUrl = downloadUrl.replace(
            /[&?](w|h|fit|dpr|auto)=([^&]*)/g,
            ""
          );

          if (width.value && height.value) {
            downloadUrl += `${downloadUrl.includes("?") ? "&" : "?"}w=${
              width.value
            }&h=${height.value}&fit=max&auto=format`;
          } else if (width.value) {
            downloadUrl += `${downloadUrl.includes("?") ? "&" : "?"}w=${
              width.value
            }&fit=max&auto=format`;
          } else if (height.value) {
            downloadUrl += `${downloadUrl.includes("?") ? "&" : "?"}h=${
              height.value
            }&fit=max&auto=format`;
          } else {
            // Default to highest quality without resizing
            downloadUrl += `${
              downloadUrl.includes("?") ? "&" : "?"
            }q=100&auto=format`;
          }

          resultDiv.innerHTML += `
            <div class="image-item">
              <img src="${image.urls.thumb}" alt="${image.alt_description}" data-download-url="${downloadUrl}" style="cursor: pointer;" />
            </div>
          `;
        });

        // Add load more button for cached results
        let loadMoreBtn = document.querySelector(".load-more");
        if (!loadMoreBtn) {
          loadMoreBtn = document.createElement("button");
          loadMoreBtn.className = "load-more";
          loadMoreBtn.textContent = "Load More";
          resultDiv.after(loadMoreBtn);

          loadMoreBtn.addEventListener("click", () => {
            currentPage++;
            fetchImages(currentPage);
          });
        }
        loadMoreBtn.style.display = images.length < per_page ? "none" : "block";
      }

      async function fetchImages(page = 1) {
        spinner.style.display = "block";

        let parameters = "";
        parameters += `&page=${page}&per_page=${per_page}`;

        const searchURL = `${baseURL}search/photos/?query=${searchInput.value}${parameters}&client_id=${apiKey}`;

        try {
          const response = await fetch(searchURL);
          const data = await response.json();

          if (data.results && data.results.length > 0) {
            if (page === 1) {
              // Store the initial search results and query
              chrome.storage.local.set({
                lastSearchResults: data.results,
                lastQuery: searchInput.value,
              });
              displayImages(data.results);
            } else {
              // Get existing results and append new ones
              chrome.storage.local.get(
                ["lastSearchResults"],
                function (result) {
                  const allResults = [
                    ...result.lastSearchResults,
                    ...data.results,
                  ];
                  // Update storage with all results
                  chrome.storage.local.set({
                    lastSearchResults: allResults,
                  });
                  displayImages(allResults);
                }
              );
            }

            // Add or update load more button
            let loadMoreBtn = document.querySelector(".load-more");
            if (!loadMoreBtn) {
              loadMoreBtn = document.createElement("button");
              loadMoreBtn.className = "load-more";
              loadMoreBtn.textContent = "Load More";
              resultDiv.after(loadMoreBtn);

              loadMoreBtn.addEventListener("click", () => {
                currentPage++;
                fetchImages(currentPage);
              });
            }
            loadMoreBtn.style.display =
              data.results.length < per_page ? "none" : "block";
          } else if (page === 1) {
            resultDiv.innerHTML = "No images found.";
          }
        } catch (error) {
          resultDiv.innerHTML = "Error loading images.";
        } finally {
          spinner.style.display = "none";
        }
      }

      searchForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        // Only process if Unsplash is selected
        if (document.querySelector("#unsplash").checked) {
          currentPage = 1;
          // Store dimensions when searching
          chrome.storage.local.set({
            lastWidth: width.value,
            lastHeight: height.value,
          });
          await fetchImages(currentPage);
        }
      });
    }
  );
}

// Pexels API Handler
function loadPexelsApi() {
  chrome.storage.local.get(
    [
      "pexels-api-key",
      "lastSearchResults",
      "lastQuery",
      "lastWidth",
      "lastHeight",
    ],
    function (result) {
      const apiKey = result["pexels-api-key"];
      const baseURL = "https://api.pexels.com/v1";
      let currentPage = 1;
      let per_page = 9;

      const searchForm = document.querySelector(".query-input form");
      const searchInput = document.getElementById("query-key-input");
      const width = document.getElementById("width");
      const height = document.getElementById("height");

      // Restore last used dimensions
      if (result.lastWidth) width.value = result.lastWidth;
      if (result.lastHeight) height.value = result.lastHeight;

      // Display last search results if they exist
      if (
        result.lastSearchResults &&
        result.lastQuery &&
        document.querySelector("#pexels").checked
      ) {
        displayImages(result.lastSearchResults);
        searchInput.value = result.lastQuery;
      }

      async function fetchImages(page = 1) {
        spinner.style.display = "block";

        let parameters = "";
        parameters += `&page=${page}&per_page=${per_page}`;
        if (width.value) parameters += `&width=${width.value}`;
        if (height.value) parameters += `&height=${height.value}`;

        const searchURL = `${baseURL}/search?query=${searchInput.value}${parameters}`;

        try {
          const response = await fetch(searchURL, {
            headers: {
              Authorization: apiKey,
            },
          });
          const data = await response.json();

          if (data.photos && data.photos.length > 0) {
            if (page === 1) {
              // Store the initial search results and query
              chrome.storage.local.set({
                lastSearchResults: data.photos,
                lastQuery: searchInput.value,
              });
              displayImages(data.photos);
            } else {
              // Get existing results and append new ones
              chrome.storage.local.get(
                ["lastSearchResults"],
                function (result) {
                  const allResults = [
                    ...result.lastSearchResults,
                    ...data.photos,
                  ];
                  // Update storage with all results
                  chrome.storage.local.set({
                    lastSearchResults: allResults,
                  });
                  displayImages(allResults);
                }
              );
            }

            // Add or update load more button
            let loadMoreBtn = document.querySelector(".load-more");
            if (!loadMoreBtn) {
              loadMoreBtn = document.createElement("button");
              loadMoreBtn.className = "load-more";
              loadMoreBtn.textContent = "Load More";
              resultDiv.after(loadMoreBtn);

              loadMoreBtn.addEventListener("click", () => {
                currentPage++;
                fetchImages(currentPage);
              });
            }
            loadMoreBtn.style.display =
              data.photos.length < per_page ? "none" : "block";
          } else if (page === 1) {
            resultDiv.innerHTML = "No images found.";
          }
        } catch (error) {
          resultDiv.innerHTML = "Error loading images.";
        } finally {
          spinner.style.display = "none";
        }
      }

      function displayImages(images) {
        resultDiv.innerHTML = "";
        images.forEach((image) => {
          let downloadUrl = image.src.original;

          // Remove existing w, h parameters if they exist
          downloadUrl = downloadUrl.replace(/[?&]w=\d+/g, "");
          downloadUrl = downloadUrl.replace(/[?&]h=\d+/g, "");

          // Add new width and height if provided
          const separator = downloadUrl.includes("?") ? "&" : "?";
          if (width.value && height.value) {
            downloadUrl += `${separator}w=${width.value}&h=${height.value}`;
          } else if (width.value) {
            downloadUrl += `${separator}w=${width.value}`;
          } else if (height.value) {
            downloadUrl += `${separator}h=${height.value}`;
          }

          resultDiv.innerHTML += `
          <div class="image-item">
            <img src="${image.src.tiny}" alt="${image.alt}" data-download-url="${downloadUrl}" style="cursor: pointer;" />
          </div>
        `;
        });

        // Add load more button for cached results
        let loadMoreBtn = document.querySelector(".load-more");
        if (!loadMoreBtn) {
          loadMoreBtn = document.createElement("button");
          loadMoreBtn.className = "load-more";
          loadMoreBtn.textContent = "Load More";
          resultDiv.after(loadMoreBtn);

          loadMoreBtn.addEventListener("click", () => {
            currentPage++;
            fetchImages(currentPage);
          });
        }
        loadMoreBtn.style.display = images.length < per_page ? "none" : "block";
      }

      searchForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        // Only process if Pexels is selected
        if (document.querySelector("#pexels").checked) {
          currentPage = 1;
          // Store dimensions when searching
          chrome.storage.local.set({
            lastWidth: width.value,
            lastHeight: height.value,
          });
          await fetchImages(currentPage);
        }
      });
    }
  );
}

//Logout

logout.addEventListener('click', () => {
  chrome.storage.local.clear()
  location.reload()
})
