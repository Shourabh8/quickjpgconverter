/**
 * Client-side SVG to PNG/JPG converter using Canvas API.
 * Reads SVG files, renders them on canvas, and exports as raster images.
 *
 * Usage: initSvgConverter({ targetFormat: 'png', targetExt: 'png', targetMime: 'image/png' })
 */

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function replaceExtension(filename, newExt) {
  const base = filename.substring(0, filename.lastIndexOf("."));
  return base + "." + newExt;
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

async function downloadAllAsZip(items) {
  const { default: JSZip } = await import("https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm");
  const zip = new JSZip();
  items.forEach((item) => zip.file(item.name, item.blob));
  const content = await zip.generateAsync({ type: "blob" });
  downloadBlob(content, "converted-svgs.zip");
}

function readSvgAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read: " + file.name));
    reader.readAsText(file);
  });
}

function renderSvgToCanvas(svgText, scale) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth * scale;
      canvas.height = img.naturalHeight * scale;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to render SVG"));
    };

    img.src = url;
  });
}

function getSvgDimensions(svgText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, "image/svg+xml");
  const svg = doc.querySelector("svg");
  if (!svg) return null;

  let width = parseFloat(svg.getAttribute("width")) || 0;
  let height = parseFloat(svg.getAttribute("height")) || 0;

  if (!width || !height) {
    const viewBox = svg.getAttribute("viewBox");
    if (viewBox) {
      const parts = viewBox.split(/[\s,]+/).map(Number);
      if (parts.length === 4) {
        width = parts[2];
        height = parts[3];
      }
    }
  }

  return width && height ? { width, height } : null;
}

export function initSvgConverter(config) {
  const { targetFormat, targetExt, targetMime } = config;

  const dropArea = document.getElementById("drop-area");
  const fileInput = dropArea?.querySelector('input[type="file"]');
  const uploadZone = document.getElementById("upload-zone");
  const previewZone = document.getElementById("preview-zone");
  const previewGrid = document.getElementById("preview-grid");
  const fileCount = document.getElementById("file-count");
  const clearBtn = document.getElementById("clear-btn");
  const convertBtn = document.getElementById("convert-btn");
  const convertBtnArea = document.getElementById("convert-btn-area");
  const downloadArea = document.getElementById("download-area");
  const dropOverlay = document.getElementById("drop-overlay");
  const progressArea = document.getElementById("progress-area");
  const progressBar = document.getElementById("progress-bar");
  const progressText = document.getElementById("progress-text");
  const scaleSelect = document.getElementById("output-scale");

  if (!dropArea || !uploadZone) return;

  dropArea.setAttribute("tabindex", "0");
  dropArea.setAttribute("role", "button");
  dropArea.setAttribute("aria-label", "Upload SVG files. Press Enter or Space to browse.");

  let files = [];
  let convertedResults = [];

  // Drag & drop
  ["dragenter", "dragover"].forEach((evt) => {
    dropArea.addEventListener(evt, (e) => { e.preventDefault(); e.stopPropagation(); dropOverlay?.classList.remove("hidden"); });
  });
  ["dragleave", "drop"].forEach((evt) => {
    dropArea.addEventListener(evt, (e) => { e.preventDefault(); e.stopPropagation(); dropOverlay?.classList.add("hidden"); });
  });
  dropArea.addEventListener("drop", (e) => addFiles(Array.from(e.dataTransfer.files)));
  dropArea.addEventListener("click", (e) => { if (e.target.tagName !== "INPUT") fileInput?.click(); });
  dropArea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput?.click(); }
  });
  fileInput?.addEventListener("change", () => {
    addFiles(Array.from(fileInput.files));
    fileInput.value = "";
  });

  clearBtn?.addEventListener("click", () => {
    files = [];
    convertedResults = [];
    showUploadZone();
  });

  convertBtn?.addEventListener("click", convertFiles);

  function addFiles(newFiles) {
    const valid = newFiles.filter((f) => f.type === "image/svg+xml" || f.name.endsWith(".svg"));
    if (valid.length === 0) return;
    files = [...files, ...valid];
    showPreviewZone();
  }

  function showUploadZone() {
    uploadZone?.classList.remove("hidden");
    previewZone?.classList.add("hidden");
    downloadArea?.classList.add("hidden");
    convertBtnArea?.classList.add("hidden");
    if (previewGrid) previewGrid.innerHTML = "";
  }

  function showPreviewZone() {
    uploadZone?.classList.add("hidden");
    previewZone?.classList.remove("hidden");
    convertBtnArea?.classList.remove("hidden");
    downloadArea?.classList.add("hidden");
    if (fileCount) fileCount.textContent = files.length === 1 ? "1 file ready" : files.length + " files ready";
    renderPreviewGrid();
  }

  function renderPreviewGrid() {
    if (!previewGrid) return;
    previewGrid.innerHTML = "";
    files.forEach((file, i) => {
      const item = document.createElement("div");
      item.className = "relative rounded-lg border border-border-default bg-surface overflow-hidden group";
      item.innerHTML = `
        <div class="w-full h-24 bg-surface-muted flex items-center justify-center">
          <svg class="w-10 h-10 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
          </svg>
        </div>
        <div class="p-2">
          <div class="text-xs font-medium text-text-primary truncate">${file.name}</div>
          <div class="text-xs text-text-tertiary">${formatBytes(file.size)} · SVG</div>
        </div>
        <button data-remove="${i}" class="absolute top-1 right-1 w-5 h-5 rounded-full bg-danger/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Remove file">
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      `;
      previewGrid.appendChild(item);
    });

    previewGrid.querySelectorAll("[data-remove]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.remove);
        files.splice(idx, 1);
        if (files.length === 0) showUploadZone();
        else { renderPreviewGrid(); fileCount.textContent = files.length === 1 ? "1 file ready" : files.length + " files ready"; }
      });
    });
  }

  async function convertFiles() {
    if (files.length === 0) return;
    const scale = parseFloat(scaleSelect?.value || "2");

    convertBtn.classList.add("opacity-50", "cursor-not-allowed");
    convertBtn.setAttribute("disabled", "");
    progressArea?.classList.remove("hidden");
    downloadArea?.classList.add("hidden");
    convertedResults = [];

    for (let i = 0; i < files.length; i++) {
      const pct = Math.round((i / files.length) * 100);
      progressBar.style.width = pct + "%";
      progressText.textContent = `Converting ${i + 1} of ${files.length}...`;

      try {
        const svgText = await readSvgAsText(files[i]);
        const dims = getSvgDimensions(svgText);
        const canvas = await renderSvgToCanvas(svgText, scale);

        const blob = await new Promise((resolve) => {
          canvas.toBlob(resolve, targetMime, targetMime === "image/jpeg" ? 0.92 : undefined);
        });

        convertedResults.push({
          blob,
          name: replaceExtension(files[i].name, targetExt),
          originalName: files[i].name,
          originalSize: files[i].size,
          compressedSize: blob.size,
          savings: files[i].size > 0 ? Math.round((1 - blob.size / files[i].size) * 100) : 0,
          width: canvas.width,
          height: canvas.height,
          svgWidth: dims?.width || "?",
          svgHeight: dims?.height || "?",
        });
      } catch (err) {
        console.error("Conversion failed:", files[i].name, err);
        convertedResults.push({ failed: true, name: files[i].name, error: err.message || "Conversion failed" });
      }
    }

    progressBar.style.width = "100%";
    progressText.textContent = "Conversion complete!";

    setTimeout(() => {
      progressArea?.classList.add("hidden");
      convertBtnArea?.classList.add("hidden");
      downloadArea?.classList.remove("hidden");
      renderDownloadArea();
    }, 500);
  }

  function renderDownloadArea() {
    if (!downloadArea) return;
    const successItems = convertedResults.filter((r) => r && !r.failed);
    const failItems = convertedResults.filter((r) => r && r.failed);
    const totalOriginal = successItems.reduce((acc, r) => acc + r.originalSize, 0);
    const totalConverted = successItems.reduce((acc, r) => acc + r.compressedSize, 0);

    let html = `
      <div class="p-4 rounded-xl border border-success/30 bg-success/5 mb-4">
        <div class="flex items-center gap-2 mb-1">
          <svg class="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span class="text-sm font-semibold text-success">${successItems.length} file${successItems.length !== 1 ? "s" : ""} converted!</span>
        </div>
        <p class="text-xs text-text-secondary">${formatBytes(totalOriginal)} → ${formatBytes(totalConverted)} total</p>
        ${failItems.length > 0 ? `<p class="text-xs text-danger mt-1">${failItems.length} file${failItems.length !== 1 ? "s" : ""} failed</p>` : ""}
      </div>
    `;

    convertedResults.forEach((item, i) => {
      if (!item || item.failed) return;
      html += `
        <div class="p-3 rounded-lg border border-border-default bg-surface mb-2">
          <div class="flex items-center justify-between mb-2">
            <div class="min-w-0 flex-1">
              <div class="text-xs font-medium text-text-primary truncate">${item.name}</div>
              <div class="text-xs text-text-tertiary">SVG ${item.svgWidth}×${item.svgHeight} → ${item.width}×${item.height}px · ${formatBytes(item.originalSize)} → ${formatBytes(item.compressedSize)}</div>
            </div>
            <button data-download="${i}" class="btn-primary btn-sm flex-shrink-0 ml-3">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>
              Download
            </button>
          </div>
        </div>
      `;
    });

    if (failItems.length > 0) {
      failItems.forEach((item) => {
        html += `
          <div class="p-3 rounded-lg border border-danger/30 bg-danger/5 mb-2">
            <div class="text-xs font-medium text-text-primary">${item.name}</div>
            <div class="text-xs text-danger">${item.error}</div>
          </div>
        `;
      });
    }

    if (successItems.length > 1) {
      html += `
        <button id="download-all-btn" class="w-full btn-primary btn-lg justify-center mt-4">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>
          Download All (${successItems.length} files as ZIP)
        </button>
      `;
    }

    html += `
      <p class="text-xs text-text-tertiary text-center mt-3">Converted locally in your browser · Your files never left your device</p>
      <div class="flex gap-2 mt-3">
        <button id="convert-more-btn" class="flex-1 btn-secondary btn-md justify-center">New Files</button>
      </div>
    `;

    downloadArea.innerHTML = html;

    downloadArea.querySelectorAll("[data-download]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.download);
        const item = convertedResults[idx];
        downloadBlob(item.blob, item.name);
      });
    });

    downloadArea.querySelector("#download-all-btn")?.addEventListener("click", () => downloadAllAsZip(successItems));

    downloadArea.querySelector("#convert-more-btn")?.addEventListener("click", () => {
      files = [];
      convertedResults = [];
      showUploadZone();
    });
  }
}
