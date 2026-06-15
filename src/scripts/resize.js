/**
 * Client-side image resizer using Canvas API.
 * Resizes JPG/PNG/WebP images to custom dimensions.
 *
 * Usage: initResizer()
 */

import JSZip from "jszip";

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

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "heic", "heif"];

function isImageFile(f) {
  if (f.type.startsWith("image/")) return true;
  const ext = getExtension(f.name);
  return IMAGE_EXTENSIONS.includes(ext);
}

function replaceExtension(filename, newExt) {
  const base = filename.substring(0, filename.lastIndexOf("."));
  return base + "." + newExt;
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
      reject(new Error("Failed to load image: " + file.name));
    };
    img.src = url;
  });
}

function getOutputFormat(files) {
  if (files.length === 0) return "jpg";
  const ext = getExtension(files[0].name);
  if (["png"].includes(ext)) return "png";
  if (["webp"].includes(ext)) return "webp";
  return "jpg";
}

function getOutputMime(format) {
  const map = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };
  return map[format] || "image/jpeg";
}

export function initResizer() {
  let files = [];
  let resizedBlobs = [];

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

  const widthInput = document.getElementById("resize-width");
  const heightInput = document.getElementById("resize-height");
  const lockRatio = document.getElementById("lock-ratio");
  const originalSizeEl = document.getElementById("original-size");

  if (!dropArea || !uploadZone) return;

  let originalWidth = 0;
  let originalHeight = 0;
  let aspectRatio = 1;

  // --- Keyboard accessibility ---
  dropArea.setAttribute("tabindex", "0");
  dropArea.setAttribute("role", "button");
  dropArea.setAttribute("aria-label", "Upload image files. Press Enter or Space to browse.");

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
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  });

  // --- Click to browse ---
  dropArea.addEventListener("click", (e) => {
    if (e.target.tagName !== "INPUT") fileInput?.click();
  });

  // --- Keyboard to browse ---
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

  // --- Clear ---
  clearBtn?.addEventListener("click", () => {
    files = [];
    resizedBlobs = [];
    showUploadZone();
  });

  // --- Convert ---
  convertBtn?.addEventListener("click", () => {
    resizeAll();
  });

  // --- Dimension inputs with aspect ratio lock ---
  widthInput?.addEventListener("input", () => {
    if (lockRatio?.checked && originalWidth > 0) {
      const ratio = originalHeight / originalWidth;
      heightInput.value = Math.round(parseInt(widthInput.value) * ratio) || "";
    }
  });

  heightInput?.addEventListener("input", () => {
    if (lockRatio?.checked && originalHeight > 0) {
      const ratio = originalWidth / originalHeight;
      widthInput.value = Math.round(parseInt(heightInput.value) * ratio) || "";
    }
  });

  // --- Preset buttons ---
  document.querySelectorAll("[data-preset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const [w, h] = btn.dataset.preset.split("x").map(Number);
      widthInput.value = w;
      heightInput.value = h;
      lockRatio.checked = false;
    });
  });

  function addFiles(newFiles) {
    const valid = newFiles.filter((f) => {
      if (f.size > 50 * 1024 * 1024) {
        alert(f.name + " exceeds 50MB limit.");
        return false;
      }
      if (!isImageFile(f)) {
        alert(f.name + " is not an image file.");
        return false;
      }
      return true;
    });

    files = [...files, ...valid];
    resizedBlobs = [];

    if (files.length > 0) {
      loadFirstImageDimensions();
      showPreviewZone();
    }
  }

  async function loadFirstImageDimensions() {
    if (files.length === 0) return;
    try {
      const img = await loadImage(files[0]);
      originalWidth = img.naturalWidth;
      originalHeight = img.naturalHeight;
      aspectRatio = originalWidth / originalHeight;

      widthInput.value = originalWidth;
      heightInput.value = originalHeight;

      if (originalSizeEl) {
        originalSizeEl.textContent = `${originalWidth} × ${originalHeight}px`;
      }
    } catch (e) {
      console.error("Failed to load image dimensions:", e);
    }
  }

  function showUploadZone() {
    uploadZone.classList.remove("hidden");
    previewZone?.classList.add("hidden");
    convertBtnArea?.classList.remove("hidden");
    downloadArea?.classList.add("hidden");
    progressArea?.classList.add("hidden");
    convertBtn?.classList.add("opacity-50", "cursor-not-allowed");
    convertBtn?.setAttribute("disabled", "");
    originalWidth = 0;
    originalHeight = 0;
    if (originalSizeEl) originalSizeEl.textContent = "";
    if (widthInput) widthInput.value = "";
    if (heightInput) heightInput.value = "";
  }

  function showPreviewZone() {
    uploadZone.classList.add("hidden");
    previewZone?.classList.remove("hidden");
    convertBtnArea?.classList.remove("hidden");
    downloadArea?.classList.add("hidden");
    progressArea?.classList.add("hidden");
    convertBtn?.classList.remove("opacity-50", "cursor-not-allowed");
    convertBtn?.removeAttribute("disabled");

    fileCount.textContent = files.length === 1
      ? "1 file ready"
      : files.length + " files ready";

    renderPreviewGrid();
  }

  function renderPreviewGrid() {
    if (!previewGrid) return;
    previewGrid.innerHTML = "";

    files.forEach((file, i) => {
      const card = document.createElement("div");
      card.className = "relative rounded-lg border border-border-default bg-surface overflow-hidden";

      const imgWrapper = document.createElement("div");
      imgWrapper.className = "aspect-[4/3] bg-surface-subtle flex items-center justify-center overflow-hidden";

      const img = document.createElement("img");
      img.className = "w-full h-full object-contain";
      img.loading = "lazy";
      img.src = URL.createObjectURL(file);
      img.onload = () => URL.revokeObjectURL(img.src);

      imgWrapper.appendChild(img);

      const info = document.createElement("div");
      info.className = "px-3 py-2 border-t border-border-default";
      info.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-text-primary truncate max-w-[70%]">${file.name}</span>
          <span class="text-xs text-text-tertiary">${formatBytes(file.size)}</span>
        </div>
        <div class="flex items-center justify-between mt-1">
          <span class="text-xs text-text-tertiary">Resize</span>
          <button data-remove="${i}" class="text-xs text-danger hover:text-danger/80 font-medium transition-colors">Remove</button>
        </div>
      `;

      card.appendChild(imgWrapper);
      card.appendChild(info);
      previewGrid.appendChild(card);
    });

    // Remove handlers
    previewGrid.querySelectorAll("[data-remove]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.remove);
        files.splice(idx, 1);
        resizedBlobs.splice(idx, 1);
        if (files.length === 0) {
          showUploadZone();
        } else {
          renderPreviewGrid();
          fileCount.textContent = files.length === 1
            ? "1 file ready"
            : files.length + " files ready";
        }
      });
    });
  }

  async function resizeAll() {
    if (files.length === 0) return;

    const targetWidth = parseInt(widthInput?.value);
    const targetHeight = parseInt(heightInput?.value);

    if (!targetWidth || !targetHeight || targetWidth < 1 || targetHeight < 1) {
      alert("Please enter valid dimensions.");
      return;
    }

    if (targetWidth > 10000 || targetHeight > 10000) {
      alert("Maximum dimension is 10,000 pixels.");
      return;
    }

    convertBtn.classList.add("opacity-50", "cursor-not-allowed");
    convertBtn.setAttribute("disabled", "");
    progressArea?.classList.remove("hidden");
    downloadArea?.classList.add("hidden");
    resizedBlobs = [];

    const outputFormat = getOutputFormat(files);
    const outputMime = getOutputMime(outputFormat);

    for (let i = 0; i < files.length; i++) {
      const pct = Math.round(((i) / files.length) * 100);
      progressBar.style.width = pct + "%";
      progressText.textContent = `Resizing ${i + 1} of ${files.length}...`;

      try {
        const img = await loadImage(files[i]);
        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d");

        if (outputMime === "image/jpeg") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        const blob = await new Promise((resolve) => {
          canvas.toBlob((b) => resolve(b), outputMime, 0.92);
        });

        resizedBlobs.push({
          blob,
          name: replaceExtension(files[i].name, outputFormat),
          width: targetWidth,
          height: targetHeight,
          originalName: files[i].name,
          originalSize: files[i].size,
        });
      } catch (err) {
        console.error("Resize failed:", files[i].name, err);
        resizedBlobs.push({
          failed: true,
          name: files[i].name,
          error: err.message || "Resize failed",
        });
      }
    }

    progressBar.style.width = "100%";
    progressText.textContent = "Resize complete!";

    setTimeout(() => {
      progressArea?.classList.add("hidden");
      convertBtnArea?.classList.add("hidden");
      downloadArea?.classList.remove("hidden");
      renderDownloadArea();
    }, 500);
  }

  function renderDownloadArea() {
    if (!downloadArea) return;

    const successCount = resizedBlobs.filter((item) => item && !item.failed).length;
    const failCount = resizedBlobs.filter((item) => item && item.failed).length;

    let html = `
      <div class="p-4 rounded-xl border border-success/30 bg-success/5 mb-4">
        <div class="flex items-center gap-2 mb-2">
          <svg class="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-sm font-semibold text-success">${successCount} file${successCount !== 1 ? "s" : ""} resized!</span>
        </div>
        ${failCount > 0 ? `<p class="text-xs text-danger">${failCount} file${failCount !== 1 ? "s" : ""} failed</p>` : ""}
      </div>
    `;

    resizedBlobs.forEach((item, i) => {
      if (!item) return;
      if (item.failed) {
        html += `
          <div class="flex items-center justify-between p-3 rounded-lg border border-danger/30 bg-danger/5 mb-2">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center flex-shrink-0">
                <svg class="w-4 h-4 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <div class="min-w-0">
                <div class="text-xs font-medium text-text-primary truncate">${item.name}</div>
                <div class="text-xs text-danger">${item.error}</div>
              </div>
            </div>
          </div>
        `;
        return;
      }
      html += `
        <div class="flex items-center justify-between p-3 rounded-lg border border-border-default bg-surface mb-2">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/50 flex items-center justify-center flex-shrink-0">
              <svg class="w-4 h-4 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div class="min-w-0">
              <div class="text-xs font-medium text-text-primary truncate">${item.name}</div>
              <div class="text-xs text-text-tertiary">${formatBytes(item.blob.size)} · ${item.width}×${item.height}</div>
            </div>
          </div>
          <button data-download="${i}" class="btn-primary btn-sm flex-shrink-0 ml-3">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download
          </button>
        </div>
      `;
    });

    if (successCount > 1) {
      html += `
        <button id="download-all-btn" class="w-full btn-primary btn-lg justify-center mt-4">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
          </svg>
          Download ZIP (${successCount} files)
        </button>
      `;
    }

    html += `
      <p class="text-xs text-text-tertiary text-center mt-3">
        Resized locally in your browser · Your files never left your device
      </p>
      <button id="convert-more-btn" class="w-full btn-secondary btn-md justify-center mt-3">
        Resize More Files
      </button>
    `;

    downloadArea.innerHTML = html;

    // Bind download handlers
    downloadArea.querySelectorAll("[data-download]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.download);
        downloadBlob(resizedBlobs[idx].blob, resizedBlobs[idx].name);
      });
    });

    // Download ZIP
    downloadArea.querySelector("#download-all-btn")?.addEventListener("click", downloadAsZip);

    // Convert more
    downloadArea.querySelector("#convert-more-btn")?.addEventListener("click", () => {
      files = [];
      resizedBlobs = [];
      showUploadZone();
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
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function downloadAsZip() {
    const successItems = resizedBlobs.filter((item) => item && !item.failed);
    if (successItems.length === 0) return;

    if (successItems.length === 1) {
      downloadBlob(successItems[0].blob, successItems[0].name);
      return;
    }

    const zip = new JSZip();
    for (const item of successItems) {
      zip.file(item.name, item.blob);
    }
    const zipBlob = await zip.generateAsync({ type: "blob" });
    downloadBlob(zipBlob, "resized-images.zip");
  }
}
