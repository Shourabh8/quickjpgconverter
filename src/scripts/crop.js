/**
 * Client-side image cropper using Cropper.js.
 * Supports: JPG, PNG, WebP with draggable crop box and preset ratios.
 *
 * Usage: initCropper()
 */

let cropper = null;
let currentFile = null;

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

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

function isImageFile(f) {
  if (f.type.startsWith("image/")) return true;
  const ext = getExtension(f.name);
  return IMAGE_EXTENSIONS.includes(ext);
}

function replaceExtension(filename, newExt) {
  const base = filename.substring(0, filename.lastIndexOf("."));
  return base + "." + newExt;
}

export function initCropper() {
  const dropArea = document.getElementById("drop-area");
  const fileInput = dropArea?.querySelector('input[type="file"]');
  const uploadZone = document.getElementById("upload-zone");
  const previewZone = document.getElementById("preview-zone");
  const dropOverlay = document.getElementById("drop-overlay");
  const cropContainer = document.getElementById("crop-container");
  const cropImage = document.getElementById("crop-image");
  const cropWidth = document.getElementById("crop-width");
  const cropHeight = document.getElementById("crop-height");
  const cropX = document.getElementById("crop-x");
  const cropY = document.getElementById("crop-y");
  const clearBtn = document.getElementById("clear-btn");
  const cropBtn = document.getElementById("crop-btn");
  const downloadArea = document.getElementById("download-area");
  const dimensionDisplay = document.getElementById("dimension-display");

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
    handleFiles(droppedFiles);
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
    handleFiles(Array.from(fileInput.files));
    fileInput.value = "";
  });

  // --- Clear ---
  clearBtn?.addEventListener("click", () => {
    resetCropper();
  });

  // --- Crop button ---
  cropBtn?.addEventListener("click", () => {
    cropImage();
  });

  // --- Ratio presets ---
  document.querySelectorAll("[data-ratio]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const ratio = btn.dataset.ratio;
      // Update active state
      document.querySelectorAll("[data-ratio]").forEach((b) => {
        b.classList.remove("bg-brand-600", "text-white", "border-brand-600");
        b.classList.add("bg-surface", "text-text-secondary", "border-border-default");
      });
      btn.classList.remove("bg-surface", "text-text-secondary", "border-border-default");
      btn.classList.add("bg-brand-600", "text-white", "border-brand-600");

      if (cropper) {
        if (ratio === "free") {
          cropper.setAspectRatio(NaN);
        } else {
          const [w, h] = ratio.split(":").map(Number);
          cropper.setAspectRatio(w / h);
        }
      }
    });
  });

  // --- Custom ratio inputs ---
  const customW = document.getElementById("custom-ratio-w");
  const customH = document.getElementById("custom-ratio-h");
  const applyCustomRatio = document.getElementById("apply-custom-ratio");

  applyCustomRatio?.addEventListener("click", () => {
    const w = parseInt(customW?.value);
    const h = parseInt(customH?.value);
    if (w > 0 && h > 0 && cropper) {
      cropper.setAspectRatio(w / h);
      // Update active state
      document.querySelectorAll("[data-ratio]").forEach((b) => {
        b.classList.remove("bg-brand-600", "text-white", "border-brand-600");
        b.classList.add("bg-surface", "text-text-secondary", "border-border-default");
      });
    }
  });

  // --- Manual crop inputs ---
  function updateCropFromInputs() {
    if (!cropper) return;
    const data = cropper.getData(true);
    const x = parseInt(cropX?.value) || Math.round(data.x);
    const y = parseInt(cropY?.value) || Math.round(data.y);
    const w = parseInt(cropWidth?.value) || Math.round(data.width);
    const h = parseInt(cropHeight?.value) || Math.round(data.height);
    cropper.setData({ x, y, width: w, height: h });
  }

  cropX?.addEventListener("change", updateCropFromInputs);
  cropY?.addEventListener("change", updateCropFromInputs);
  cropWidth?.addEventListener("change", updateCropFromInputs);
  cropHeight?.addEventListener("change", updateCropFromInputs);

  function handleFiles(newFiles) {
    const valid = newFiles.filter((f) => {
      if (f.size > 50 * 1024 * 1024) {
        showErrorBanner(f.name + " exceeds 50MB limit.", dropArea);
        return false;
      }
      if (!isImageFile(f)) {
        showErrorBanner(f.name + " is not an image file.", dropArea);
        return false;
      }
      return true;
    });

    if (valid.length === 0) return;

    currentFile = valid[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      uploadZone.classList.add("hidden");
      previewZone.classList.remove("hidden");
      cropContainer.classList.remove("hidden");
      downloadArea?.classList.add("hidden");

      cropImage.src = e.target.result;
      cropImage.classList.remove("hidden");

      if (cropper) cropper.destroy();

      cropper = new Cropper(cropImage, {
        aspectRatio: NaN,
        viewMode: 1,
        dragMode: "move",
        autoCropArea: 0.8,
        restore: false,
        guides: true,
        center: true,
        highlight: true,
        cropBoxMovable: true,
        cropBoxResizable: true,
        minCropBoxWidth: 50,
        minCropBoxHeight: 50,
        ready() {
          updateCropInputs();
        },
        crop() {
          updateCropInputs();
        },
      });
    };
    reader.readAsDataURL(currentFile);
  }

  function updateCropInputs() {
    if (!cropper) return;
    const data = cropper.getData(true);
    const containerData = cropper.getContainerData();

    if (cropWidth) cropWidth.value = Math.round(data.width);
    if (cropHeight) cropHeight.value = Math.round(data.height);
    if (cropX) cropX.value = Math.round(data.x);
    if (cropY) cropY.value = Math.round(data.y);

    if (dimensionDisplay) {
      dimensionDisplay.textContent = `Crop area: ${Math.round(data.width)} × ${Math.round(data.height)} px`;
    }
  }

  function cropImageFn() {
    if (!cropper || !currentFile) return;

    const canvas = cropper.getCroppedCanvas({
      imageSmoothingEnabled: true,
      imageSmoothingQuality: "high",
    });

    if (!canvas) return;

    // Show download area
    const successHtml = `
      <div class="p-4 rounded-xl border border-success/30 bg-success/5 mb-4">
        <div class="flex items-center gap-2 mb-2">
          <svg class="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-sm font-semibold text-success">Image cropped!</span>
        </div>
        <p class="text-xs text-text-secondary">${Math.round(canvas.width)} × ${Math.round(canvas.height)} px</p>
      </div>
    `;

    let buttonsHtml = `
      <div class="space-y-2">
        <button id="download-png" class="w-full btn-primary btn-lg justify-center">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Download PNG
        </button>
        <button id="download-jpg" class="w-full btn-secondary btn-lg justify-center">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Download JPG
        </button>
        <p class="text-[10px] text-text-tertiary text-center mt-3">
          Cropped locally in your browser · Your files never left your device
        </p>
        <button id="crop-more-btn" class="w-full btn-secondary btn-md justify-center mt-2">
          Crop Another Image
        </button>
      </div>
    `;

    if (downloadArea) {
      downloadArea.innerHTML = successHtml + buttonsHtml;
      downloadArea.classList.remove("hidden");

      // Bind download handlers
      downloadArea.querySelector("#download-png")?.addEventListener("click", () => {
        downloadCanvas(canvas, "png");
      });

      downloadArea.querySelector("#download-jpg")?.addEventListener("click", () => {
        downloadCanvas(canvas, "jpg");
      });

      downloadArea.querySelector("#crop-more-btn")?.addEventListener("click", () => {
        resetCropper();
      });
    }
  }

  function downloadCanvas(canvas, format) {
    const mime = format === "jpg" ? "image/jpeg" : "image/png";
    const ext = format === "jpg" ? "jpg" : "png";
    const quality = format === "jpg" ? 0.92 : undefined;

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = replaceExtension(currentFile?.name || "cropped-image", ext);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, mime, quality);
  }

  function resetCropper() {
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
    currentFile = null;
    uploadZone.classList.remove("hidden");
    previewZone?.classList.add("hidden");
    cropContainer?.classList.add("hidden");
    downloadArea?.classList.add("hidden");
    if (cropImage) {
      cropImage.src = "";
      cropImage.classList.add("hidden");
    }
    // Reset ratio buttons
    document.querySelectorAll("[data-ratio]").forEach((b) => {
      b.classList.remove("bg-brand-600", "text-white", "border-brand-600");
      b.classList.add("bg-surface", "text-text-secondary", "border-border-default");
    });
    // Set Free as active
    const freeBtn = document.querySelector('[data-ratio="free"]');
    if (freeBtn) {
      freeBtn.classList.remove("bg-surface", "text-text-secondary", "border-border-default");
      freeBtn.classList.add("bg-brand-600", "text-white", "border-brand-600");
    }
    if (dimensionDisplay) dimensionDisplay.textContent = "";
  }

  function showErrorBanner(message, container) {
    const existing = container.querySelector(".error-banner");
    if (existing) existing.remove();

    const banner = document.createElement("div");
    banner.className = "error-banner flex items-center gap-2 p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm mb-3 animate-fade-in";
    banner.innerHTML = `
      <svg class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
      <span class="flex-1">${message}</span>
      <button onclick="this.parentElement.remove()" class="text-danger/60 hover:text-danger transition-colors">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    `;
    container.prepend(banner);
    setTimeout(() => banner.remove(), 5000);
  }
}
