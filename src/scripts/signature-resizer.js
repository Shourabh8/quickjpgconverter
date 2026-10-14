/**
 * Client-Side Signature Resizer & Compressor
 * Specifically engineered for Govt & Exam portals (UPSC, SSC, IBPS, NTA, Gate, State PSC).
 * Includes: Portal Presets, Ink & Paper Contrast Enhancer, Precise File Size Targeting (10-20KB).
 */

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

const PRESETS = {
  upsc: { name: "UPSC Civil Services", width: 350, height: 150, maxKb: 20, minKb: 10, aspect: "7:3" },
  ssc: { name: "SSC (CGL/CHSL/MTS)", width: 280, height: 120, maxKb: 20, minKb: 10, aspect: "7:3" },
  ibps: { name: "Banking (IBPS/SBI)", width: 140, height: 60, maxKb: 20, minKb: 10, aspect: "7:3" },
  nta: { name: "NTA (NEET / JEE)", width: 350, height: 150, maxKb: 30, minKb: 4, aspect: "7:3" },
  gate: { name: "GATE Examination", width: 400, height: 160, maxKb: 50, minKb: 5, aspect: "5:2" },
  custom: { name: "Custom Dimensions", width: 300, height: 120, maxKb: 20, minKb: 5, aspect: "custom" },
};

export function initSignatureResizer() {
  const uploadZone = document.getElementById("sig-upload-zone");
  const dropArea = document.getElementById("sig-drop-area");
  const fileInput = document.getElementById("sig-file-input");
  const workspace = document.getElementById("sig-workspace");
  const canvas = document.getElementById("sig-canvas");
  if (!canvas || !uploadZone || !workspace) return;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  let rawImage = null;
  let rawFile = null;
  let currentPreset = "upsc";
  let processedBlob = null;

  // DOM Elements
  const presetSelect = document.getElementById("sig-preset-select");
  const customDimensionsDiv = document.getElementById("sig-custom-dimensions");
  const widthInput = document.getElementById("sig-width");
  const heightInput = document.getElementById("sig-height");
  const targetKbInput = document.getElementById("sig-target-kb");
  const targetKbVal = document.getElementById("sig-target-kb-val");

  // Filters
  const contrastSlider = document.getElementById("sig-contrast");
  const contrastVal = document.getElementById("sig-contrast-val");
  const brightnessSlider = document.getElementById("sig-brightness");
  const brightnessVal = document.getElementById("sig-brightness-val");
  const whiteCleanToggle = document.getElementById("sig-white-clean");

  // Output stats
  const outputDimensionsEl = document.getElementById("sig-output-dimensions");
  const outputSizeEl = document.getElementById("sig-output-size");
  const statusBadgeEl = document.getElementById("sig-status-badge");
  const downloadBtn = document.getElementById("sig-download-btn");
  const resetBtn = document.getElementById("sig-reset-btn");
  const imageInfoEl = document.getElementById("sig-image-info");

  // Event Listeners
  dropArea?.addEventListener("click", () => fileInput?.click());

  dropArea?.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropArea.classList.add("border-brand-500", "bg-brand-50/20");
  });

  dropArea?.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dropArea.classList.remove("border-brand-500", "bg-brand-50/20");
  });

  dropArea?.addEventListener("drop", (e) => {
    e.preventDefault();
    dropArea.classList.remove("border-brand-500", "bg-brand-50/20");
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  });

  fileInput?.addEventListener("change", () => {
    if (fileInput.files.length) handleFile(fileInput.files[0]);
  });

  presetSelect?.addEventListener("change", () => {
    currentPreset = presetSelect.value;
    const p = PRESETS[currentPreset];
    if (currentPreset === "custom") {
      customDimensionsDiv?.classList.remove("hidden");
    } else {
      customDimensionsDiv?.classList.add("hidden");
      if (widthInput) widthInput.value = p.width;
      if (heightInput) heightInput.value = p.height;
      if (targetKbInput) {
        targetKbInput.value = p.maxKb;
        if (targetKbVal) targetKbVal.textContent = p.maxKb + " KB";
      }
    }
    processSignature();
  });

  widthInput?.addEventListener("input", processSignature);
  heightInput?.addEventListener("input", processSignature);

  targetKbInput?.addEventListener("input", () => {
    if (targetKbVal) targetKbVal.textContent = targetKbInput.value + " KB";
    processSignature();
  });

  contrastSlider?.addEventListener("input", () => {
    if (contrastVal) contrastVal.textContent = contrastSlider.value;
    processSignature();
  });

  brightnessSlider?.addEventListener("input", () => {
    if (brightnessVal) brightnessVal.textContent = brightnessSlider.value;
    processSignature();
  });

  whiteCleanToggle?.addEventListener("change", processSignature);

  function handleFile(file) {
    if (!file.type.startsWith("image/")) {
      alert("Please upload a photo of your signature (JPG, PNG, WebP).");
      return;
    }
    rawFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        rawImage = img;
        uploadZone.classList.add("hidden");
        workspace.classList.remove("hidden");
        if (imageInfoEl) {
          imageInfoEl.textContent = `${file.name} (Original: ${img.naturalWidth}×${img.naturalHeight}px, ${formatBytes(file.size)})`;
        }
        processSignature();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  async function processSignature() {
    if (!rawImage) return;

    let targetW = parseInt(widthInput?.value || "350", 10);
    let targetH = parseInt(heightInput?.value || "150", 10);
    const maxKb = parseInt(targetKbInput?.value || "20", 10);

    if (currentPreset !== "custom" && PRESETS[currentPreset]) {
      targetW = PRESETS[currentPreset].width;
      targetH = PRESETS[currentPreset].height;
    }

    canvas.width = targetW;
    canvas.height = targetH;

    // Fill with crisp pure white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, targetW, targetH);

    // Calculate aspect ratio fit (contain signature inside target dimension with small margin)
    const padding = 10;
    const availW = targetW - padding * 2;
    const availH = targetH - padding * 2;
    const scale = Math.min(availW / rawImage.naturalWidth, availH / rawImage.naturalHeight);
    const drawW = rawImage.naturalWidth * scale;
    const drawH = rawImage.naturalHeight * scale;
    const drawX = (targetW - drawW) / 2;
    const drawY = (targetH - drawH) / 2;

    ctx.drawImage(rawImage, drawX, drawY, drawW, drawH);

    // Apply Ink Enhancement & Paper Whitening algorithm
    const cleanPaper = whiteCleanToggle?.checked ?? true;
    const contrast = parseInt(contrastSlider?.value || "130", 10) / 100;
    const brightness = parseInt(brightnessSlider?.value || "10", 10);

    const imgData = ctx.getImageData(0, 0, targetW, targetH);
    const d = imgData.data;

    for (let i = 0; i < d.length; i += 4) {
      let r = d[i];
      let g = d[i + 1];
      let b = d[i + 2];

      // Luminance / brightness
      let gray = 0.299 * r + 0.587 * g + 0.114 * b;

      if (cleanPaper) {
        // Threshold: If pixel is light gray / paper shadow (> 180), convert to pure white (255)
        // If pixel is pen ink (< 160), boost contrast to make ink crisp and deep
        if (gray > 185) {
          r = 255;
          g = 255;
          b = 255;
        } else {
          // Darken ink for high contrast
          r = Math.max(0, r * 0.75 - 15);
          g = Math.max(0, g * 0.75 - 15);
          b = Math.max(0, b * 0.85); // Preserve subtle blue ink if written in blue pen
        }
      }

      // Standard contrast & brightness
      r = Math.min(255, Math.max(0, (r - 128) * contrast + 128 + brightness));
      g = Math.min(255, Math.max(0, (g - 128) * contrast + 128 + brightness));
      b = Math.min(255, Math.max(0, (b - 128) * contrast + 128 + brightness));

      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
    }

    ctx.putImageData(imgData, 0, 0);

    // Target Size Compression via binary search on JPEG quality
    processedBlob = await compressToTargetSize(canvas, maxKb);

    if (processedBlob) {
      const finalKb = (processedBlob.size / 1024).toFixed(1);
      if (outputDimensionsEl) outputDimensionsEl.textContent = `${targetW} × ${targetH} px`;
      if (outputSizeEl) outputSizeEl.textContent = `${finalKb} KB`;

      if (statusBadgeEl) {
        if (finalKb <= maxKb && finalKb >= (PRESETS[currentPreset]?.minKb || 5)) {
          statusBadgeEl.innerHTML = `<span class="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">✓ Portal Compliant (${finalKb} KB ≤ ${maxKb} KB)</span>`;
        } else if (finalKb <= maxKb) {
          statusBadgeEl.innerHTML = `<span class="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">✓ Under ${maxKb} KB (${finalKb} KB)</span>`;
        } else {
          statusBadgeEl.innerHTML = `<span class="inline-flex items-center gap-1 text-amber-500 font-medium">⚠ Compressed to nearest limit (${finalKb} KB)</span>`;
        }
      }
    }
  }

  function compressToTargetSize(cvs, targetKb) {
    return new Promise((resolve) => {
      const targetBytes = targetKb * 1024;
      let minQ = 0.1;
      let maxQ = 0.98;
      let bestBlob = null;
      let iterations = 0;

      function attempt(quality) {
        cvs.toBlob(
          (blob) => {
            if (!blob) {
              resolve(bestBlob);
              return;
            }
            iterations++;
            bestBlob = blob;

            if (blob.size <= targetBytes && blob.size >= targetBytes * 0.75) {
              resolve(blob);
              return;
            }

            if (iterations > 7) {
              resolve(bestBlob);
              return;
            }

            if (blob.size > targetBytes) {
              maxQ = quality;
            } else {
              minQ = quality;
            }

            const nextQ = (minQ + maxQ) / 2;
            attempt(nextQ);
          },
          "image/jpeg",
          (minQ + maxQ) / 2
        );
      }

      attempt(0.85);
    });
  }

  // Download
  downloadBtn?.addEventListener("click", () => {
    if (!processedBlob) return;
    const link = document.createElement("a");
    link.download = `signature_${currentPreset}_compliant.jpg`;
    link.href = URL.createObjectURL(processedBlob);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  });

  // Reset
  resetBtn?.addEventListener("click", () => {
    rawImage = null;
    rawFile = null;
    processedBlob = null;
    if (fileInput) fileInput.value = "";
    workspace.classList.add("hidden");
    uploadZone.classList.remove("hidden");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });
}
