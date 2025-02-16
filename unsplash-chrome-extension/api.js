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
    const resultDiv = document.querySelector(".result");

    // Restore last used dimensions
    if (result.lastWidth) width.value = result.lastWidth;
    if (result.lastHeight) height.value = result.lastHeight;

    // Add spinner HTML
    const spinner = document.createElement("div");
    spinner.className = "spinner";
    spinner.style.display = "none";
    resultDiv.parentNode.insertBefore(spinner, resultDiv);

    // Display last search results if they exist
    if (result.lastSearchResults && result.lastQuery) {
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

    // Add click event listener to the result div once
    resultDiv.addEventListener("click", (e) => {
      if (e.target.tagName === "IMG") {
        e.preventDefault();
        chrome.tabs.create({ url: e.target.dataset.downloadUrl });
      }
    });

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
            chrome.storage.local.get(["lastSearchResults"], function (result) {
              const allResults = [...result.lastSearchResults, ...data.results];
              // Update storage with all results
              chrome.storage.local.set({
                lastSearchResults: allResults,
              });
              displayImages(allResults);
            });
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
      currentPage = 1;
      // Store dimensions when searching
      chrome.storage.local.set({
        lastWidth: width.value,
        lastHeight: height.value,
      });
      await fetchImages(currentPage);
    });
  }
);
