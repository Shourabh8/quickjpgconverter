/**
 * Client-side background removal using @imgly/background-removal.
 * Uses AI to detect and remove image backgrounds entirely in the browser.
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

function isSupported(f) {
  if (f.type.startsWith("image/")) return true;
  const ext = getExtension(f.name);
  return SUPPORTED_EXTENSIONS.includes(ext);
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

  if (!dropArea || !uploadZone) return;

  dropArea.setAttribute("tabindex", "0");
  dropArea.setAttribute("role", "button");
  dropArea.setAttribute("aria-label", "Upload image files. Press Enter or Space to browse.");

  let currentFile = null;

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

  // Show model loading status on page load
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

  async function handleFile(file) {
    if (!file || !isSupported(file)) return;
    currentFile = file;
    try {
      uploadZone?.classList.add("hidden");
      previewZone?.classList.remove("hidden");
      removeBtn?.classList.remove("hidden");
      downloadArea?.classList.add("hidden");
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

    try {
      progressBar.style.width = "20%";
      progressText.textContent = "Loading AI model (first time ~45MB)..."
      updateModelStatus("Loading AI model...", "loading");

      progressBar.style.width = "50%";
      progressText.textContent = "Analyzing image..."

      const resultBlob = await removeBackground(currentFile, {
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
          downloadArea?.classList.remove("hidden");
          renderDownloadArea(resultBlob);
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

  function renderDownloadArea(blob) {
    if (!downloadArea || !currentFile) return;
    const originalSize = currentFile.size;
    const resultSize = blob.size;

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
        Download PNG with Transparent Background
      </button>
      <p class="text-xs text-text-tertiary text-center mt-3">Processed locally in your browser · Your image never left your device</p>
      <button id="remove-another-btn" class="w-full btn-secondary btn-md justify-center mt-3">Remove Another Background</button>
    `;

    downloadArea.querySelector("#download-result")?.addEventListener("click", () => {
      const ext = getExtension(currentFile.name);
      downloadBlob(blob, currentFile.name.replace("." + ext, "-no-bg.png"));
    });

    downloadArea.querySelector("#remove-another-btn")?.addEventListener("click", resetUI);
  }

  function resetUI() {
    currentFile = null;
    if (previewImage) previewImage.src = "";
    uploadZone?.classList.remove("hidden");
    previewZone?.classList.add("hidden");
    removeBtn?.classList.add("hidden");
    downloadArea?.classList.add("hidden");
  }
}
