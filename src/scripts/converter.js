/**
 * Client-side image converter using Canvas API.
 * Supports: JPG→PNG, PNG→JPG, JPG→WebP, WebP→JPG, AVIF→JPG/PNG, JPG/PNG→AVIF
 *
 * Usage: initConverter({ targetFormat: 'png', targetExt: 'png', targetMime: 'image/png' })
 */

const QUALITY_MAP = {
  "quality-high": 0.92,
  "quality-balanced": 0.80,
  "quality-small": 0.60,
};

const FORMAT_INFO = {
  png: { label: "PNG", desc: "Lossless · Transparency · ~3-5× larger" },
  jpg: { label: "JPG", desc: "Lossy · Universal · Smaller files" },
  webp: { label: "WebP", desc: "Modern · 25-35% smaller · Fast" },
  avif: { label: "AVIF", desc: "Next-gen · 50% smaller · Best compression" },
};

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

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "heic", "heif", "avif"];

function isImageFile(f) {
  if (f.type.startsWith("image/")) return true;
  const ext = getExtension(f.name);
  return IMAGE_EXTENSIONS.includes(ext);
}

function replaceExtension(filename, newExt) {
  const base = filename.substring(0, filename.lastIndexOf("."));
  return base + "." + newExt;
}

let heic2anyPromise = null;
function loadHeic2Any() {
  if (typeof window === "undefined") return Promise.reject(new Error("Window not available"));
  if (window.heic2any) return Promise.resolve(window.heic2any);
  if (heic2anyPromise) return heic2anyPromise;

  heic2anyPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js";
    script.onload = () => resolve(window.heic2any);
    script.onerror = () => reject(new Error("Failed to load HEIC decoder module"));
    document.head.appendChild(script);
  });
  return heic2anyPromise;
}

function loadImage(fileOrBlob) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(fileOrBlob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to decode image data"));
    };
    img.src = url;
  });
}

async function loadFileAsImage(file) {
  const isHeic = /\.(heic|heif)$/i.test(file.name) || file.type === "image/heic" || file.type === "image/heif";
  if (isHeic) {
    try {
      // Try native browser decode first (e.g., Safari on Apple devices)
      return await loadImage(file);
    } catch {
      // Decode via heic2any for Windows, Chrome, Firefox, Edge, Android
      const heic2any = await loadHeic2Any();
      const res = await heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: 0.95,
      });
      const jpegBlob = Array.isArray(res) ? res[0] : res;
      return await loadImage(jpegBlob);
    }
  }
  return await loadImage(file);
}

function imageToBlob(img, mime, quality) {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (mime === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0);
    canvas.toBlob((blob) => resolve(blob), mime, quality);
  });
}

export function initConverter(config) {
  const { targetFormat, targetExt, targetMime } = config;

  let files = [];
  let convertedBlobs = [];

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
  const downloadAllBtn = document.getElementById("download-all-btn");
  const dropOverlay = document.getElementById("drop-overlay");
  const progressArea = document.getElementById("progress-area");
  const progressBar = document.getElementById("progress-bar");
  const progressText = document.getElementById("progress-text");

  if (!dropArea || !uploadZone) return;

  // --- Keyboard accessibility for drop zone ---
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
    convertedBlobs = [];
    showUploadZone();
  });

  // --- Convert ---
  convertBtn?.addEventListener("click", () => {
    convertAll();
  });

  // --- Download all ---
  downloadAllBtn?.addEventListener("click", () => {
    downloadAll();
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
    convertedBlobs = [];

    if (files.length > 0) {
      showPreviewZone();
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
          <span class="text-xs text-text-tertiary">→ ${targetFormat.toUpperCase()}</span>
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
        convertedBlobs.splice(idx, 1);
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

  async function convertAll() {
    if (files.length === 0) return;

    convertBtn.classList.add("opacity-50", "cursor-not-allowed");
    convertBtn.setAttribute("disabled", "");
    progressArea?.classList.remove("hidden");
    downloadArea?.classList.add("hidden");
    convertedBlobs = [];

    const quality = QUALITY_MAP[
      document.querySelector('input[name="quality"]:checked')?.value || "quality-high"
    ];

    for (let i = 0; i < files.length; i++) {
      const pct = Math.round(((i) / files.length) * 100);
      progressBar.style.width = pct + "%";
      progressText.textContent = `Converting ${i + 1} of ${files.length}...`;

      try {
        const isHeic = /\.(heic|heif)$/i.test(files[i].name) || files[i].type === "image/heic" || files[i].type === "image/heif";
        if (isHeic) {
          progressText.textContent = `Decoding HEIC ${i + 1} of ${files.length}...`;
        }
        const img = await loadFileAsImage(files[i]);
        const blob = await imageToBlob(img, targetMime, quality);
        convertedBlobs.push({
          blob,
          name: replaceExtension(files[i].name, targetExt),
          width: img.naturalWidth,
          height: img.naturalHeight,
          originalName: files[i].name,
          originalSize: files[i].size,
        });
      } catch (err) {
        console.error("Conversion failed:", files[i].name, err);
        convertedBlobs.push({
          failed: true,
          name: files[i].name,
          error: err.message || "Conversion failed. Please try a different image.",
        });
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

    const successCount = convertedBlobs.filter((item) => item && !item.failed).length;
    const failCount = convertedBlobs.filter((item) => item && item.failed).length;

    let html = `
      <div class="p-4 rounded-xl border border-success/30 bg-success/5 mb-4">
        <div class="flex items-center gap-2 mb-2">
          <svg class="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-sm font-semibold text-success">${successCount} file${successCount !== 1 ? "s" : ""} converted!</span>
        </div>
        ${failCount > 0 ? `<p class="text-xs text-danger">${failCount} file${failCount !== 1 ? "s" : ""} failed</p>` : ""}
      </div>
    `;

    convertedBlobs.forEach((item, i) => {
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
              <div class="text-xs text-text-tertiary">${formatBytes(item.originalSize)} → ${formatBytes(item.blob.size)} · ${item.originalSize > item.blob.size ? "saved " + Math.round((1 - item.blob.size / item.originalSize) * 100) + "%" : "converted"} · ${item.width}×${item.height}</div>
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
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Download All (${successCount} files as ZIP)
        </button>
      `;
    }

    html += `
      <p class="text-xs text-text-tertiary text-center mt-3">
        Converted locally in your browser · Your files never left your device
      </p>
      <button id="convert-more-btn" class="w-full btn-secondary btn-md justify-center mt-3">
        Convert More Files
      </button>
    `;

    downloadArea.innerHTML = html;

    // Bind download handlers
    downloadArea.querySelectorAll("[data-download]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.download);
        downloadBlob(convertedBlobs[idx].blob, convertedBlobs[idx].name);
      });
    });

    // Download all
    downloadArea.querySelector("#download-all-btn")?.addEventListener("click", downloadAll);

    // Convert more
    downloadArea.querySelector("#convert-more-btn")?.addEventListener("click", () => {
      files = [];
      convertedBlobs = [];
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

  async function downloadAll() {
    const items = convertedBlobs.filter((item) => item && !item.failed);
    if (items.length === 0) return;
    const { default: JSZip } = await import("https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm");
    const zip = new JSZip();
    items.forEach((item) => zip.file(item.name, item.blob));
    const content = await zip.generateAsync({ type: "blob" });
    downloadBlob(content, "converted-images.zip");
  }
}
