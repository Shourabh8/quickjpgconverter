/**
 * Client-Side Image Color Picker & Dominant Palette Extractor
 * HTML5 Canvas pixel sampling with magnified loupe eyedropper,
 * dominant color quantization, and CSS/JSON palette export.
 */

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function rgbToHex(r, g, b) {
  return (
    "#" +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(x).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      })
      .join("")
      .toUpperCase()
  );
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

function rgbToCmyk(r, g, b) {
  let c = 1 - r / 255;
  let m = 1 - g / 255;
  let y = 1 - b / 255;
  let k = Math.min(c, Math.min(m, y));

  if (k === 1) {
    return "cmyk(0%, 0%, 0%, 100%)";
  }

  c = Math.round(((c - k) / (1 - k)) * 100);
  m = Math.round(((m - k) / (1 - k)) * 100);
  y = Math.round(((y - k) / (1 - k)) * 100);
  k = Math.round(k * 100);

  return `cmyk(${c}%, ${m}%, ${y}%, ${k}%)`;
}

function getLuminance(r, g, b) {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

export function initColorPicker() {
  const uploadZone = document.getElementById("cp-upload-zone");
  const dropArea = document.getElementById("cp-drop-area");
  const fileInput = document.getElementById("cp-file-input");
  const workspace = document.getElementById("cp-workspace");
  const canvas = document.getElementById("cp-canvas");
  const loupeCanvas = document.getElementById("cp-loupe-canvas");
  const loupeContainer = document.getElementById("cp-loupe");
  if (!canvas || !uploadZone || !workspace || !loupeCanvas) return;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const loupeCtx = loupeCanvas.getContext("2d");

  let baseImage = null;
  let extractedPalette = [];

  // DOM elements for readouts
  const hexValueEl = document.getElementById("cp-hex-value");
  const rgbValueEl = document.getElementById("cp-rgb-value");
  const hslValueEl = document.getElementById("cp-hsl-value");
  const cmykValueEl = document.getElementById("cp-cmyk-value");
  const colorSwatchEl = document.getElementById("cp-color-swatch");
  const contrastBadgeEl = document.getElementById("cp-contrast-badge");
  const paletteContainer = document.getElementById("cp-palette-container");
  const copyCssBtn = document.getElementById("cp-copy-css-btn");
  const copyJsonBtn = document.getElementById("cp-copy-json-btn");
  const imageInfoEl = document.getElementById("cp-image-info");
  const resetBtn = document.getElementById("cp-reset-btn");

  // Setup sample button copy helper
  function setupCopyButton(btnId, targetEl) {
    const btn = document.getElementById(btnId);
    btn?.addEventListener("click", () => {
      const text = targetEl?.textContent;
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => {
        const originalText = btn.innerHTML;
        btn.innerHTML = `<span class="text-emerald-500 font-bold">Copied!</span>`;
        setTimeout(() => {
          btn.innerHTML = originalText;
        }, 1500);
      });
    });
  }

  setupCopyButton("cp-copy-hex-btn", hexValueEl);
  setupCopyButton("cp-copy-rgb-btn", rgbValueEl);
  setupCopyButton("cp-copy-hsl-btn", hslValueEl);
  setupCopyButton("cp-copy-cmyk-btn", cmykValueEl);

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
      alert("Please upload a valid image file (JPG, PNG, WebP, SVG, BMP).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        baseImage = img;
        uploadZone.classList.add("hidden");
        workspace.classList.remove("hidden");
        if (imageInfoEl) {
          imageInfoEl.textContent = `${file.name} · ${img.naturalWidth}×${img.naturalHeight}px · ${formatBytes(file.size)}`;
        }
        renderCanvas();
        extractDominantPalette();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function renderCanvas() {
    if (!baseImage) return;

    // Use natural dimensions for accurate pixel picking
    canvas.width = baseImage.naturalWidth;
    canvas.height = baseImage.naturalHeight;
    ctx.drawImage(baseImage, 0, 0);

    // Pick center pixel as default initial color
    const cx = Math.floor(canvas.width / 2);
    const cy = Math.floor(canvas.height / 2);
    selectPixelColor(cx, cy);
  }

  function selectPixelColor(canvasX, canvasY) {
    if (!ctx) return;
    const clampedX = Math.max(0, Math.min(canvas.width - 1, canvasX));
    const clampedY = Math.max(0, Math.min(canvas.height - 1, canvasY));

    const pixel = ctx.getImageData(clampedX, clampedY, 1, 1).data;
    const r = pixel[0];
    const g = pixel[1];
    const b = pixel[2];

    const hex = rgbToHex(r, g, b);
    const rgbStr = `rgb(${r}, ${g}, ${b})`;
    const hslStr = rgbToHsl(r, g, b);
    const cmykStr = rgbToCmyk(r, g, b);

    if (hexValueEl) hexValueEl.textContent = hex;
    if (rgbValueEl) rgbValueEl.textContent = rgbStr;
    if (hslValueEl) hslValueEl.textContent = hslStr;
    if (cmykValueEl) cmykValueEl.textContent = cmykStr;

    if (colorSwatchEl) {
      colorSwatchEl.style.backgroundColor = hex;
    }

    // Contrast text badge
    const lum = getLuminance(r, g, b);
    if (contrastBadgeEl) {
      if (lum > 0.45) {
        contrastBadgeEl.innerHTML = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-900 text-white">Dark Text Recommended</span>`;
      } else {
        contrastBadgeEl.innerHTML = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-900 border border-neutral-300">Light Text Recommended</span>`;
      }
    }
  }

  // Interactive Loupe (Magnifier on Mousemove)
  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const canvasX = Math.floor(mouseX * scaleX);
    const canvasY = Math.floor(mouseY * scaleY);

    // Position loupe near cursor
    if (loupeContainer) {
      loupeContainer.classList.remove("hidden");
      // Offset so cursor doesn't obscure
      let posX = mouseX + 16;
      let posY = mouseY + 16;
      if (posX + 100 > rect.width) posX = mouseX - 100;
      if (posY + 100 > rect.height) posY = mouseY - 100;

      loupeContainer.style.transform = `translate(${posX}px, ${posY}px)`;
    }

    // Draw magnified pixels inside loupe canvas
    const loupeW = loupeCanvas.width;
    const loupeH = loupeCanvas.height;
    const sampleSize = 11; // 11x11 pixel area around cursor
    const halfSample = Math.floor(sampleSize / 2);

    loupeCtx.imageSmoothingEnabled = false;
    loupeCtx.clearRect(0, 0, loupeW, loupeH);

    loupeCtx.drawImage(
      canvas,
      canvasX - halfSample,
      canvasY - halfSample,
      sampleSize,
      sampleSize,
      0,
      0,
      loupeW,
      loupeH
    );

    // Crosshair in center
    loupeCtx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    loupeCtx.lineWidth = 1.5;
    loupeCtx.strokeRect(loupeW / 2 - 4, loupeH / 2 - 4, 8, 8);
    loupeCtx.strokeStyle = "rgba(0, 0, 0, 0.7)";
    loupeCtx.strokeRect(loupeW / 2 - 5, loupeH / 2 - 5, 10, 10);
  });

  canvas.addEventListener("mouseleave", () => {
    loupeContainer?.classList.add("hidden");
  });

  // Click on canvas to sample color
  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const canvasX = Math.floor((e.clientX - rect.left) * scaleX);
    const canvasY = Math.floor((e.clientY - rect.top) * scaleY);

    selectPixelColor(canvasX, canvasY);
  });

  // Extract Dominant Palette
  function extractDominantPalette() {
    if (!canvas || !paletteContainer) return;

    // Subsample image to 100x100 for fast quantization
    const thumbCanvas = document.createElement("canvas");
    thumbCanvas.width = 100;
    thumbCanvas.height = 100;
    const thumbCtx = thumbCanvas.getContext("2d");
    thumbCtx.drawImage(baseImage, 0, 0, 100, 100);

    const data = thumbCtx.getImageData(0, 0, 100, 100).data;
    const colorCounts = {};

    // Quantize by rounding rgb to step of 16
    for (let i = 0; i < data.length; i += 16) {
      const r = Math.round(data[i] / 16) * 16;
      const g = Math.round(data[i + 1] / 16) * 16;
      const b = Math.round(data[i + 2] / 16) * 16;
      const key = `${r},${g},${b}`;
      colorCounts[key] = (colorCounts[key] || 0) + 1;
    }

    // Sort by frequency
    const sorted = Object.entries(colorCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => {
        const [r, g, b] = k.split(",").map(Number);
        return { r, g, b, hex: rgbToHex(r, g, b) };
      });

    // Filter distinct colors (ensure minimum Euclidean color distance)
    const distinct = [];
    for (const c of sorted) {
      const isTooClose = distinct.some((d) => {
        const dist = Math.sqrt(
          Math.pow(c.r - d.r, 2) + Math.pow(c.g - d.g, 2) + Math.pow(c.b - d.b, 2)
        );
        return dist < 45;
      });
      if (!isTooClose) {
        distinct.push(c);
      }
      if (distinct.length >= 8) break;
    }

    extractedPalette = distinct;
    renderPaletteUI(distinct);
  }

  function renderPaletteUI(palette) {
    if (!paletteContainer) return;
    paletteContainer.innerHTML = "";

    palette.forEach((item, index) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className =
        "group flex items-center gap-2.5 p-2 rounded-xl border border-border-default bg-surface hover:border-brand-500 transition-all text-left w-full";
      chip.innerHTML = `
        <div class="w-8 h-8 rounded-lg border border-neutral-300 shadow-xs flex-shrink-0" style="background-color: ${item.hex}"></div>
        <div class="min-w-0 flex-1">
          <div class="text-xs font-mono font-bold text-text-primary uppercase">${item.hex}</div>
          <div class="text-[10px] text-text-tertiary">rgb(${item.r}, ${item.g}, ${item.b})</div>
        </div>
        <span class="text-xs text-text-tertiary group-hover:text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity">Select</span>
      `;

      chip.addEventListener("click", () => {
        if (hexValueEl) hexValueEl.textContent = item.hex;
        if (rgbValueEl) rgbValueEl.textContent = `rgb(${item.r}, ${item.g}, ${item.b})`;
        if (hslValueEl) hslValueEl.textContent = rgbToHsl(item.r, item.g, item.b);
        if (cmykValueEl) cmykValueEl.textContent = rgbToCmyk(item.r, item.g, item.b);
        if (colorSwatchEl) colorSwatchEl.style.backgroundColor = item.hex;

        const lum = getLuminance(item.r, item.g, item.b);
        if (contrastBadgeEl) {
          if (lum > 0.45) {
            contrastBadgeEl.innerHTML = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-900 text-white">Dark Text Recommended</span>`;
          } else {
            contrastBadgeEl.innerHTML = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-900 border border-neutral-300">Light Text Recommended</span>`;
          }
        }
      });

      paletteContainer.appendChild(chip);
    });
  }

  // Copy CSS Variables
  copyCssBtn?.addEventListener("click", () => {
    if (!extractedPalette.length) return;
    const cssVars =
      ":root {\n" +
      extractedPalette.map((c, i) => `  --palette-color-${i + 1}: ${c.hex};`).join("\n") +
      "\n}";
    navigator.clipboard.writeText(cssVars).then(() => {
      const orig = copyCssBtn.textContent;
      copyCssBtn.textContent = "Copied CSS!";
      setTimeout(() => (copyCssBtn.textContent = orig), 1500);
    });
  });

  // Copy JSON
  copyJsonBtn?.addEventListener("click", () => {
    if (!extractedPalette.length) return;
    const jsonStr = JSON.stringify(
      extractedPalette.map((c, i) => ({
        id: i + 1,
        hex: c.hex,
        rgb: `rgb(${c.r}, ${c.g}, ${c.b})`,
        hsl: rgbToHsl(c.r, c.g, c.b),
      })),
      null,
      2
    );
    navigator.clipboard.writeText(jsonStr).then(() => {
      const orig = copyJsonBtn.textContent;
      copyJsonBtn.textContent = "Copied JSON!";
      setTimeout(() => (copyJsonBtn.textContent = orig), 1500);
    });
  });

  // Reset
  resetBtn?.addEventListener("click", () => {
    baseImage = null;
    extractedPalette = [];
    if (fileInput) fileInput.value = "";
    workspace.classList.add("hidden");
    uploadZone.classList.remove("hidden");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });
}
