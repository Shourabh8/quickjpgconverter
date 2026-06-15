/**
 * Client-side image compressor using Canvas API.
 * Supports: JPG, PNG, WebP with lossy and lossless modes.
 *
 * Usage: initImageCompressor()
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

const COMPRESS_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "avif"];

// ADDED: file size validation
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function validateFileSize(file) {
  if (file.size > MAX_FILE_SIZE) {
    // ADDED: show banner instead of alert — banner is shown by caller
    return false;
  }
  return true;
}

// ADDED: file size error banner helper
function showFileSizeError(file, container) {
  showErrorBanner(
    "File too large: " + file.name + " (" + (file.size / 1024 / 1024).toFixed(1) + "MB) — Maximum allowed: 50MB. Try compressing your image first.",
    container
  );
}

function isCompressible(f) {
  if (f.type.startsWith("image/")) return true;
  const ext = getExtension(f.name);
  return COMPRESS_EXTENSIONS.includes(ext);
}

// ADDED: Red error banner with auto-dismiss and X button
function showErrorBanner(message, container) {
  // Remove any existing banner first
  const existing = container?.querySelector(".error-banner");
  if (existing) existing.remove();

  const banner = document.createElement("div");
  banner.className = "error-banner flex items-start gap-3 p-3 sm:p-4 rounded-xl border border-danger/30 bg-danger/5 mb-4 animate-fade-in";
  banner.innerHTML = `
    <svg class="w-5 h-5 text-danger flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
    <div class="flex-1 min-w-0">
      <p class="text-sm font-semibold text-danger">${message}</p>
    </div>
    <button class="error-banner-close flex-shrink-0 p-1 rounded-lg hover:bg-danger/10 transition-colors" aria-label="Dismiss error">
      <svg class="w-4 h-4 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  `;

  // Insert banner at the top of the container
  if (container) {
    container.prepend(banner);
  } else {
    document.body.prepend(banner);
  }

  // X button dismiss
  banner.querySelector(".error-banner-close")?.addEventListener("click", () => {
    banner.remove();
  });

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    if (banner.parentNode) {
      banner.style.transition = "opacity 0.3s ease";
      banner.style.opacity = "0";
      setTimeout(() => banner.remove(), 300);
    }
  }, 5000);
}

function getOutputMime(file) {
  const ext = getExtension(file.name);
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "avif") return "image/avif";
  return "image/jpeg";
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load: " + file.name));
    };
    img.src = url;
  });
}

function compressImage(img, mime, quality, maxSize) {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    let { naturalWidth, naturalHeight } = img;

    if (maxSize && maxSize > 0) {
      if (naturalWidth > maxSize || naturalHeight > maxSize) {
        const ratio = Math.min(maxSize / naturalWidth, maxSize / naturalHeight);
        naturalWidth = Math.round(naturalWidth * ratio);
        naturalHeight = Math.round(naturalHeight * ratio);
      }
    }

    canvas.width = naturalWidth;
    canvas.height = naturalHeight;
    const ctx = canvas.getContext("2d");
    if (mime === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0, naturalWidth, naturalHeight);
    canvas.toBlob((blob) => resolve(blob), mime, quality);
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

async function downloadAllAsZip(items) {
  const { default: JSZip } = await import("https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm");
  const zip = new JSZip();
  items.forEach((item) => {
    zip.file(item.name, item.blob);
  });
  const content = await zip.generateAsync({ type: "blob" });
  downloadBlob(content, "compressed-images.zip");
}

export function initImageCompressor() {
  const dropArea = document.getElementById("drop-area");
  const fileInput = dropArea?.querySelector('input[type="file"]');
  const uploadZone = document.getElementById("upload-zone");
  const previewZone = document.getElementById("preview-zone");
  const previewGrid = document.getElementById("preview-grid");
  const fileCount = document.getElementById("file-count");
  const clearBtn = document.getElementById("clear-btn");
  const compressBtn = document.getElementById("compress-btn");
  const compressBtnArea = document.getElementById("compress-btn-area");
  const downloadArea = document.getElementById("download-area");
  const dropOverlay = document.getElementById("drop-overlay");
  const progressArea = document.getElementById("progress-area");
  const progressBar = document.getElementById("progress-bar");
  const progressText = document.getElementById("progress-text");
  const qualitySlider = document.getElementById("quality-slider");
  const qualityValue = document.getElementById("quality-value");

  if (!dropArea || !uploadZone) return;

  // Keyboard accessibility
  dropArea.setAttribute("tabindex", "0");
  dropArea.setAttribute("role", "button");
  dropArea.setAttribute("aria-label", "Upload image files. Press Enter or Space to browse.");

  let files = [];
  let compressedResults = [];

  // --- Quality slider ---
  qualitySlider?.addEventListener("input", () => {
    if (qualityValue) qualityValue.textContent = qualitySlider.value + "%";
  });

  // --- Drag & Drop ---
  ["dragenter", "dragover"].forEach((evt) => {
    dropArea.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropOverlay?.classList.remove("hidden");
    });
  });

  ["dragleave", "drop"].forEach((evt) => {
    dropArea.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropOverlay?.classList.add("hidden");
    });
  });

  dropArea.addEventListener("drop", (e) => {
    addFiles(Array.from(e.dataTransfer.files));
  });

  dropArea.addEventListener("click", (e) => {
    if (e.target.tagName !== "INPUT") fileInput?.click();
  });

  dropArea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput?.click();
    }
  });

  fileInput?.addEventListener("change", () => {
    addFiles(Array.from(fileInput.files));
    fileInput.value = "";
  });

  clearBtn?.addEventListener("click", () => {
    files = [];
    compressedResults = [];
    showUploadZone();
  });

  compressBtn?.addEventListener("click", compressFiles);

  function addFiles(newFiles) {
    // ADDED: file size validation + unsupported file error banner
    const valid = [];
    for (const f of newFiles) {
      if (!isCompressible(f)) {
        const ext = getExtension(f.name);
        showErrorBanner(
          "Unsupported file: ." + ext + " — This tool accepts: JPG, JPEG, PNG, WebP, AVIF. Browse our other tools for ." + ext + " files.",
          uploadZone
        );
        continue;
      }
      if (!validateFileSize(f)) {
        showFileSizeError(f, uploadZone);
        continue;
      }
      valid.push(f);
    }
    if (valid.length === 0) return;
    files = [...files, ...valid];
    showPreviewZone();
  }

  function showUploadZone() {
    uploadZone?.classList.remove("hidden");
    previewZone?.classList.add("hidden");
    downloadArea?.classList.add("hidden");
    compressBtnArea?.classList.add("hidden");
    if (previewGrid) previewGrid.innerHTML = "";
  }

  function showPreviewZone() {
    uploadZone?.classList.add("hidden");
    previewZone?.classList.remove("hidden");
    compressBtnArea?.classList.remove("hidden");
    downloadArea?.classList.add("hidden");
    if (fileCount) fileCount.textContent = files.length === 1 ? "1 file ready" : files.length + " files ready";
    renderPreviewGrid();
  }

  function renderPreviewGrid() {
    if (!previewGrid) return;
    previewGrid.innerHTML = "";
    files.forEach((file, i) => {
      const url = URL.createObjectURL(file);
      const item = document.createElement("div");
      item.className = "relative rounded-lg border border-border-default bg-surface overflow-hidden group";
      item.innerHTML = `
        <img src="${url}" alt="${file.name}" class="w-full h-24 object-cover" onload="URL.revokeObjectURL(this.src)" />
        <div class="p-2">
          <div class="text-xs font-medium text-text-primary truncate">${file.name}</div>
          <div class="text-xs text-text-tertiary">${formatBytes(file.size)}</div>
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

  async function compressFiles() {
    if (files.length === 0) return;
    compressBtn.classList.add("opacity-50", "cursor-not-allowed");
    compressBtn.setAttribute("disabled", "");
    progressArea?.classList.remove("hidden");
    downloadArea?.classList.add("hidden");
    compressedResults = [];

    const quality = (qualitySlider?.value || 80) / 100;
    const checkedMode = document.querySelector('input[name="mode"]:checked');
    const isLossless = checkedMode?.value === "lossless";
    const resizeRadio = document.querySelector('input[name="resize"]:checked');
    const maxSize = resizeRadio?.value === "none" ? 0 : parseInt(resizeRadio?.value || "0");

    for (let i = 0; i < files.length; i++) {
      const pct = Math.round((i / files.length) * 100);
      progressBar.style.width = pct + "%";
      progressText.textContent = `Compressing ${i + 1} of ${files.length}...`;

      try {
        const img = await loadImage(files[i]);
        const mime = getOutputMime(files[i]);
        const blob = await compressImage(img, isLossless ? mime : mime, isLossless ? 1.0 : quality, maxSize);
        const savings = files[i].size > 0 ? Math.round((1 - blob.size / files[i].size) * 100) : 0;
        const ext = getExtension(files[i].name);
        compressedResults.push({
          blob,
          name: files[i].name,
          originalName: files[i].name,
          originalSize: files[i].size,
          compressedSize: blob.size,
          savings,
          width: img.naturalWidth,
          height: img.naturalHeight,
          ext,
        });
      } catch (err) {
        console.error("Compression failed:", files[i].name, err);
        compressedResults.push({ failed: true, name: files[i].name, error: err.message || "Compression failed" });
      }
    }

    progressBar.style.width = "100%";
    progressText.textContent = "Compression complete!";

    setTimeout(() => {
      progressArea?.classList.add("hidden");
      compressBtnArea?.classList.add("hidden");
      downloadArea?.classList.remove("hidden");
      renderDownloadArea();
    }, 500);
  }

  async function recompressFiles() {
    if (files.length === 0) return;
    downloadArea?.classList.add("hidden");
    progressArea?.classList.remove("hidden");
    compressedResults = [];

    const quality = (qualitySlider?.value || 80) / 100;
    const checkedMode = document.querySelector('input[name="mode"]:checked');
    const isLossless = checkedMode?.value === "lossless";
    const resizeRadio = document.querySelector('input[name="resize"]:checked');
    const maxSize = resizeRadio?.value === "none" ? 0 : parseInt(resizeRadio?.value || "0");

    for (let i = 0; i < files.length; i++) {
      const pct = Math.round((i / files.length) * 100);
      progressBar.style.width = pct + "%";
      progressText.textContent = `Recompressing ${i + 1} of ${files.length}...`;

      try {
        const img = await loadImage(files[i]);
        const mime = getOutputMime(files[i]);
        const blob = await compressImage(img, isLossless ? mime : mime, isLossless ? 1.0 : quality, maxSize);
        const savings = files[i].size > 0 ? Math.round((1 - blob.size / files[i].size) * 100) : 0;
        const ext = getExtension(files[i].name);
        compressedResults.push({
          blob,
          name: files[i].name,
          originalName: files[i].name,
          originalSize: files[i].size,
          compressedSize: blob.size,
          savings,
          width: img.naturalWidth,
          height: img.naturalHeight,
          ext,
        });
      } catch (err) {
        console.error("Compression failed:", files[i].name, err);
        compressedResults.push({ failed: true, name: files[i].name, error: err.message || "Compression failed" });
      }
    }

    progressBar.style.width = "100%";
    progressText.textContent = "Recompression complete!";

    setTimeout(() => {
      progressArea?.classList.add("hidden");
      downloadArea?.classList.remove("hidden");
      renderDownloadArea();
    }, 500);
  }

  function renderDownloadArea() {
    if (!downloadArea) return;
    const successItems = compressedResults.filter((r) => r && !r.failed);
    const failItems = compressedResults.filter((r) => r && r.failed);
    const totalSaved = successItems.reduce((acc, r) => acc + (r.originalSize - r.compressedSize), 0);

    let html = `
      <div class="p-4 rounded-xl border border-success/30 bg-success/5 mb-4">
        <div class="flex items-center gap-2 mb-1">
          <svg class="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span class="text-sm font-semibold text-success">${successItems.length} file${successItems.length !== 1 ? "s" : ""} compressed!</span>
        </div>
        <p class="text-xs text-text-secondary">Saved ${formatBytes(totalSaved)} total</p>
        ${failItems.length > 0 ? `<p class="text-xs text-danger mt-1">${failItems.length} file${failItems.length !== 1 ? "s" : ""} failed</p>` : ""}
      </div>
    `;

    compressedResults.forEach((item, i) => {
      if (!item || item.failed) return;
      const barWidth = Math.max(5, Math.min(100, item.savings));
      const sizeChanged = item.compressedSize < item.originalSize;
      html += `
        <div class="p-3 rounded-lg border border-border-default bg-surface mb-2">
          <div class="flex items-center justify-between mb-2">
            <div class="min-w-0 flex-1">
              <div class="text-xs font-medium text-text-primary truncate">${item.name}</div>
              <div class="text-xs text-text-tertiary">${formatBytes(item.originalSize)} → ${formatBytes(item.compressedSize)} · ${sizeChanged ? "-" + item.savings + "%" : "Already small"}</div>
            </div>
            <button data-download="${i}" class="btn-primary btn-sm flex-shrink-0 ml-3">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>
              Download
            </button>
          </div>
          <div class="w-full h-1.5 rounded-full bg-surface-muted overflow-hidden">
            <div class="h-full rounded-full ${sizeChanged ? "bg-success" : "bg-brand-500"}" style="width: ${barWidth}%"></div>
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
          Download All (${successItems.length} files)
        </button>
      `;
    }

    html += `
      <p class="text-xs text-text-tertiary text-center mt-3">Compressed locally in your browser · Your files never left your device</p>
      <div class="flex gap-2 mt-3">
        <button id="recompress-btn" class="flex-1 btn-secondary btn-md justify-center">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"/></svg>
          Recompress
        </button>
        <button id="compress-more-btn" class="flex-1 btn-secondary btn-md justify-center">New Files</button>
      </div>
    `;

    downloadArea.innerHTML = html;

    downloadArea.querySelectorAll("[data-download]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.download);
        const item = compressedResults[idx];
        downloadBlob(item.blob, item.name);
      });
    });

    downloadArea.querySelector("#download-all-btn")?.addEventListener("click", () => {
      downloadAllAsZip(successItems);
    });

    downloadArea.querySelector("#recompress-btn")?.addEventListener("click", () => {
      recompressFiles();
    });

    downloadArea.querySelector("#compress-more-btn")?.addEventListener("click", () => {
      files = [];
      compressedResults = [];
      showUploadZone();
    });
  }
}
