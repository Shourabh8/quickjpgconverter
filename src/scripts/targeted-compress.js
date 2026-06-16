/**
 * Client-side targeted image compressor using Canvas API.
 * Iteratively reduces quality to hit a target file size.
 *
 * Usage: initTargetedCompressor({ targetSize: 100 * 1024 }) // 100KB
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

function replaceExtension(filename, newExt) {
  const base = filename.substring(0, filename.lastIndexOf("."));
  return base + "." + newExt;
}

const COMPRESS_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

function isCompressible(f) {
  if (f.type.startsWith("image/")) return true;
  const ext = getExtension(f.name);
  return COMPRESS_EXTENSIONS.includes(ext);
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

function compressToBlob(img, quality) {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
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

export function initTargetedCompressor(config) {
  const dropArea = document.getElementById("drop-area");
  const fileInput = dropArea?.querySelector('input[type="file"]');
  const uploadZone = document.getElementById("upload-zone");
  const previewZone = document.getElementById("preview-zone");
  const previewGrid = document.getElementById("preview-grid");
  const fileCount = document.getElementById("file-count");
  const clearBtn = document.getElementById("clear-btn");
  const compressBtn = document.getElementById("convert-btn");
  const compressBtnArea = document.getElementById("compress-btn-area") || compressBtn?.parentElement;
  const downloadArea = document.getElementById("download-area");
  const downloadAllBtn = document.getElementById("download-all-btn");
  const dropOverlay = document.getElementById("drop-overlay");
  const progressArea = document.getElementById("progress-area");
  const progressBar = document.getElementById("progress-bar");
  const progressText = document.getElementById("progress-text");
  const targetSizeDisplay = document.getElementById("target-size-display");

  if (!dropArea || !uploadZone) return;

  config.targetSize = config.targetSize || 100 * 1024;

  function updateTargetDisplay() {
    if (targetSizeDisplay) {
      targetSizeDisplay.textContent = formatBytes(config.targetSize);
    }
    // Update compress button text
    if (compressBtn) {
      const btnText = compressBtn.querySelector("span:last-child") || compressBtn;
      // Only update if it's a targeted compress button (not generic)
      if (compressBtn.dataset.targeted !== "false") {
        compressBtn.childNodes.forEach((n) => {
          if (n.nodeType === 3 && n.textContent.includes("Compress")) {
            n.textContent = `Compress to ${formatBytes(config.targetSize)}`;
          }
        });
      }
    }
    // Update target display in sidebar if present
    const sidebarTarget = document.getElementById("sidebar-target-size");
    if (sidebarTarget) sidebarTarget.textContent = formatBytes(config.targetSize);
  }

  updateTargetDisplay();

  // Expose setter for dynamic target pages
  window.__setTargetSize = (kb) => {
    config.targetSize = kb * 1024;
    updateTargetDisplay();
  };

  // Keyboard accessibility
  dropArea.setAttribute("tabindex", "0");
  dropArea.setAttribute("role", "button");
  dropArea.setAttribute("aria-label", "Upload image files. Press Enter or Space to browse.");

  let files = [];
  let compressedResults = [];

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
    const valid = newFiles.filter((f) => {
      if (f.size > 50 * 1024 * 1024) {
        alert(f.name + " exceeds 50MB limit.");
        return false;
      }
      if (!isCompressible(f)) {
        alert(f.name + " is not a supported image file.");
        return false;
      }
      return true;
    });
    if (valid.length === 0) return;
    files = [...files, ...valid];
    showPreviewZone();
  }

  function showUploadZone() {
    uploadZone?.classList.remove("hidden");
    previewZone?.classList.add("hidden");
    downloadArea?.classList.add("hidden");
    compressBtnArea?.classList.add("hidden");
    if (compressBtn) {
      compressBtn.classList.add("opacity-50", "cursor-not-allowed");
      compressBtn.setAttribute("disabled", "");
    }
    if (previewGrid) previewGrid.innerHTML = "";
  }

  function showPreviewZone() {
    uploadZone?.classList.add("hidden");
    previewZone?.classList.remove("hidden");
    compressBtnArea?.classList.remove("hidden");
    downloadArea?.classList.add("hidden");
    if (compressBtn) {
      compressBtn.classList.remove("opacity-50", "cursor-not-allowed");
      compressBtn.removeAttribute("disabled");
    }
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

    for (let i = 0; i < files.length; i++) {
      const pct = Math.round((i / files.length) * 100);
      progressBar.style.width = pct + "%";
      progressText.textContent = `Compressing ${i + 1} of ${files.length}...`;

      try {
        const img = await loadImage(files[i]);
        const result = await compressToTargetSize(img, files[i].name, config.targetSize);
        result.originalFile = files[i];
        compressedResults.push(result);
      } catch (err) {
        console.error("Compression failed:", files[i].name, err);
        compressedResults.push({ failed: true, name: files[i].name, error: err.message || "Compression failed" });
      }
    }

    progressBar.style.width = "100%";
    progressText.textContent = "Compression complete!";

    setTimeout(() => {
      progressArea?.classList.add("hidden");
      downloadArea?.classList.remove("hidden");
      renderDownloadArea();
    }, 500);
  }

  async function compressToTargetSize(img, originalName, target) {
    let quality = 0.85;
    let bestBlob = null;
    let bestQuality = quality;
    let minQuality = 0.05;
    let maxQuality = 0.95;

    // If already under target, just compress slightly
    const initialBlob = await compressToBlob(img, quality);
    if (initialBlob.size <= target) {
      const savings = Math.round((1 - initialBlob.size / initialBlob.size) * 100);
      return {
        blob: initialBlob,
        name: replaceExtension(originalName, "jpg"),
        originalName,
        originalSize: initialBlob.size,
        compressedSize: initialBlob.size,
        savings: 0,
        width: img.naturalWidth,
        height: img.naturalHeight,
        reachedTarget: true,
      };
    }

    // Binary search for quality that hits target size
    let iterations = 0;
    const maxIterations = 10;

    while (iterations < maxIterations) {
      const blob = await compressToBlob(img, quality);
      const diff = blob.size - target;
      const percentageOff = Math.abs(diff) / target;

      if (percentageOff < 0.1) { // Within 10% of target
        bestBlob = blob;
        bestQuality = quality;
        break;
      }

      if (blob.size > target) {
        maxQuality = quality;
        quality = (quality + minQuality) / 2;
      } else {
        minQuality = quality;
        bestBlob = blob;
        bestQuality = quality;
        quality = (quality + maxQuality) / 2;
      }

      iterations++;
    }

    if (!bestBlob) {
      bestBlob = await compressToBlob(img, minQuality);
      bestQuality = minQuality;
    }

    const savings = Math.round((1 - bestBlob.size / (img.naturalWidth * img.naturalHeight * 3)) * 100);
    const originalFileSize = files.find(f => f.name === originalName)?.size || bestBlob.size;

    return {
      blob: bestBlob,
      name: replaceExtension(originalName, "jpg"),
      originalName,
      originalSize: originalFileSize,
      compressedSize: bestBlob.size,
      savings: originalFileSize > 0 ? Math.round((1 - bestBlob.size / originalFileSize) * 100) : 0,
      width: img.naturalWidth,
      height: img.naturalHeight,
      reachedTarget: bestBlob.size <= target * 1.1,
    };
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
        <p class="text-xs text-text-secondary">Saved ${formatBytes(totalSaved)} total · Target: ${formatBytes(config.targetSize)}</p>
        ${failItems.length > 0 ? `<p class="text-xs text-danger mt-1">${failItems.length} file${failItems.length !== 1 ? "s" : ""} failed</p>` : ""}
      </div>
    `;

    compressedResults.forEach((item, i) => {
      if (!item || item.failed) return;
      const targetReached = item.reachedTarget;
      html += `
        <div class="p-3 rounded-lg border border-border-default bg-surface mb-2">
          <div class="flex items-center justify-between mb-2">
            <div class="min-w-0 flex-1">
              <div class="text-xs font-medium text-text-primary truncate">${item.name}</div>
              <div class="text-xs text-text-tertiary">${formatBytes(item.originalSize)} → ${formatBytes(item.compressedSize)} · ${item.savings > 0 ? "-" + item.savings : item.savings}%</div>
              ${targetReached ? '<div class="text-xs text-success font-medium">✓ Target reached</div>' : '<div class="text-xs text-warning">Could not reach target with this image</div>'}
            </div>
            <button data-download="${i}" class="btn-primary btn-sm flex-shrink-0 ml-3">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>
              Download
            </button>
          </div>
          <div class="flex gap-2 mt-2">
            <button data-compare="${i}" class="flex-1 text-xs py-1.5 px-2 rounded-lg border border-border-default bg-surface hover:bg-surface-subtle text-text-secondary transition-colors flex items-center justify-center gap-1">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"/></svg>
              Compare
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
      <p class="text-xs text-text-tertiary text-center mt-3">Compressed locally in your browser · Your files never left your device</p>
      <button id="compress-more-btn" class="w-full btn-secondary btn-md justify-center mt-3">Compress More Files</button>
    `;

    downloadArea.innerHTML = html;

    downloadArea.querySelectorAll("[data-download]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.download);
        const item = compressedResults[idx];
        downloadBlob(item.blob, item.name);
      });
    });

    downloadArea.querySelectorAll("[data-compare]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.compare);
        const item = compressedResults[idx];
        if (!item || item.failed || !item.originalFile) return;
        if (window.CompareSlider) {
          window.CompareSlider.show({
            originalUrl: URL.createObjectURL(item.originalFile),
            compressedUrl: URL.createObjectURL(item.blob),
            originalSize: item.originalSize,
            compressedSize: item.compressedSize,
            fileName: item.name,
            title: "Compare Quality",
          });
        }
      });
    });

    downloadArea.querySelector("#download-all-btn")?.addEventListener("click", () => {
      downloadAllAsZip(successItems);
    });

    downloadArea.querySelector("#compress-more-btn")?.addEventListener("click", () => {
      files = [];
      compressedResults = [];
      showUploadZone();
    });
  }
}
