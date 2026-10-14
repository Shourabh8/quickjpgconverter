/**
 * Client-Side Watermark Tool
 * 100% in-browser processing via HTML5 Canvas.
 * Supports: Text Watermark, Logo/Image Watermark, 3x3 Grid Positioning,
 * Tile/Repeat Pattern, Rotation, Opacity, and Full-Resolution Export.
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

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function initWatermarkTool() {
  const uploadZone = document.getElementById("watermark-upload-zone");
  const dropArea = document.getElementById("watermark-drop-area");
  const fileInput = document.getElementById("watermark-file-input");
  const workspace = document.getElementById("watermark-workspace");
  const canvas = document.getElementById("watermark-canvas");
  if (!canvas || !uploadZone || !workspace) return;

  const ctx = canvas.getContext("2d");

  // State
  let baseImage = null;
  let baseFile = null;
  let logoImage = null;
  let activeTab = "text"; // "text" | "logo"
  let position = "bottom-right"; // top-left, top-center, top-right, center-left, center, center-right, bottom-left, bottom-center, bottom-right
  let isTiled = false;

  // DOM Controls
  const tabTextBtn = document.getElementById("tab-text-btn");
  const tabLogoBtn = document.getElementById("tab-logo-btn");
  const textControls = document.getElementById("text-watermark-controls");
  const logoControls = document.getElementById("logo-watermark-controls");

  // Text Controls
  const watermarkText = document.getElementById("watermark-text");
  const fontSelect = document.getElementById("watermark-font");
  const fontSizeSlider = document.getElementById("watermark-font-size");
  const fontSizeVal = document.getElementById("watermark-font-size-val");
  const textColor = document.getElementById("watermark-color");
  const textOpacity = document.getElementById("watermark-text-opacity");
  const textOpacityVal = document.getElementById("watermark-text-opacity-val");
  const textRotation = document.getElementById("watermark-text-rotation");
  const textRotationVal = document.getElementById("watermark-text-rotation-val");

  // Logo Controls
  const logoInput = document.getElementById("watermark-logo-input");
  const logoDropArea = document.getElementById("watermark-logo-drop");
  const logoPreview = document.getElementById("watermark-logo-preview");
  const logoScale = document.getElementById("watermark-logo-scale");
  const logoScaleVal = document.getElementById("watermark-logo-scale-val");
  const logoOpacity = document.getElementById("watermark-logo-opacity");
  const logoOpacityVal = document.getElementById("watermark-logo-opacity-val");

  // Common Controls
  const tileToggle = document.getElementById("watermark-tile-toggle");
  const posButtons = document.querySelectorAll(".pos-btn");
  const formatSelect = document.getElementById("watermark-format");
  const qualitySlider = document.getElementById("watermark-quality");
  const qualityVal = document.getElementById("watermark-quality-val");
  const qualityRow = document.getElementById("watermark-quality-row");
  const downloadBtn = document.getElementById("watermark-download-btn");
  const resetBtn = document.getElementById("watermark-reset-btn");
  const imageInfo = document.getElementById("watermark-image-info");

  // Tabs
  tabTextBtn?.addEventListener("click", () => {
    activeTab = "text";
    tabTextBtn.classList.add("bg-brand-600", "text-white", "border-brand-600");
    tabTextBtn.classList.remove("bg-surface", "text-text-secondary");
    tabLogoBtn.classList.remove("bg-brand-600", "text-white", "border-brand-600");
    tabLogoBtn.classList.add("bg-surface", "text-text-secondary");
    textControls?.classList.remove("hidden");
    logoControls?.classList.add("hidden");
    render();
  });

  tabLogoBtn?.addEventListener("click", () => {
    activeTab = "logo";
    tabLogoBtn.classList.add("bg-brand-600", "text-white", "border-brand-600");
    tabLogoBtn.classList.remove("bg-surface", "text-text-secondary");
    tabTextBtn.classList.remove("bg-brand-600", "text-white", "border-brand-600");
    tabTextBtn.classList.add("bg-surface", "text-text-secondary");
    logoControls?.classList.remove("hidden");
    textControls?.classList.add("hidden");
    render();
  });

  // Position Buttons
  posButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      posButtons.forEach((b) => {
        b.classList.remove("bg-brand-600", "text-white", "border-brand-600");
        b.classList.add("bg-surface", "text-text-secondary");
      });
      btn.classList.add("bg-brand-600", "text-white", "border-brand-600");
      btn.classList.remove("bg-surface", "text-text-secondary");
      position = btn.dataset.pos || "bottom-right";
      render();
    });
  });

  // Tile toggle
  tileToggle?.addEventListener("change", () => {
    isTiled = tileToggle.checked;
    render();
  });

  // Slider events
  fontSizeSlider?.addEventListener("input", () => {
    if (fontSizeVal) fontSizeVal.textContent = fontSizeSlider.value + "px";
    render();
  });

  textOpacity?.addEventListener("input", () => {
    if (textOpacityVal) textOpacityVal.textContent = textOpacity.value + "%";
    render();
  });

  textRotation?.addEventListener("input", () => {
    if (textRotationVal) textRotationVal.textContent = textRotation.value + "°";
    render();
  });

  watermarkText?.addEventListener("input", render);
  fontSelect?.addEventListener("change", render);
  textColor?.addEventListener("input", render);

  logoScale?.addEventListener("input", () => {
    if (logoScaleVal) logoScaleVal.textContent = logoScale.value + "%";
    render();
  });

  logoOpacity?.addEventListener("input", () => {
    if (logoOpacityVal) logoOpacityVal.textContent = logoOpacity.value + "%";
    render();
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

  // Drop area & File Input for Base Image
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
    if (e.dataTransfer.files.length) handleBaseFile(e.dataTransfer.files[0]);
  });

  fileInput?.addEventListener("change", () => {
    if (fileInput.files.length) handleBaseFile(fileInput.files[0]);
  });

  // Logo file drop
  logoDropArea?.addEventListener("click", () => logoInput?.click());
  logoInput?.addEventListener("change", () => {
    if (logoInput.files.length) handleLogoFile(logoInput.files[0]);
  });

  function handleBaseFile(file) {
    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file (JPG, PNG, WebP, etc.).");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      alert("File is too large (max 50MB).");
      return;
    }
    baseFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        baseImage = img;
        uploadZone.classList.add("hidden");
        workspace.classList.remove("hidden");
        if (imageInfo) {
          imageInfo.textContent = `${file.name} · ${img.naturalWidth} × ${img.naturalHeight}px · ${formatBytes(file.size)}`;
        }
        render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function handleLogoFile(file) {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        logoImage = img;
        if (logoPreview) {
          logoPreview.innerHTML = `<img src="${e.target.result}" class="max-h-12 max-w-[120px] object-contain rounded border border-border-default bg-surface" alt="Logo preview" />`;
        }
        render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function getCoordinates(targetWidth, targetHeight, itemWidth, itemHeight, pos, padding = 40) {
    let x = padding;
    let y = padding;

    if (pos.includes("right")) {
      x = targetWidth - itemWidth - padding;
    } else if (pos.includes("center")) {
      x = (targetWidth - itemWidth) / 2;
    } else {
      x = padding;
    }

    if (pos.includes("bottom")) {
      y = targetHeight - itemHeight - padding;
    } else if (pos.includes("center") || pos.includes("middle")) {
      y = (targetHeight - itemHeight) / 2;
    } else {
      y = padding;
    }

    return { x, y };
  }

  function render() {
    if (!baseImage) return;

    const w = baseImage.naturalWidth;
    const h = baseImage.naturalHeight;
    canvas.width = w;
    canvas.height = h;

    // Draw original image
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(baseImage, 0, 0, w, h);

    if (activeTab === "text") {
      renderTextWatermark(w, h);
    } else if (activeTab === "logo" && logoImage) {
      renderLogoWatermark(w, h);
    }
  }

  function renderTextWatermark(w, h) {
    const text = watermarkText?.value || "© Your Watermark";
    const font = fontSelect?.value || "Inter, sans-serif";
    // Scale font relative to canvas dimension so slider feels intuitive across both small and 4K images
    const baseSliderVal = parseInt(fontSizeSlider?.value || "36", 10);
    const scaledFontSize = Math.max(14, Math.round((baseSliderVal / 800) * Math.min(w, h) * 1.8));

    const color = textColor?.value || "#ffffff";
    const opacity = parseInt(textOpacity?.value || "70", 10) / 100;
    const rotation = (parseInt(textRotation?.value || "0", 10) * Math.PI) / 180;

    ctx.save();
    ctx.font = `600 ${scaledFontSize}px ${font}`;
    ctx.fillStyle = color;
    ctx.globalAlpha = opacity;
    ctx.textBaseline = "middle";

    const textMetrics = ctx.measureText(text);
    const textWidth = textMetrics.width;
    const textHeight = scaledFontSize;

    if (isTiled) {
      // Repeat across entire image in diagonal grid
      ctx.textAlign = "center";
      const stepX = textWidth + scaledFontSize * 2.5;
      const stepY = textHeight + scaledFontSize * 3;

      for (let x = -w * 0.5; x < w * 1.5; x += stepX) {
        for (let y = -h * 0.5; y < h * 1.5; y += stepY) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(rotation !== 0 ? rotation : -Math.PI / 6); // default -30 deg for tile
          ctx.fillText(text, 0, 0);
          ctx.restore();
        }
      }
    } else {
      // Position based on 3x3 grid
      const pad = Math.max(20, Math.round(Math.min(w, h) * 0.04));
      const { x, y } = getCoordinates(w, h, textWidth, textHeight, position, pad);

      ctx.save();
      // Center of text block for rotation
      const cx = x + textWidth / 2;
      const cy = y + textHeight / 2;
      ctx.translate(cx, cy);
      ctx.rotate(rotation);
      ctx.textAlign = "center";
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }

    ctx.restore();
  }

  function renderLogoWatermark(w, h) {
    if (!logoImage) return;

    const scaleVal = parseInt(logoScale?.value || "30", 10) / 100;
    const opacity = parseInt(logoOpacity?.value || "80", 10) / 100;

    // Target width of logo relative to canvas
    const maxTargetW = w * 0.45 * scaleVal;
    const logoRatio = logoImage.naturalWidth / logoImage.naturalHeight;
    const logoW = maxTargetW;
    const logoH = maxTargetW / logoRatio;

    ctx.save();
    ctx.globalAlpha = opacity;

    if (isTiled) {
      const stepX = logoW * 2;
      const stepY = logoH * 2;
      for (let x = 0; x < w; x += stepX) {
        for (let y = 0; y < h; y += stepY) {
          ctx.drawImage(logoImage, x, y, logoW, logoH);
        }
      }
    } else {
      const pad = Math.max(20, Math.round(Math.min(w, h) * 0.04));
      const { x, y } = getCoordinates(w, h, logoW, logoH, position, pad);
      ctx.drawImage(logoImage, x, y, logoW, logoH);
    }

    ctx.restore();
  }

  // Download
  downloadBtn?.addEventListener("click", () => {
    if (!canvas || !baseFile) return;

    const mime = formatSelect?.value || "image/jpeg";
    const quality = parseInt(qualitySlider?.value || "92", 10) / 100;
    let ext = "jpg";
    if (mime === "image/png") ext = "png";
    if (mime === "image/webp") ext = "webp";

    const baseName = baseFile.name.substring(0, baseFile.name.lastIndexOf(".")) || "image";
    const outputName = `${baseName}_watermarked.${ext}`;

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
    baseImage = null;
    baseFile = null;
    logoImage = null;
    if (fileInput) fileInput.value = "";
    if (logoInput) logoInput.value = "";
    if (logoPreview) logoPreview.innerHTML = "";
    workspace.classList.add("hidden");
    uploadZone.classList.remove("hidden");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });
}
