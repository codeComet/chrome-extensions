let isCapturing = false;
let selectionBox = null;
let isDragging = false;
let isResizing = false;
let activeHandle = null;
let startX, startY, startWidth, startHeight;

function createSelectionBox() {
  if (selectionBox) {
    selectionBox.style.display = "block";
    return;
  }

  selectionBox = document.createElement("div");
  selectionBox.className = "viewport-capture-box";
  selectionBox.style.width = "300px";
  selectionBox.style.height = "200px";
  selectionBox.style.left = "50%";
  selectionBox.style.top = "50%";
  selectionBox.style.transform = "translate(-50%, -50%)";
  selectionBox.style.border = "2px dashed #007bff";
  selectionBox.style.backgroundColor = "rgba(0, 123, 255, 0.1)";
  selectionBox.style.position = "fixed";
  selectionBox.style.cursor = "move";

  document.body.appendChild(selectionBox);
  addResizeHandles();
  addEventListeners();
}

function addResizeHandles() {
  const positions = [
    { pos: "nw", cursor: "nw-resize" },
    { pos: "n", cursor: "n-resize" },
    { pos: "ne", cursor: "ne-resize" },
    { pos: "e", cursor: "e-resize" },
    { pos: "se", cursor: "se-resize" },
    { pos: "s", cursor: "s-resize" },
    { pos: "sw", cursor: "sw-resize" },
    { pos: "w", cursor: "w-resize" },
  ];

  positions.forEach(({ pos, cursor }) => {
    const handle = document.createElement("div");
    handle.className = "viewport-capture-handle";
    handle.dataset.position = pos;
    handle.style.cursor = cursor;

    if (pos.includes("n")) handle.style.top = "-5px";
    if (pos.includes("s")) handle.style.bottom = "-5px";
    if (pos.includes("w")) handle.style.left = "-5px";
    if (pos.includes("e")) handle.style.right = "-5px";
    if (pos.length === 1) {
      if (pos === "n" || pos === "s") handle.style.left = "calc(50% - 5px)";
      if (pos === "e" || pos === "w") handle.style.top = "calc(50% - 5px)";
    }

    selectionBox.appendChild(handle);
  });
}

function addEventListeners() {
  selectionBox.addEventListener("mousedown", onMouseDown);
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
}

function onMouseDown(e) {
  if (!isCapturing) return;

  const handle = e.target.closest(".viewport-capture-handle");

  if (handle) {
    isResizing = true;
    activeHandle = handle.dataset.position;
    e.stopPropagation();
  } else if (e.target === selectionBox) {
    isDragging = true;
    selectionBox.classList.add("capturing");
  }

  startX = e.clientX;
  startY = e.clientY;
  startWidth = selectionBox.offsetWidth;
  startHeight = selectionBox.offsetHeight;

  e.stopPropagation();
}

function onMouseMove(e) {
  if (!isCapturing || (!isDragging && !isResizing)) return;

  if (isDragging) {
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    const newLeft = selectionBox.offsetLeft + dx;
    const newTop = selectionBox.offsetTop + dy;

    const maxX = window.innerWidth - selectionBox.offsetWidth;
    const maxY = window.innerHeight - selectionBox.offsetHeight;

    selectionBox.style.left = `${Math.max(0, Math.min(newLeft, maxX))}px`;
    selectionBox.style.top = `${Math.max(0, Math.min(newTop, maxY))}px`;

    startX = e.clientX;
    startY = e.clientY;
  } else if (isResizing) {
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    handleResize(dx, dy);
  }
}

function handleResize(dx, dy) {
  const pos = activeHandle;
  const box = selectionBox;
  let newWidth = startWidth;
  let newHeight = startHeight;
  let newX = box.offsetLeft;
  let newY = box.offsetTop;

  if (pos.includes("e")) {
    newWidth = Math.max(50, startWidth + dx);
  }
  if (pos.includes("w")) {
    const proposedWidth = Math.max(50, startWidth - dx);
    const widthDiff = proposedWidth - startWidth;
    newWidth = proposedWidth;
    newX = box.offsetLeft - widthDiff;
  }

  if (pos.includes("s")) {
    newHeight = Math.max(50, startHeight + dy);
  }
  if (pos.includes("n")) {
    const proposedHeight = Math.max(50, startHeight - dy);
    const heightDiff = proposedHeight - startHeight;
    newHeight = proposedHeight;
    newY = box.offsetTop - heightDiff;
  }

  const maxX = window.innerWidth;
  const maxY = window.innerHeight;

  newWidth = Math.min(newWidth, maxX - newX);
  newHeight = Math.min(newHeight, maxY - newY);

  box.style.width = `${newWidth}px`;
  box.style.height = `${newHeight}px`;
  box.style.left = `${Math.max(0, newX)}px`;
  box.style.top = `${Math.max(0, newY)}px`;
}

function onMouseUp() {
  if (!isCapturing) return;
  isDragging = false;
  isResizing = false;
  activeHandle = null;
  selectionBox.classList.remove("capturing");
}

function captureSelectedArea() {
  if (!selectionBox) return;

  const rect = selectionBox.getBoundingClientRect();

  html2canvas(document.body, {
    x: window.scrollX + rect.left,
    y: window.scrollY + rect.top,
    width: rect.width,
    height: rect.height,
    useCORS: true,
    scale: window.devicePixelRatio,
    logging: false,
    backgroundColor: null,
  })
    .then((canvas) => {
      const image = canvas.toDataURL("image/png");
      pinImage(image);
      hideSelectionBox(); // Hide the rectangle after capture
    })
    .catch((error) => {
      console.error("Capture failed:", error);
    });
}

function hideSelectionBox() {
  if (selectionBox) {
    selectionBox.remove();
    selectionBox = null;
    isCapturing = false;
  }
}

function pinImage(image) {
  const container = document.createElement("div");
  container.className = "viewport-capture-pinned";
  container.style.position = "fixed";
  container.style.top = "20px";
  container.style.right = "20px";
  container.style.zIndex = "10000";
  container.style.cursor = "move";
  container.style.backgroundColor = "white";
  container.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)";
  container.style.borderRadius = "4px";
  container.style.overflow = "hidden";
  container.style.maxWidth = "80%"; // Limit maximum width to 80% of the viewport
  container.style.maxHeight = "80%"; // Limit maximum height to 80% of the viewport

  const pinnedImage = document.createElement("img");
  pinnedImage.src = image;
  pinnedImage.style.width = "auto";
  pinnedImage.style.height = "auto";
  pinnedImage.style.maxWidth = "100%";
  pinnedImage.style.maxHeight = "100%";
  pinnedImage.style.objectFit = "contain";
  pinnedImage.style.borderRadius = "4px";

  const closeButton = document.createElement("button");
  closeButton.innerHTML = "×";
  closeButton.style.position = "absolute";
  closeButton.style.right = "-10px";
  closeButton.style.top = "-10px";
  closeButton.style.backgroundColor = "#007bff";
  closeButton.style.color = "white";
  closeButton.style.border = "none";
  closeButton.style.borderRadius = "50%";
  closeButton.style.width = "20px";
  closeButton.style.height = "20px";
  closeButton.style.cursor = "pointer";
  closeButton.style.zIndex = "1";
  closeButton.onclick = () => container.remove();

  let isDragging = false;
  let initialX, initialY;

  function dragStart(e) {
    if (e.target === closeButton) return;
    isDragging = true;
    initialX = e.clientX - container.offsetLeft;
    initialY = e.clientY - container.offsetTop;
    container.style.cursor = "grabbing";
  }

  function dragEnd() {
    isDragging = false;
    container.style.cursor = "move";
  }

  function drag(e) {
    if (!isDragging) return;
    e.preventDefault();

    const newX = e.clientX - initialX;
    const newY = e.clientY - initialY;

    const maxX = window.innerWidth - container.offsetWidth;
    const maxY = window.innerHeight - container.offsetHeight;

    container.style.left = `${Math.max(0, Math.min(newX, maxX))}px`;
    container.style.top = `${Math.max(0, Math.min(newY, maxY))}px`;
  }

  container.addEventListener("mousedown", dragStart);
  document.addEventListener("mousemove", drag);
  document.addEventListener("mouseup", dragEnd);

  container.appendChild(pinnedImage);
  container.appendChild(closeButton);
  document.body.appendChild(container);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startCapture") {
    isCapturing = true;
    createSelectionBox();
  } else if (request.action === "stopCapture") {
    if (selectionBox) {
      captureSelectedArea();
    }
  }
  return true;
});
