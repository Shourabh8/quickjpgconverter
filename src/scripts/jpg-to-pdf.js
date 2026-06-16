/**
 * Client-side JPG to PDF converter using pdf-lib.
 * Converts JPG/PNG/WebP images to PDF documents.
 *
 * Usage: initJpgToPdf()
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

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "heic", "heif"];

function isImageFile(f) {
  if (f.type.startsWith("image/")) return true;
  const ext = getExtension(f.name);
  return IMAGE_EXTENSIONS.includes(ext);
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

async function fileToBytes(file) {
  return new Uint8Array(await file.arrayBuffer());
}

export function initJpgToPdf() {
  let files = [];

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

  if (!dropArea || !uploadZone) return;

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
    showUploadZone();
  });

  // --- Convert ---
  convertBtn?.addEventListener("click", () => {
    convertToPdf();
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
          <span class="text-xs text-text-tertiary">Page ${i + 1}</span>
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

  async function convertToPdf() {
    if (files.length === 0) return;

    convertBtn.classList.add("opacity-50", "cursor-not-allowed");
    convertBtn.setAttribute("disabled", "");
    progressArea?.classList.remove("hidden");
    downloadArea?.classList.add("hidden");

    try {
      // Dynamic import pdf-lib from CDN
      const { PDFDocument } = await import("https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm");

      const pdfDoc = await PDFDocument.create();

      for (let i = 0; i < files.length; i++) {
        const pct = Math.round(((i) / files.length) * 100);
        progressBar.style.width = pct + "%";
        progressText.textContent = `Adding page ${i + 1} of ${files.length}...`;

        try {
          const img = await loadImage(files[i]);
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);

          const ext = getExtension(files[i].name);
          let imgBytes;

          if (ext === "png") {
            imgBytes = new Uint8Array(await new Promise((resolve) => {
              canvas.toBlob((blob) => blob.arrayBuffer().then(resolve), "image/png");
            }));
            const pngImage = await pdfDoc.embedPng(imgBytes);
            const page = pdfDoc.addPage([img.naturalWidth, img.naturalHeight]);
            page.drawImage(pngImage, {
              x: 0,
              y: 0,
              width: img.naturalWidth,
              height: img.naturalHeight,
            });
          } else {
            imgBytes = new Uint8Array(await new Promise((resolve) => {
              canvas.toBlob((blob) => blob.arrayBuffer().then(resolve), "image/jpeg", 0.95);
            }));
            const jpgImage = await pdfDoc.embedJpg(imgBytes);
            const page = pdfDoc.addPage([img.naturalWidth, img.naturalHeight]);
            page.drawImage(jpgImage, {
              x: 0,
              y: 0,
              width: img.naturalWidth,
              height: img.naturalHeight,
            });
          }
        } catch (err) {
          console.error("Failed to add page:", files[i].name, err);
        }
      }

      progressBar.style.width = "100%";
      progressText.textContent = "Creating PDF...";

      const pdfBytes = await pdfDoc.save();
      const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });

      setTimeout(() => {
        progressArea?.classList.add("hidden");
        convertBtnArea?.classList.add("hidden");
        downloadArea?.classList.remove("hidden");
        renderDownloadArea(pdfBlob);
      }, 500);

    } catch (err) {
      console.error("PDF conversion failed:", err);
      progressText.textContent = "Conversion failed. Please try again.";
      progressBar.style.width = "0%";
      convertBtn?.classList.remove("opacity-50", "cursor-not-allowed");
      convertBtn?.removeAttribute("disabled");
    }
  }

  function renderDownloadArea(pdfBlob) {
    if (!downloadArea) return;

    const totalPages = files.length;
    const totalOriginalSize = files.reduce((sum, f) => sum + f.size, 0);
    const pdfName = files.length === 1
      ? replaceExtension(files[0].name, "pdf")
      : "images.pdf";

    let html = `
      <div class="p-4 rounded-xl border border-success/30 bg-success/5 mb-4">
        <div class="flex items-center gap-2 mb-2">
          <svg class="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-sm font-semibold text-success">PDF created!</span>
        </div>
        <p class="text-xs text-text-secondary">${formatBytes(totalOriginalSize)} → ${formatBytes(pdfBlob.size)} · ${totalPages} page${totalPages !== 1 ? "s" : ""}</p>
      </div>

      <div class="flex items-center justify-between p-3 rounded-lg border border-border-default bg-surface mb-2">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/50 flex items-center justify-center flex-shrink-0">
            <svg class="w-4 h-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <div class="min-w-0">
            <div class="text-xs font-medium text-text-primary truncate">${pdfName}</div>
            <div class="text-xs text-text-tertiary">${formatBytes(totalOriginalSize)} → ${formatBytes(pdfBlob.size)} · ${totalPages} pages</div>
          </div>
        </div>
        <button id="download-pdf-btn" class="btn-primary btn-sm flex-shrink-0 ml-3">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Download PDF
        </button>
      </div>

      <p class="text-xs text-text-tertiary text-center mt-3">
        Created locally in your browser · Your files never left your device
      </p>
      <button id="convert-more-btn" class="w-full btn-secondary btn-md justify-center mt-3">
        Convert More Files
      </button>
    `;

    downloadArea.innerHTML = html;

    // Download handler
    downloadArea.querySelector("#download-pdf-btn")?.addEventListener("click", () => {
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = pdfName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });

    // Convert more
    downloadArea.querySelector("#convert-more-btn")?.addEventListener("click", () => {
      files = [];
      showUploadZone();
    });
  }

  function replaceExtension(filename, newExt) {
    const base = filename.substring(0, filename.lastIndexOf("."));
    return base + "." + newExt;
  }
}
