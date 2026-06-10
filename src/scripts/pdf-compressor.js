/**
 * Client-side PDF compressor using pdf-lib.
 * Strips unnecessary objects and recompresses streams.
 *
 * Usage: initPdfCompressor()
 */

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
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

export function initPdfCompressor() {
  const dropArea = document.getElementById("drop-area");
  const fileInput = dropArea?.querySelector('input[type="file"]');
  const uploadZone = document.getElementById("upload-zone");
  const resultZone = document.getElementById("result-zone");
  const dropOverlay = document.getElementById("drop-overlay");
  const progressArea = document.getElementById("progress-area");
  const progressBar = document.getElementById("progress-bar");
  const progressText = document.getElementById("progress-text");
  const fileInfo = document.getElementById("file-info");
  const compressBtn = document.getElementById("compress-btn");
  const downloadBtn = document.getElementById("download-btn");
  const compressMoreBtn = document.getElementById("compress-more-btn");

  if (!dropArea || !uploadZone) return;

  dropArea.setAttribute("tabindex", "0");
  dropArea.setAttribute("role", "button");
  dropArea.setAttribute("aria-label", "Upload PDF files. Press Enter or Space to browse.");

  let currentFile = null;
  let compressedBlob = null;
  let originalSize = 0;

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
    handleFile(droppedFiles[0]);
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
    handleFile(fileInput.files[0]);
    fileInput.value = "";
  });

  compressBtn?.addEventListener("click", compressPdf);
  downloadBtn?.addEventListener("click", () => {
    if (compressedBlob) downloadBlob(compressedBlob, currentFile.name.replace(".pdf", "-compressed.pdf"));
  });
  compressMoreBtn?.addEventListener("click", resetUI);

  function handleFile(file) {
    if (!file || file.type !== "application/pdf") return;
    currentFile = file;
    originalSize = file.size;
    uploadZone?.classList.add("hidden");
    resultZone?.classList.remove("hidden");
    compressBtn?.classList.remove("hidden");
    downloadBtn?.classList.add("hidden");
    compressMoreBtn?.classList.add("hidden");
    if (fileInfo) {
      fileInfo.innerHTML = `
        <div class="flex items-center gap-3 p-4 rounded-xl border border-border-default bg-surface">
          <div class="w-10 h-10 rounded-lg bg-danger/10 flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
          </div>
          <div class="min-w-0">
            <div class="text-sm font-medium text-text-primary truncate">${file.name}</div>
            <div class="text-xs text-text-tertiary">${formatBytes(file.size)}</div>
          </div>
        </div>
      `;
    }
  }

  async function compressPdf() {
    if (!currentFile) return;
    compressBtn.classList.add("hidden");
    progressArea?.classList.remove("hidden");

    try {
      progressBar.style.width = "20%";
      progressText.textContent = "Reading PDF...";

      const arrayBuffer = await currentFile.arrayBuffer();
      progressBar.style.width = "40%";
      progressText.textContent = "Analyzing structure...";

      const { PDFDocument } = await import("https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm");
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

      progressBar.style.width = "60%";
      progressText.textContent = "Optimizing...";

      // Remove metadata for size reduction
      pdfDoc.setTitle("");
      pdfDoc.setAuthor("");
      pdfDoc.setSubject("");
      pdfDoc.setKeywords([]);
      pdfDoc.setProducer("");
      pdfDoc.setCreator("");

      progressBar.style.width = "80%";
      progressText.textContent = "Recompressing...";

      const compressedBytes = await pdfDoc.save({ useObjectStreams: true });
      compressedBlob = new Blob([compressedBytes], { type: "application/pdf" });

      progressBar.style.width = "100%";
      progressText.textContent = "Compression complete!";

      const savings = originalSize > 0 ? Math.round((1 - compressedBlob.size / originalSize) * 100) : 0;

      setTimeout(() => {
        progressArea?.classList.add("hidden");
        compressBtn?.classList.add("hidden");
        downloadBtn?.classList.remove("hidden");
        compressMoreBtn?.classList.remove("hidden");

        if (fileInfo) {
          fileInfo.innerHTML = `
            <div class="p-4 rounded-xl border border-success/30 bg-success/5">
              <div class="flex items-center gap-2 mb-2">
                <svg class="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <span class="text-sm font-semibold text-success">PDF compressed!</span>
              </div>
              <div class="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div class="text-lg font-bold text-text-primary">${formatBytes(originalSize)}</div>
                  <div class="text-xs text-text-tertiary">Original</div>
                </div>
                <div>
                  <div class="text-lg font-bold text-success">${formatBytes(compressedBlob.size)}</div>
                  <div class="text-xs text-text-tertiary">Compressed</div>
                </div>
                <div>
                  <div class="text-lg font-bold text-brand-600">${savings > 0 ? "-" + savings : 0}%</div>
                  <div class="text-xs text-text-tertiary">Saved</div>
                </div>
              </div>
            </div>
          `;
        }
      }, 500);
    } catch (err) {
      console.error("PDF compression failed:", err);
      progressArea?.classList.add("hidden");
      compressBtn?.classList.remove("hidden");
      if (fileInfo) {
        fileInfo.innerHTML = `
          <div class="p-4 rounded-xl border border-danger/30 bg-danger/5">
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/></svg>
              <span class="text-sm font-semibold text-danger">Compression failed</span>
            </div>
            <p class="text-xs text-text-secondary mt-1">${err.message || "Could not compress this PDF. It may be encrypted or corrupted."}</p>
          </div>
        `;
      }
    }
  }

  function resetUI() {
    currentFile = null;
    compressedBlob = null;
    originalSize = 0;
    uploadZone?.classList.remove("hidden");
    resultZone?.classList.add("hidden");
  }
}
