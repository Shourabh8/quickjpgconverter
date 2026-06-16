/**
 * Client-side image cropper using Canvas API.
 * Users can select an aspect ratio and drag a crop box on the image.
 *
 * Usage: initCropImage()
 */

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getExtension(filename) {
  return filename.split(".").pop().toLowerCase();
}

function getOutputMime(file) {
  const ext = getExtension(file.name);
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function initCropImage() {
  const dropArea = document.getElementById("drop-area");
  const fileInput = dropArea?.querySelector('input[type="file"]');
  const uploadZone = document.getElementById("upload-zone");
  const editorZone = document.getElementById("editor-zone");
  const canvas = document.getElementById("crop-canvas");
  const ctx = canvas?.getContext("2d");
  const downloadBtn = document.getElementById("download-btn");
  const cropAgainBtn = document.getElementById("crop-again-btn");
  const aspectBtns = document.querySelectorAll("[data-aspect]");
  const originalSizeEl = document.getElementById("original-size");
  const croppedSizeEl = document.getElementById("cropped-size");
  const dropOverlay = document.getElementById("drop-overlay");

  if (!dropArea || !uploadZone || !canvas || !ctx) return;

  dropArea.setAttribute("tabindex", "0");
  dropArea.setAttribute("role", "button");
  dropArea.setAttribute("aria-label", "Upload an image to crop. Press Enter or Space to browse.");

  let currentFile = null;
  let originalImg = null;
  let aspectRatio = null; // null = free crop
  let cropBox = { x: 0, y: 0, w: 0, h: 0 };
  let isDragging = false;
  let dragHandle = null;
  let dragStart = { x: 0, y: 0 };
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  // Drag & drop
  ["dragenter", "dragover"].forEach((evt) => {
    dropArea.addEventListener(evt, (e) => { e.preventDefault(); e.stopPropagation(); dropOverlay?.classList.remove("hidden"); });
  });
  ["dragleave", "drop"].forEach((evt) => {
    dropArea.addEventListener(evt, (e) => { e.preventDefault(); e.stopPropagation(); dropOverlay?.classList.add("hidden"); });
  });
  dropArea.addEventListener("drop", (e) => { if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]); });
  dropArea.addEventListener("click", (e) => { if (e.target.tagName !== "INPUT") fileInput?.click(); });
  dropArea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput?.click(); }
  });
  fileInput?.addEventListener("change", () => {
    if (fileInput.files[0]) loadFile(fileInput.files[0]);
    fileInput.value = "";
  });

  // Aspect ratio buttons
  aspectBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      aspectBtns.forEach((b) => b.classList.remove("bg-brand-600", "text-white", "border-brand-600"));
      btn.classList.add("bg-brand-600", "text-white", "border-brand-600");
      const val = btn.dataset.aspect;
      aspectRatio = val === "free" ? null : eval(val);
      resetCropBox();
      draw();
    });
  });

  // Download
  downloadBtn?.addEventListener("click", () => {
    if (!currentFile || !originalImg) return;
    const mime = getOutputMime(currentFile);
    const outCanvas = document.createElement("canvas");
    outCanvas.width = cropBox.w / scale;
    outCanvas.height = cropBox.h / scale;
    const outCtx = outCanvas.getContext("2d");
    if (mime === "image/jpeg") {
      outCtx.fillStyle = "#ffffff";
      outCtx.fillRect(0, 0, outCanvas.width, outCanvas.height);
    }
    outCtx.drawImage(
      originalImg,
      (cropBox.x - offsetX) / scale, (cropBox.y - offsetY) / scale,
      cropBox.w / scale, cropBox.h / scale,
      0, 0, outCanvas.width, outCanvas.height
    );
    outCanvas.toBlob((blob) => {
      const name = currentFile.name.replace(/\.[^.]+$/, "") + "-cropped." + (mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg");
      downloadBlob(blob, name);
    }, mime, 0.92);
  });

  // Crop again
  cropAgainBtn?.addEventListener("click", () => {
    currentFile = null;
    originalImg = null;
    editorZone?.classList.add("hidden");
    uploadZone?.classList.remove("hidden");
  });

  function loadFile(file) {
    if (!file.type.startsWith("image/")) return;
    currentFile = file;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      originalImg = img;
      if (originalSizeEl) originalSizeEl.textContent = formatBytes(file.size);
      uploadZone?.classList.add("hidden");
      editorZone?.classList.remove("hidden");
      fitToCanvas();
      resetCropBox();
      draw();
    };
    img.src = url;
  }

  function fitToCanvas() {
    if (!originalImg || !canvas) return;
    const container = canvas.parentElement;
    const maxW = container.clientWidth;
    const maxH = 500;
    scale = Math.min(maxW / originalImg.naturalWidth, maxH / originalImg.naturalHeight, 1);
    canvas.width = Math.round(originalImg.naturalWidth * scale);
    canvas.height = Math.round(originalImg.naturalHeight * scale);
    offsetX = 0;
    offsetY = 0;
  }

  function resetCropBox() {
    const cw = canvas.width;
    const ch = canvas.height;
    if (aspectRatio) {
      if (cw / ch > aspectRatio) {
        cropBox.h = ch * 0.8;
        cropBox.w = cropBox.h * aspectRatio;
      } else {
        cropBox.w = cw * 0.8;
        cropBox.h = cropBox.w / aspectRatio;
      }
    } else {
      cropBox.w = cw * 0.8;
      cropBox.h = ch * 0.8;
    }
    cropBox.x = (cw - cropBox.w) / 2;
    cropBox.y = (ch - cropBox.h) / 2;
  }

  function draw() {
    if (!ctx || !originalImg) return;
    const cw = canvas.width;
    const ch = canvas.height;

    // Draw image
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(originalImg, 0, 0, cw, ch);

    // Dark overlay outside crop box
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, cw, ch);
    ctx.clearRect(cropBox.x, cropBox.y, cropBox.w, cropBox.h);

    // Redraw image in crop area
    ctx.save();
    ctx.beginPath();
    ctx.rect(cropBox.x, cropBox.y, cropBox.w, cropBox.h);
    ctx.clip();
    ctx.drawImage(originalImg, 0, 0, cw, ch);
    ctx.restore();

    // Crop box border
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(cropBox.x, cropBox.y, cropBox.w, cropBox.h);

    // Rule of thirds grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1;
    for (let i = 1; i <= 2; i++) {
      const xLine = cropBox.x + (cropBox.w / 3) * i;
      const yLine = cropBox.y + (cropBox.h / 3) * i;
      ctx.beginPath(); ctx.moveTo(xLine, cropBox.y); ctx.lineTo(xLine, cropBox.y + cropBox.h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cropBox.x, yLine); ctx.lineTo(cropBox.x + cropBox.w, yLine); ctx.stroke();
    }

    // Corner handles
    const hs = 10;
    ctx.fillStyle = "#ffffff";
    [
      [cropBox.x, cropBox.y],
      [cropBox.x + cropBox.w - hs, cropBox.y],
      [cropBox.x, cropBox.y + cropBox.h - hs],
      [cropBox.x + cropBox.w - hs, cropBox.y + cropBox.h - hs],
    ].forEach(([hx, hy]) => ctx.fillRect(hx, hy, hs, hs));

    // Update size display
    if (croppedSizeEl) {
      const realW = Math.round(cropBox.w / scale);
      const realH = Math.round(cropBox.h / scale);
      croppedSizeEl.textContent = `${realW} × ${realH}px`;
    }
  }

  // Canvas mouse/touch interaction
  function getCanvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function getHandle(pos) {
    const hs = 14;
    const corners = [
      { hx: cropBox.x, hy: cropBox.y, handle: "tl" },
      { hx: cropBox.x + cropBox.w, hy: cropBox.y, handle: "tr" },
      { hx: cropBox.x, hy: cropBox.y + cropBox.h, handle: "bl" },
      { hx: cropBox.x + cropBox.w, hy: cropBox.y + cropBox.h, handle: "br" },
    ];
    for (const c of corners) {
      if (Math.abs(pos.x - c.hx) < hs && Math.abs(pos.y - c.hy) < hs) return c.handle;
    }
    if (pos.x > cropBox.x && pos.x < cropBox.x + cropBox.w && pos.y > cropBox.y && pos.y < cropBox.y + cropBox.h) return "move";
    return null;
  }

  function onPointerDown(e) {
    const pos = getCanvasPos(e);
    dragHandle = getHandle(pos);
    if (dragHandle) {
      isDragging = true;
      dragStart = pos;
      e.preventDefault();
    }
  }

  function onPointerMove(e) {
    if (!isDragging) {
      const pos = getCanvasPos(e);
      const handle = getHandle(pos);
      canvas.style.cursor = handle ? (handle === "move" ? "move" : "nwse-resize") : "default";
      return;
    }
    const pos = getCanvasPos(e);
    const dx = pos.x - dragStart.x;
    const dy = pos.y - dragStart.y;
    dragStart = pos;

    if (dragHandle === "move") {
      cropBox.x = Math.max(0, Math.min(canvas.width - cropBox.w, cropBox.x + dx));
      cropBox.y = Math.max(0, Math.min(canvas.height - cropBox.h, cropBox.y + dy));
    } else {
      if (dragHandle.includes("r")) {
        cropBox.w = Math.max(30, Math.min(canvas.width - cropBox.x, cropBox.w + dx));
        if (aspectRatio) cropBox.h = cropBox.w / aspectRatio;
      }
      if (dragHandle.includes("b")) {
        cropBox.h = Math.max(30, Math.min(canvas.height - cropBox.y, cropBox.h + dy));
        if (aspectRatio) cropBox.w = cropBox.h * aspectRatio;
      }
      if (dragHandle === "tl") {
        cropBox.w = Math.max(30, cropBox.w - dx);
        cropBox.h = aspectRatio ? cropBox.w / aspectRatio : Math.max(30, cropBox.h - dy);
        cropBox.x = cropBox.x + (cropBox.w - (cropBox.w + dx));
        cropBox.y = cropBox.y + (cropBox.h - (cropBox.h + dy));
      }
      if (dragHandle === "tr") {
        cropBox.w = Math.max(30, Math.min(canvas.width - cropBox.x, cropBox.w + dx));
        cropBox.h = aspectRatio ? cropBox.w / aspectRatio : Math.max(30, cropBox.h + dy);
      }
      if (dragHandle === "bl") {
        cropBox.w = Math.max(30, cropBox.w - dx);
        cropBox.h = aspectRatio ? cropBox.w / aspectRatio : Math.max(30, Math.min(canvas.height - cropBox.y, cropBox.h + dy));
      }
    }
    draw();
  }

  function onPointerUp() {
    isDragging = false;
    dragHandle = null;
  }

  canvas.addEventListener("mousedown", onPointerDown);
  canvas.addEventListener("mousemove", onPointerMove);
  canvas.addEventListener("mouseup", onPointerUp);
  canvas.addEventListener("mouseleave", onPointerUp);
  canvas.addEventListener("touchstart", onPointerDown, { passive: false });
  canvas.addEventListener("touchmove", onPointerMove, { passive: false });
  canvas.addEventListener("touchend", onPointerUp);

  // Resize handler
  window.addEventListener("resize", () => {
    if (!originalImg) return;
    fitToCanvas();
    resetCropBox();
    draw();
  });
}
