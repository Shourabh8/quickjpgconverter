/**
 * Client-side background removal using @imgly/background-removal.
 * Supports transparent, white, black, and custom color backgrounds.
 *
 * Usage: initBackgroundRemover()
 */

import { removeBackground } from "@imgly/background-removal";

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

// Convert hex color to rgba
function hexToRgba(hex, alpha = 1) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Apply background color to image blob
function applyBackground(fgBlob, bgColor) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(fgBlob);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      
      // Draw background
      if (bgColor === "transparent") {
        // Already transparent, do nothing
      } else if (bgColor === "white") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (bgColor === "black") {
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (bgColor === "blue") {
        ctx.fillStyle = "#3b82f6";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (bgColor === "green") {
        ctx.fillStyle = "#22c55e";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (bgColor === "red") {
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (bgColor.startsWith("#")) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      // Draw foreground (cutout) on top
      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        resolve(blob);
      }, "image/png");
    };
    img.src = url;
  });
}

export function initBackgroundRemover() {
  const dropArea = document.getElementById("drop-area");
  const fileInput = dropArea?.querySelector('input[type="file"]');
  const uploadZone = document.getElementById("upload-zone");
  const previewZone = document.getElementById("preview-zone");
  const fileCount = document.getElementById("file-count");
  const clearBtn = document.getElementById("clear-btn");
  const removeBtn = document.getElementById("remove-btn");
  const downloadArea = document.getElementById("download-area");
  const dropOverlay = document.getElementById("drop-overlay");
  const progressArea = document.getElementById("progress-area");
  const progressBar = document.getElementById("progress-bar");
  const progressText = document.getElementById("progress-text");
  const previewImage = document.getElementById("preview-image");
  const modelStatus = document.getElementById("model-status");
  const bgOptions = document.getElementById("bg-options");
  const previewSection = document.getElementById("preview-section");
  const previewCanvas = document.getElementById("preview-canvas");

  if (!dropArea || !uploadZone) return;

  dropArea.setAttribute("tabindex", "0");
  dropArea.setAttribute("role", "button");
  dropArea.setAttribute("aria-label", "Upload image files. Press Enter or Space to browse.");

  let currentFile = null;
  let cutoutBlob = null; // The image with transparent background
  let selectedBg = "transparent";

  function updateModelStatus(text, status) {
    if (!modelStatus) return;
    modelStatus.textContent = text;
    modelStatus.className = "text-xs font-medium ";
    switch (status) {
      case "loading":
        modelStatus.className += "text-amber-600 dark:text-amber-400";
        break;
      case "ready":
        modelStatus.className += "text-success";
        break;
      case "error":
        modelStatus.className += "text-danger";
        break;
    }
  }

  updateModelStatus("Click 'Remove Background' to load AI model", "loading");

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
  removeBtn?.addEventListener("click", removeBg);

  // Background color selection
  bgOptions?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-bg]");
    if (!btn) return;
    
    // Update active state
    bgOptions.querySelectorAll("[data-bg]").forEach(b => {
      b.classList.remove("ring-2", "ring-brand-500", "ring-offset-2");
    });
    btn.classList.add("ring-2", "ring-brand-500", "ring-offset-2");
    
    selectedBg = btn.dataset.bg;
    updatePreview();
  });

  // Custom color picker
  const customColorInput = document.getElementById("custom-color");
  customColorInput?.addEventListener("input", (e) => {
    selectedBg = e.target.value;
    // Deselect preset buttons
    bgOptions.querySelectorAll("[data-bg]").forEach(b => {
      b.classList.remove("ring-2", "ring-brand-500", "ring-offset-2");
    });
    updatePreview();
  });

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
    cutoutBlob = null;
    try {
      uploadZone?.classList.add("hidden");
      previewZone?.classList.remove("hidden");
      removeBtn?.classList.remove("hidden");
      downloadArea?.classList.add("hidden");
      previewSection?.classList.add("hidden");
      bgOptions?.classList.add("hidden");
      if (fileCount) fileCount.textContent = file.name;
      
      if (previewImage) {
        const url = URL.createObjectURL(file);
        previewImage.src = url;
        previewImage.onload = () => URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function removeBg() {
    if (!currentFile) return;
    
    removeBtn.classList.add("opacity-50", "cursor-not-allowed");
    removeBtn.setAttribute("disabled", "");
    progressArea?.classList.remove("hidden");
    downloadArea?.classList.add("hidden");
    previewSection?.classList.add("hidden");

    try {
      progressBar.style.width = "20%";
      progressText.textContent = "Loading AI model (first time ~45MB)..."
      updateModelStatus("Loading AI model...", "loading");

      progressBar.style.width = "50%";
      progressText.textContent = "Analyzing image..."

      cutoutBlob = await removeBackground(currentFile, {
        progress: (key, current, total) => {
          const percent = Math.round((current / total) * 100);
          progressBar.style.width = `${50 + percent * 0.4}%`;
          if (key === "fetch:model") {
            progressText.textContent = `Downloading model... ${percent}%`;
            updateModelStatus("Downloading AI model...", "loading");
          } else if (key === "compute:inference") {
            progressText.textContent = `Processing image... ${percent}%`;
            updateModelStatus("Processing image...", "loading");
          }
        }
      });

      progressBar.style.width = "95%";
      progressText.textContent = "Finalizing...";

      setTimeout(() => {
        progressBar.style.width = "100%";
        progressText.textContent = "Background removed!";
        updateModelStatus("AI model ready", "ready");

        setTimeout(() => {
          progressArea?.classList.add("hidden");
          removeBtn?.classList.remove("opacity-50", "cursor-not-allowed");
          removeBtn?.removeAttribute("disabled");
          
          // Show background options and preview
          bgOptions?.classList.remove("hidden");
          previewSection?.classList.remove("hidden");
          downloadArea?.classList.remove("hidden");
          
          // Render initial preview (transparent)
          updatePreview();
          renderDownloadArea();
        }, 500);
      }, 100);
    } catch (err) {
      console.error("Background removal failed:", err);
      progressArea?.classList.add("hidden");
      removeBtn?.classList.remove("opacity-50", "cursor-not-allowed");
      removeBtn?.removeAttribute("disabled");
      updateModelStatus("Error: " + err.message, "error");
      progressText.textContent = "Error: " + err.message;
    }
  }

  async function updatePreview() {
    if (!cutoutBlob || !previewCanvas) return;
    
    const img = new Image();
    const url = URL.createObjectURL(cutoutBlob);
    
    img.onload = async () => {
      const canvas = previewCanvas;
      const ctx = canvas.getContext("2d");
      
      // Scale down for preview
      let { naturalWidth, naturalHeight } = img;
      const maxPreview = 500;
      if (naturalWidth > maxPreview || naturalHeight > maxPreview) {
        const ratio = Math.min(maxPreview / naturalWidth, maxPreview / naturalHeight);
        naturalWidth = Math.round(naturalWidth * ratio);
        naturalHeight = Math.round(naturalHeight * ratio);
      }
      
      canvas.width = naturalWidth;
      canvas.height = naturalHeight;
      
      // Draw checkerboard pattern for transparent areas
      if (selectedBg === "transparent") {
        const tileSize = 10;
        for (let y = 0; y < naturalHeight; y += tileSize) {
          for (let x = 0; x < naturalWidth; x += tileSize) {
            ctx.fillStyle = ((x / tileSize + y / tileSize) % 2 === 0) ? "#e5e7eb" : "#d1d5db";
            ctx.fillRect(x, y, tileSize, tileSize);
          }
        }
      } else {
        // Draw solid background
        if (selectedBg === "white") {
          ctx.fillStyle = "#ffffff";
        } else if (selectedBg === "black") {
          ctx.fillStyle = "#000000";
        } else if (selectedBg === "blue") {
          ctx.fillStyle = "#3b82f6";
        } else if (selectedBg === "green") {
          ctx.fillStyle = "#22c55e";
        } else if (selectedBg === "red") {
          ctx.fillStyle = "#ef4444";
        } else if (selectedBg.startsWith("#")) {
          ctx.fillStyle = selectedBg;
        }
        ctx.fillRect(0, 0, naturalWidth, naturalHeight);
      }
      
      // Draw the cutout image
      ctx.drawImage(img, 0, 0, naturalWidth, naturalHeight);
      
      URL.revokeObjectURL(url);
    };
    
    img.src = url;
  }

  async function renderDownloadArea() {
    if (!downloadArea || !currentFile || !cutoutBlob) return;
    
    // Get the result with background applied
    const resultBlob = await applyBackground(cutoutBlob, selectedBg);
    const originalSize = currentFile.size;
    const resultSize = resultBlob.size;

    downloadArea.innerHTML = `
      <div class="p-4 rounded-xl border border-success/30 bg-success/5 mb-4">
        <div class="flex items-center gap-2 mb-1">
          <svg class="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span class="text-sm font-semibold text-success">Background removed!</span>
        </div>
        <div class="grid grid-cols-2 gap-4 text-center mt-3">
          <div>
            <div class="text-sm font-bold text-text-primary">${formatBytes(originalSize)}</div>
            <div class="text-xs text-text-tertiary">Original</div>
          </div>
          <div>
            <div class="text-sm font-bold text-success">${formatBytes(resultSize)}</div>
            <div class="text-xs text-text-tertiary">Result (PNG)</div>
          </div>
        </div>
      </div>
      <button id="download-result" class="w-full btn-primary btn-lg justify-center">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>
        Download Image
      </button>
      <p class="text-xs text-text-tertiary text-center mt-3">Processed locally in your browser · Your image never left your device</p>
      <button id="remove-another-btn" class="w-full btn-secondary btn-md justify-center mt-3">Remove Another Background</button>
    `;

    downloadArea.querySelector("#download-result")?.addEventListener("click", async () => {
      const blob = await applyBackground(cutoutBlob, selectedBg);
      const ext = getExtension(currentFile.name);
      const suffix = selectedBg === "transparent" ? "-no-bg" : `-${selectedBg}`;
      downloadBlob(blob, currentFile.name.replace("." + ext, `${suffix}.png`));
    });

    downloadArea.querySelector("#remove-another-btn")?.addEventListener("click", resetUI);
  }

  function resetUI() {
    currentFile = null;
    cutoutBlob = null;
    selectedBg = "transparent";
    if (previewImage) previewImage.src = "";
    if (previewCanvas) {
      const ctx = previewCanvas.getContext("2d");
      ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    }
    uploadZone?.classList.remove("hidden");
    previewZone?.classList.add("hidden");
    removeBtn?.classList.add("hidden");
    downloadArea?.classList.add("hidden");
    previewSection?.classList.add("hidden");
    bgOptions?.classList.add("hidden");
    
    // Reset bg selection to transparent
    bgOptions?.querySelectorAll("[data-bg]").forEach(b => {
      b.classList.remove("ring-2", "ring-brand-500", "ring-offset-2");
    });
    bgOptions?.querySelector("[data-bg='transparent']")?.classList.add("ring-2", "ring-brand-500", "ring-offset-2");
  }
}
