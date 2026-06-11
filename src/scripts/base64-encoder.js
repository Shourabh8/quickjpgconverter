/**
 * Client-side image to Base64 encoder using FileReader API.
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

const SUPPORTED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif", "svg"];

function isSupported(f) {
  if (f.type.startsWith("image/")) return true;
  const ext = getExtension(f.name);
  return SUPPORTED_EXTENSIONS.includes(ext);
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read: " + file.name));
    reader.readAsDataURL(file);
  });
}

function downloadText(text, filename) {
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

export function initBase64Encoder() {
  const dropArea = document.getElementById("drop-area");
  const fileInput = dropArea?.querySelector('input[type="file"]');
  const uploadZone = document.getElementById("upload-zone");
  const previewZone = document.getElementById("preview-zone");
  const previewImage = document.getElementById("preview-image");
  const fileInfo = document.getElementById("file-info");
  const clearBtn = document.getElementById("clear-btn");
  const encodeBtn = document.getElementById("encode-btn");
  const outputArea = document.getElementById("output-area");
  const base64Output = document.getElementById("base64-output");
  const copyBtn = document.getElementById("copy-btn");
  const statsArea = document.getElementById("stats-area");
  const originalSizeEl = document.getElementById("original-size");
  const base64SizeEl = document.getElementById("base64-size");
  const sizeIncreaseEl = document.getElementById("size-increase");
  const dropOverlay = document.getElementById("drop-overlay");

  if (!dropArea || !uploadZone) return;

  // Keyboard accessibility
  dropArea.setAttribute("tabindex", "0");
  dropArea.setAttribute("role", "button");
  dropArea.setAttribute("aria-label", "Upload image files. Press Enter or Space to browse.");

  let currentFile = null;
  let base64String = "";

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
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) addFile(files[0]);
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
    if (fileInput.files.length > 0) addFile(fileInput.files[0]);
    fileInput.value = "";
  });

  clearBtn?.addEventListener("click", resetAll);

  encodeBtn?.addEventListener("click", encodeImage);

  copyBtn?.addEventListener("click", () => {
    navigator.clipboard.writeText(base64String).then(() => {
      copyBtn.textContent = "Copied!";
      setTimeout(() => { copyBtn.textContent = "Copy to clipboard"; }, 2000);
    });
  });

  function addFile(file) {
    if (file.size > 5 * 1024 * 1024) {
      alert(file.name + " exceeds 5MB limit for Base64 encoding.");
      return;
    }
    if (!isSupported(file)) {
      alert(file.name + " is not a supported image file.");
      return;
    }
    currentFile = file;
    showPreview();
  }

  function showPreview() {
    uploadZone?.classList.add("hidden");
    previewZone?.classList.remove("hidden");
    encodeBtn?.classList.remove("opacity-50", "cursor-not-allowed");
    encodeBtn?.removeAttribute("disabled");
    outputArea?.classList.add("hidden");
    statsArea?.classList.add("hidden");

    if (fileInfo) fileInfo.textContent = currentFile.name;
    if (previewImage) {
      const url = URL.createObjectURL(currentFile);
      previewImage.src = url;
      previewImage.onload = () => URL.revokeObjectURL(url);
    }
  }

  function resetAll() {
    currentFile = null;
    base64String = "";
    uploadZone?.classList.remove("hidden");
    previewZone?.classList.add("hidden");
    encodeBtn?.classList.add("opacity-50", "cursor-not-allowed");
    encodeBtn?.setAttribute("disabled", "");
    outputArea?.classList.add("hidden");
    statsArea?.classList.add("hidden");
  }

  async function encodeImage() {
    if (!currentFile) return;

    encodeBtn.classList.add("opacity-50", "cursor-not-allowed");
    encodeBtn.setAttribute("disabled", "");

    try {
      base64String = await readFileAsBase64(currentFile);

      // Display output
      if (base64Output) base64Output.textContent = base64String;
      outputArea?.classList.remove("hidden");

      // Calculate stats
      const originalSize = currentFile.size;
      const base64Size = new Blob([base64String]).size;
      const increase = Math.round(((base64Size - originalSize) / originalSize) * 100);

      if (originalSizeEl) originalSizeEl.textContent = formatBytes(originalSize);
      if (base64SizeEl) base64SizeEl.textContent = formatBytes(base64Size);
      if (sizeIncreaseEl) sizeIncreaseEl.textContent = "+" + increase + "%";
      statsArea?.classList.remove("hidden");

    } catch (err) {
      console.error("Encoding failed:", err);
      alert("Failed to encode image. Please try another file.");
    }

    encodeBtn.classList.remove("opacity-50", "cursor-not-allowed");
    encodeBtn.removeAttribute("disabled");
  }
}
