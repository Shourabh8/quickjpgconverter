/**
 * Client-side PDF to JPG/PNG converter using PDF.js.
 * Renders PDF pages to Canvas and exports as images.
 *
 * Usage: initPdfConverter({ targetFormat: 'jpeg', targetExt: 'jpg', targetMime: 'image/jpeg' })
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

const PDF_MIME = "application/pdf";

function isPdfFile(f) {
  return f.type === PDF_MIME || getExtension(f.name) === "pdf";
}

const QUALITY_MAP = {
  "quality-high": 0.92,
  "quality-balanced": 0.80,
  "quality-small": 0.60,
};

export function initPdfConverter(config) {
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

  // --- Keyboard accessibility ---
  dropArea.setAttribute("tabindex", "0");
  dropArea.setAttribute("role", "button");
  dropArea.setAttribute("aria-label", "Upload PDF files. Press Enter or Space to browse.");

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
      if (f.size > 100 * 1024 * 1024) {
        alert(f.name + " exceeds 100MB limit.");
        return false;
      }
      if (!isPdfFile(f)) {
        alert(f.name + " is not a PDF file.");
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

      const pdfIcon = document.createElement("div");
      pdfIcon.className = "flex flex-col items-center gap-2";
      pdfIcon.innerHTML = `
        <svg class="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <span class="text-xs text-text-tertiary">PDF Document</span>
      `;
      imgWrapper.appendChild(pdfIcon);

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

    // Dynamic import PDF.js from CDN
    const pdfjsLib = await import("https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/+esm");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs";

    for (let i = 0; i < files.length; i++) {
      try {
        const arrayBuffer = await files[i].arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const totalPages = pdf.numPages;

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          const pct = Math.round(((i + (pageNum / totalPages)) / files.length) * 100);
          progressBar.style.width = pct + "%";
          progressText.textContent = `Converting ${files[i].name} - page ${pageNum} of ${totalPages}...`;

          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 2.0 });

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d");

          await page.render({ canvasContext: ctx, viewport }).promise;

          const blob = await new Promise((resolve) => {
            canvas.toBlob(resolve, targetMime, quality);
          });

          const outputName = totalPages === 1
            ? replaceExtension(files[i].name, targetExt)
            : replaceExtension(files[i].name, "") + `_page${pageNum}.${targetExt}`;

          convertedBlobs.push({
            blob,
            name: outputName,
            width: viewport.width,
            height: viewport.height,
            originalName: files[i].name,
            originalSize: files[i].size,
            page: pageNum,
            totalPages,
          });
        }
      } catch (err) {
        console.error("Conversion failed:", files[i].name, err);
        convertedBlobs.push({
          failed: true,
          name: files[i].name,
          error: err.message || "Failed to convert PDF. The file may be corrupted or password-protected.",
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
          <span class="text-sm font-semibold text-success">${successCount} image${successCount !== 1 ? "s" : ""} extracted!</span>
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
              <div class="text-xs text-text-tertiary">${formatBytes(item.blob.size)} · ${item.width}×${item.height}${item.totalPages > 1 ? ` · Page ${item.page}/${item.totalPages}` : ""}</div>
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
          Download All (${successCount} images)
        </button>
      `;
    }

    html += `
      <p class="text-xs text-text-tertiary text-center mt-3">
        Processed locally in your browser · Your files never left your device
      </p>
      <button id="convert-more-btn" class="w-full btn-secondary btn-md justify-center mt-3">
        Convert More PDFs
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
    for (const item of convertedBlobs) {
      if (item) {
        downloadBlob(item.blob, item.name);
        await new Promise((r) => setTimeout(r, 200));
      }
    }
  }
}
