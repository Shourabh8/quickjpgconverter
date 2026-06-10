/**
 * Client-side PDF enhancer using PDF.js and Canvas API.
 * Renders PDF pages, applies enhancements, and creates new PDF.
 *
 * Usage: initPdfEnhancer()
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

function sharpenKernel(amount) {
  const a = amount;
  return [0, -a, 0, -a, 1 + 4 * a, -a, 0, -a, 0];
}

function applyConvolution(imageData, kernel, width, height) {
  const src = imageData.data;
  const dst = new Uint8ClampedArray(src.length);
  const kSize = 3;
  const half = 1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0;
      for (let ky = 0; ky < kSize; ky++) {
        for (let kx = 0; kx < kSize; kx++) {
          const px = Math.min(width - 1, Math.max(0, x + kx - half));
          const py = Math.min(height - 1, Math.max(0, y + ky - half));
          const idx = (py * width + px) * 4;
          const kVal = kernel[ky * kSize + kx];
          r += src[idx] * kVal;
          g += src[idx + 1] * kVal;
          b += src[idx + 2] * kVal;
        }
      }
      const idx = (y * width + x) * 4;
      dst[idx] = Math.min(255, Math.max(0, r));
      dst[idx + 1] = Math.min(255, Math.max(0, g));
      dst[idx + 2] = Math.min(255, Math.max(0, b));
      dst[idx + 3] = src[idx + 3];
    }
  }
  return new ImageData(dst, width, height);
}

function applyEnhancements(ctx, width, height, settings) {
  if (settings.sharpness > 0) {
    let imageData = ctx.getImageData(0, 0, width, height);
    const kernel = sharpenKernel(settings.sharpness / 100);
    imageData = applyConvolution(imageData, kernel, width, height);
    ctx.putImageData(imageData, 0, 0);
  }
}

export function initPdfEnhancer() {
  const dropArea = document.getElementById("drop-area");
  const fileInput = dropArea?.querySelector('input[type="file"]');
  const uploadZone = document.getElementById("upload-zone");
  const resultZone = document.getElementById("result-zone");
  const dropOverlay = document.getElementById("drop-overlay");
  const progressArea = document.getElementById("progress-area");
  const progressBar = document.getElementById("progress-bar");
  const progressText = document.getElementById("progress-text");
  const fileInfo = document.getElementById("file-info");
  const enhanceBtn = document.getElementById("enhance-btn");
  const downloadBtn = document.getElementById("download-btn");
  const enhanceMoreBtn = document.getElementById("enhance-more-btn");

  if (!dropArea || !uploadZone) return;

  dropArea.setAttribute("tabindex", "0");
  dropArea.setAttribute("role", "button");
  dropArea.setAttribute("aria-label", "Upload PDF files. Press Enter or Space to browse.");

  let currentFile = null;
  let enhancedBlob = null;
  let originalSize = 0;

  const sliders = {
    brightness: document.getElementById("brightness"),
    contrast: document.getElementById("contrast"),
    saturation: document.getElementById("saturation"),
    sharpness: document.getElementById("sharpness"),
  };

  const sliderValues = {
    brightness: document.getElementById("brightness-value"),
    contrast: document.getElementById("contrast-value"),
    saturation: document.getElementById("saturation-value"),
    sharpness: document.getElementById("sharpness-value"),
  };

  const grayscaleCheck = document.getElementById("grayscale");
  const sepiaCheck = document.getElementById("sepia");

  function getSettings() {
    return {
      brightness: sliders.brightness ? parseInt(sliders.brightness.value) : 100,
      contrast: sliders.contrast ? parseInt(sliders.contrast.value) : 100,
      saturation: sliders.saturation ? parseInt(sliders.saturation.value) : 100,
      sharpness: sliders.sharpness ? parseInt(sliders.sharpness.value) : 0,
      grayscale: grayscaleCheck?.checked || false,
      sepia: sepiaCheck?.checked || false,
    };
  }

  function updateSliderLabels() {
    if (sliderValues.brightness) sliderValues.brightness.textContent = sliders.brightness?.value + "%";
    if (sliderValues.contrast) sliderValues.contrast.textContent = sliders.contrast?.value + "%";
    if (sliderValues.saturation) sliderValues.saturation.textContent = sliders.saturation?.value + "%";
    if (sliderValues.sharpness) sliderValues.sharpness.textContent = sliders.sharpness?.value + "%";
  }

  Object.values(sliders).forEach((s) => {
    s?.addEventListener("input", updateSliderLabels);
  });

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
    handleFile(Array.from(e.dataTransfer.files)[0]);
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

  enhanceBtn?.addEventListener("click", enhancePdf);
  downloadBtn?.addEventListener("click", () => {
    if (enhancedBlob) downloadBlob(enhancedBlob, currentFile.name.replace(".pdf", "-enhanced.pdf"));
  });
  enhanceMoreBtn?.addEventListener("click", resetUI);

  function handleFile(file) {
    if (!file || file.type !== "application/pdf") return;
    currentFile = file;
    originalSize = file.size;
    uploadZone?.classList.add("hidden");
    resultZone?.classList.remove("hidden");
    enhanceBtn?.classList.remove("hidden");
    downloadBtn?.classList.add("hidden");
    enhanceMoreBtn?.classList.add("hidden");
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

  async function enhancePdf() {
    if (!currentFile) return;
    enhanceBtn.classList.add("hidden");
    progressArea?.classList.remove("hidden");

    const settings = getSettings();

    try {
      progressBar.style.width = "10%";
      progressText.textContent = "Reading PDF...";

      const arrayBuffer = await currentFile.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      progressBar.style.width = "20%";
      progressText.textContent = "Loading PDF.js...";

      const pdfjsLib = await import("https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/+esm");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs";

      const pdf = await pdfjsLib.getDocument({ data: uint8Array.slice() }).promise;
      const numPages = pdf.numPages;

      progressBar.style.width = "30%";
      progressText.textContent = `Processing ${numPages} pages...`;

      const { PDFDocument } = await import("https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm");
      const newPdfDoc = await PDFDocument.create();

      for (let i = 1; i <= numPages; i++) {
        const pagePct = Math.round(30 + (i / numPages) * 60);
        progressBar.style.width = pagePct + "%";
        progressText.textContent = `Enhancing page ${i} of ${numPages}...`;

        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");

        await page.render({ canvasContext: ctx, viewport }).promise;

        ctx.filter = `brightness(${settings.brightness}%) contrast(${settings.contrast}%) saturate(${settings.saturation}%)`;
        if (settings.grayscale) ctx.filter += " grayscale(100%)";
        if (settings.sepia) ctx.filter += " sepia(100%)";

        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = viewport.width;
        tempCanvas.height = viewport.height;
        const tempCtx = tempCanvas.getContext("2d");
        tempCtx.drawImage(canvas, 0, 0);

        ctx.clearRect(0, 0, viewport.width, viewport.height);
        ctx.drawImage(tempCanvas, 0, 0);

        applyEnhancements(ctx, viewport.width, viewport.height, settings);

        const jpegDataUrl = canvas.toDataURL("image/jpeg", 0.92);
        const jpegBytes = Uint8Array.from(atob(jpegDataUrl.split(",")[1]), (c) => c.charCodeAt(0));

        const image = await newPdfDoc.embedJpg(jpegBytes);
        const newPage = newPdfDoc.addPage([viewport.width, viewport.height]);
        newPage.drawImage(image, { x: 0, y: 0, width: viewport.width, height: viewport.height });
      }

      progressBar.style.width = "95%";
      progressText.textContent = "Finalizing...";

      const enhancedBytes = await newPdfDoc.save();
      enhancedBlob = new Blob([enhancedBytes], { type: "application/pdf" });

      progressBar.style.width = "100%";
      progressText.textContent = "Enhancement complete!";

      setTimeout(() => {
        progressArea?.classList.add("hidden");
        enhanceBtn?.classList.add("hidden");
        downloadBtn?.classList.remove("hidden");
        enhanceMoreBtn?.classList.remove("hidden");

        if (fileInfo) {
          fileInfo.innerHTML = `
            <div class="p-4 rounded-xl border border-success/30 bg-success/5">
              <div class="flex items-center gap-2 mb-2">
                <svg class="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <span class="text-sm font-semibold text-success">PDF enhanced!</span>
              </div>
              <div class="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div class="text-lg font-bold text-text-primary">${formatBytes(originalSize)}</div>
                  <div class="text-xs text-text-tertiary">Original</div>
                </div>
                <div>
                  <div class="text-lg font-bold text-success">${formatBytes(enhancedBlob.size)}</div>
                  <div class="text-xs text-text-tertiary">Enhanced</div>
                </div>
              </div>
            </div>
          `;
        }
      }, 500);
    } catch (err) {
      console.error("PDF enhancement failed:", err);
      progressArea?.classList.add("hidden");
      enhanceBtn?.classList.remove("hidden");
      if (fileInfo) {
        fileInfo.innerHTML = `
          <div class="p-4 rounded-xl border border-danger/30 bg-danger/5">
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/></svg>
              <span class="text-sm font-semibold text-danger">Enhancement failed</span>
            </div>
            <p class="text-xs text-text-secondary mt-1">${err.message || "Could not enhance this PDF. It may be encrypted or corrupted."}</p>
          </div>
        `;
      }
    }
  }

  function resetUI() {
    currentFile = null;
    enhancedBlob = null;
    originalSize = 0;
    uploadZone?.classList.remove("hidden");
    resultZone?.classList.add("hidden");
  }
}
