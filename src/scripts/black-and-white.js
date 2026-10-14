/**
 * Client-Side Image to Black and White / Grayscale Converter
 * HTML5 Canvas pixel manipulation supporting 5 monochrome presets,
 * document scanning binarization, fine-tune sliders, and high-res export.
 */

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

const PRESETS = {
  classic: { contrast: 1.0, brightness: 0, sepia: false, silver: false, docScan: false },
  dramatic: { contrast: 1.45, brightness: -5, sepia: false, silver: false, docScan: false },
  document: { contrast: 1.8, brightness: 20, sepia: false, silver: false, docScan: true },
  sepia: { contrast: 1.1, brightness: 0, sepia: true, silver: false, docScan: false },
  silver: { contrast: 1.15, brightness: 5, sepia: false, silver: true, docScan: false },
};

export function initBlackAndWhite() {
  const uploadZone = document.getElementById("bw-upload-zone");
  const dropArea = document.getElementById("bw-drop-area");
  const fileInput = document.getElementById("bw-file-input");
  const workspace = document.getElementById("bw-workspace");
  const canvas = document.getElementById("bw-canvas");
  if (!canvas || !uploadZone || !workspace) return;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  let rawImage = null;
  let rawFile = null;
  let activePreset = "classic";

  // Controls
  const presetButtons = document.querySelectorAll(".bw-preset-btn");
  const intensitySlider = document.getElementById("bw-intensity");
  const intensityVal = document.getElementById("bw-intensity-val");
  const contrastSlider = document.getElementById("bw-contrast");
  const contrastVal = document.getElementById("bw-contrast-val");
  const brightnessSlider = document.getElementById("bw-brightness");
  const brightnessVal = document.getElementById("bw-brightness-val");

  const formatSelect = document.getElementById("bw-format");
  const qualitySlider = document.getElementById("bw-quality");
  const qualityVal = document.getElementById("bw-quality-val");
  const qualityRow = document.getElementById("bw-quality-row");
  const downloadBtn = document.getElementById("bw-download-btn");
  const resetBtn = document.getElementById("bw-reset-btn");
  const imageInfoEl = document.getElementById("bw-image-info");

  // File handling
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

  function handleFile(file) {
    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file (JPG, PNG, WebP, etc.).");
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
          imageInfoEl.textContent = `${file.name} · ${img.naturalWidth}×${img.naturalHeight}px · ${formatBytes(file.size)}`;
        }
        renderMonochrome();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Preset switching
  presetButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      presetButtons.forEach((b) => {
        b.classList.remove("bg-brand-600", "text-white", "border-brand-600");
        b.classList.add("bg-surface", "text-text-secondary");
      });
      btn.classList.add("bg-brand-600", "text-white", "border-brand-600");
      btn.classList.remove("bg-surface", "text-text-secondary");
      activePreset = btn.dataset.preset || "classic";

      // Sync preset values into sliders
      const p = PRESETS[activePreset];
      if (contrastSlider) {
        contrastSlider.value = Math.round(p.contrast * 100);
        if (contrastVal) contrastVal.textContent = contrastSlider.value + "%";
      }
      if (brightnessSlider) {
        brightnessSlider.value = p.brightness;
        if (brightnessVal) brightnessVal.textContent = brightnessSlider.value;
      }
      renderMonochrome();
    });
  });

  // Slider events
  intensitySlider?.addEventListener("input", () => {
    if (intensityVal) intensityVal.textContent = intensitySlider.value + "%";
    renderMonochrome();
  });

  contrastSlider?.addEventListener("input", () => {
    if (contrastVal) contrastVal.textContent = contrastSlider.value + "%";
    renderMonochrome();
  });

  brightnessSlider?.addEventListener("input", () => {
    if (brightnessVal) brightnessVal.textContent = brightnessSlider.value;
    renderMonochrome();
  });

  formatSelect?.addEventListener("change", () => {
    const isJpg = formatSelect.value === "image/jpeg" || formatSelect.value === "image/webp";
    if (qualityRow) {
      if (isJpg) qualityRow.classList.remove("hidden");
      else qualityRow.classList.add("hidden");
    }
  });

  qualitySlider?.addEventListener("input", () => {
    if (qualityVal) qualityVal.textContent = qualitySlider.value + "%";
  });

  function renderMonochrome() {
    if (!rawImage) return;

    const w = rawImage.naturalWidth;
    const h = rawImage.naturalHeight;
    canvas.width = w;
    canvas.height = h;

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(rawImage, 0, 0, w, h);

    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;

    const intensity = parseInt(intensitySlider?.value || "100", 10) / 100;
    const contrast = parseInt(contrastSlider?.value || "100", 10) / 100;
    const brightness = parseInt(brightnessSlider?.value || "0", 10);
    const p = PRESETS[activePreset] || PRESETS.classic;

    for (let i = 0; i < d.length; i += 4) {
      const origR = d[i];
      const origG = d[i + 1];
      const origB = d[i + 2];

      // Standard perceptual luminance: 0.299R + 0.587G + 0.114B
      let gray = 0.299 * origR + 0.587 * origG + 0.114 * origB;

      if (p.docScan) {
        // Document threshold mode: clean paper to white, text to black
        gray = gray > 165 ? 255 : Math.max(0, gray * 0.7 - 20);
      }

      // Apply contrast & brightness
      gray = (gray - 128) * contrast + 128 + brightness;
      gray = Math.min(255, Math.max(0, gray));

      let targetR = gray;
      let targetG = gray;
      let targetB = gray;

      if (p.sepia) {
        // Sepia tint curve
        targetR = Math.min(255, gray * 1.08 + 15);
        targetG = Math.min(255, gray * 0.95 + 5);
        targetB = Math.max(0, gray * 0.78 - 10);
      } else if (p.silver) {
        // Cool silver nitrate tone
        targetR = Math.max(0, gray * 0.96);
        targetG = Math.min(255, gray * 0.99);
        targetB = Math.min(255, gray * 1.06 + 8);
      }

      // Interpolate with original based on intensity slider
      d[i] = origR * (1 - intensity) + targetR * intensity;
      d[i + 1] = origG * (1 - intensity) + targetG * intensity;
      d[i + 2] = origB * (1 - intensity) + targetB * intensity;
    }

    ctx.putImageData(imgData, 0, 0);
  }

  // Download
  downloadBtn?.addEventListener("click", () => {
    if (!canvas || !rawFile) return;

    const mime = formatSelect?.value || "image/jpeg";
    const quality = parseInt(qualitySlider?.value || "92", 10) / 100;
    let ext = "jpg";
    if (mime === "image/png") ext = "png";
    if (mime === "image/webp") ext = "webp";

    const baseName = rawFile.name.substring(0, rawFile.name.lastIndexOf(".")) || "image";
    const outputName = `${baseName}_black_and_white.${ext}`;

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const link = document.createElement("a");
        link.download = outputName;
        link.href = URL.createObjectURL(blob);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      },
      mime,
      quality
    );
  });

  // Reset
  resetBtn?.addEventListener("click", () => {
    rawImage = null;
    rawFile = null;
    if (fileInput) fileInput.value = "";
    workspace.classList.add("hidden");
    uploadZone.classList.remove("hidden");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });
}
