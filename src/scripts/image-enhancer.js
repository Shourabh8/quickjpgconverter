/**
 * Client-side image enhancer using Canvas API.
 * Supports: Brightness, Contrast, Saturation, Sharpness, Blur, Grayscale, Sepia
 *
 * Usage: initImageEnhancer()
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

const SUPPORTED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "bmp", "gif"];

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

function isSupported(f) {
  if (f.type.startsWith("image/")) return true;
  const ext = getExtension(f.name);
  return SUPPORTED_EXTENSIONS.includes(ext);
}

// ADDED: Red error banner with auto-dismiss and X button
function showErrorBanner(message, container) {
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

  if (container) {
    container.prepend(banner);
  } else {
    document.body.prepend(banner);
  }

  banner.querySelector(".error-banner-close")?.addEventListener("click", () => {
    banner.remove();
  });

  setTimeout(() => {
    if (banner.parentNode) {
      banner.style.transition = "opacity 0.3s ease";
      banner.style.opacity = "0";
      setTimeout(() => banner.remove(), 300);
    }
  }, 5000);
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
  return [
    0, -a, 0,
    -a, 1 + 4 * a, -a,
    0, -a, 0
  ];
}

function applyConvolution(imageData, kernel, width, height) {
  const src = imageData.data;
  const dst = new Uint8ClampedArray(src.length);
  const kSize = 3;
  const half = Math.floor(kSize / 2);

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

export function initImageEnhancer() {
  const dropArea = document.getElementById("drop-area");
  const fileInput = dropArea?.querySelector('input[type="file"]');
  const uploadZone = document.getElementById("upload-zone");
  const previewZone = document.getElementById("preview-zone");
  const previewGrid = document.getElementById("preview-grid");
  const fileCount = document.getElementById("file-count");
  const clearBtn = document.getElementById("clear-btn");
  const enhanceBtn = document.getElementById("enhance-btn");
  const downloadArea = document.getElementById("download-area");
  const dropOverlay = document.getElementById("drop-overlay");
  const progressArea = document.getElementById("progress-area");
  const progressBar = document.getElementById("progress-bar");
  const progressText = document.getElementById("progress-text");
  const canvasPreview = document.getElementById("canvas-preview");
  const resetBtn = document.getElementById("reset-btn");

  if (!dropArea || !uploadZone) return;

  dropArea.setAttribute("tabindex", "0");
  dropArea.setAttribute("role", "button");
  dropArea.setAttribute("aria-label", "Upload image files. Press Enter or Space to browse.");

  let files = [];
  let currentFile = null;
  let originalImage = null;

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

  function resetSettings() {
    if (sliders.brightness) sliders.brightness.value = 100;
    if (sliders.contrast) sliders.contrast.value = 100;
    if (sliders.saturation) sliders.saturation.value = 100;
    if (sliders.sharpness) sliders.sharpness.value = 0;
    if (grayscaleCheck) grayscaleCheck.checked = false;
    if (sepiaCheck) sepiaCheck.checked = false;
    updateSliderLabels();
    if (originalImage) renderPreview();
  }

  function updateSliderLabels() {
    if (sliderValues.brightness) sliderValues.brightness.textContent = sliders.brightness?.value + "%";
    if (sliderValues.contrast) sliderValues.contrast.textContent = sliders.contrast?.value + "%";
    if (sliderValues.saturation) sliderValues.saturation.textContent = sliders.saturation?.value + "%";
    if (sliderValues.sharpness) sliderValues.sharpness.textContent = sliders.sharpness?.value + "%";
  }

  Object.values(sliders).forEach((s) => {
    s?.addEventListener("input", () => {
      updateSliderLabels();
      if (originalImage) renderPreview();
    });
  });

  [grayscaleCheck, sepiaCheck].forEach((el) => {
    el?.addEventListener("change", () => {
      if (originalImage) renderPreview();
    });
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

  clearBtn?.addEventListener("click", resetUI);
  resetBtn?.addEventListener("click", resetSettings);
  enhanceBtn?.addEventListener("click", enhanceImage);

  async function handleFile(file) {
    // ADDED: file size validation + unsupported file error banner
    if (!file) return;
    if (!isSupported(file)) {
      const ext = getExtension(file.name);
      showErrorBanner(
        "Unsupported file: ." + ext + " — This tool accepts: JPG, JPEG, PNG, WebP, BMP, GIF. Browse our other tools for ." + ext + " files.",
        uploadZone
      );
      return;
    }
    if (!validateFileSize(file)) {
      showFileSizeError(file, uploadZone);
      return;
    }
    currentFile = file;
    try {
      originalImage = await loadImage(file);
      uploadZone?.classList.add("hidden");
      previewZone?.classList.remove("hidden");
      enhanceBtn?.classList.remove("hidden");
      downloadArea?.classList.add("hidden");
      if (fileCount) fileCount.textContent = file.name;
      renderPreview();
    } catch (err) {
      console.error(err);
    }
  }

  function renderPreview() {
    if (!canvasPreview || !originalImage) return;
    const ctx = canvasPreview.getContext("2d");
    const settings = getSettings();

    let { naturalWidth, naturalHeight } = originalImage;
    const maxPreview = 600;
    if (naturalWidth > maxPreview || naturalHeight > maxPreview) {
      const ratio = Math.min(maxPreview / naturalWidth, maxPreview / naturalHeight);
      naturalWidth = Math.round(naturalWidth * ratio);
      naturalHeight = Math.round(naturalHeight * ratio);
    }

    canvasPreview.width = naturalWidth;
    canvasPreview.height = naturalHeight;

    ctx.filter = `brightness(${settings.brightness}%) contrast(${settings.contrast}%) saturate(${settings.saturation}%)`;
    if (settings.grayscale) ctx.filter += " grayscale(100%)";
    if (settings.sepia) ctx.filter += " sepia(100%)";

    ctx.drawImage(originalImage, 0, 0, naturalWidth, naturalHeight);

    if (settings.sharpness > 0) {
      let imageData = ctx.getImageData(0, 0, naturalWidth, naturalHeight);
      const kernel = sharpenKernel(settings.sharpness / 100);
      imageData = applyConvolution(imageData, kernel, naturalWidth, naturalHeight);
      ctx.putImageData(imageData, 0, 0);
    }
  }

  function applyEnhancements(img, settings) {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");

      ctx.filter = `brightness(${settings.brightness}%) contrast(${settings.contrast}%) saturate(${settings.saturation}%)`;
      if (settings.grayscale) ctx.filter += " grayscale(100%)";
      if (settings.sepia) ctx.filter += " sepia(100%)";

      ctx.drawImage(img, 0, 0);

      if (settings.sharpness > 0) {
        let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const kernel = sharpenKernel(settings.sharpness / 100);
        imageData = applyConvolution(imageData, kernel, canvas.width, canvas.height);
        ctx.putImageData(imageData, 0, 0);
      }

      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  }

  async function enhanceImage() {
    if (!currentFile || !originalImage) return;
    enhanceBtn.classList.add("opacity-50", "cursor-not-allowed");
    enhanceBtn.setAttribute("disabled", "");
    progressArea?.classList.remove("hidden");
    downloadArea?.classList.add("hidden");

    const settings = getSettings();

    try {
      progressBar.style.width = "30%";
      progressText.textContent = "Applying enhancements...";

      const blob = await applyEnhancements(originalImage, settings);

      progressBar.style.width = "100%";
      progressText.textContent = "Enhancement complete!";

      setTimeout(() => {
        progressArea?.classList.add("hidden");
        enhanceBtn?.classList.remove("opacity-50", "cursor-not-allowed");
        enhanceBtn?.removeAttribute("disabled");
        downloadArea?.classList.remove("hidden");
        renderDownloadArea(blob);
      }, 500);
    } catch (err) {
      console.error("Enhancement failed:", err);
      progressArea?.classList.add("hidden");
      enhanceBtn?.classList.remove("opacity-50", "cursor-not-allowed");
      enhanceBtn?.removeAttribute("disabled");
    }
  }

  function renderDownloadArea(blob) {
    if (!downloadArea || !currentFile) return;
    const originalSize = currentFile.size;
    const enhancedSize = blob.size;

    downloadArea.innerHTML = `
      <div class="p-4 rounded-xl border border-success/30 bg-success/5 mb-4">
        <div class="flex items-center gap-2 mb-1">
          <svg class="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span class="text-sm font-semibold text-success">Image enhanced!</span>
        </div>
        <div class="grid grid-cols-2 gap-4 text-center mt-3">
          <div>
            <div class="text-sm font-bold text-text-primary">${formatBytes(originalSize)}</div>
            <div class="text-xs text-text-tertiary">Original</div>
          </div>
          <div>
            <div class="text-sm font-bold text-success">${formatBytes(enhancedSize)}</div>
            <div class="text-xs text-text-tertiary">Enhanced</div>
          </div>
        </div>
      </div>
      <button id="download-enhanced" class="w-full btn-primary btn-lg justify-center">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>
        Download Enhanced Image
      </button>
      <p class="text-xs text-text-tertiary text-center mt-3">Enhanced locally in your browser · Your files never left your device</p>
      <button id="enhance-more-btn" class="w-full btn-secondary btn-md justify-center mt-3">Enhance Another Image</button>
    `;

    downloadArea.querySelector("#download-enhanced")?.addEventListener("click", () => {
      const ext = getExtension(currentFile.name);
      downloadBlob(blob, currentFile.name.replace("." + ext, "-enhanced.png"));
    });

    downloadArea.querySelector("#enhance-more-btn")?.addEventListener("click", resetUI);
  }

  function resetUI() {
    files = [];
    currentFile = null;
    originalImage = null;
    resetSettings();
    uploadZone?.classList.remove("hidden");
    previewZone?.classList.add("hidden");
    enhanceBtn?.classList.add("hidden");
    downloadArea?.classList.add("hidden");
  }
}
