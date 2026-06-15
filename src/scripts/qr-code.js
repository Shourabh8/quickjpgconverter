/**
 * Client-side QR Code Generator.
 * Supports: URL, Text, Email, Phone, WiFi, vCard
 * Downloads: PNG, SVG, PDF, Copy to clipboard
 *
 * Usage: initQRCodeGenerator()
 */

let currentQR = null;
let currentDataURL = null;

export function initQRCodeGenerator() {
  const previewEl = document.getElementById("qr-preview");
  const sizeSlider = document.getElementById("qr-size");
  const sizeValue = document.getElementById("qr-size-value");
  const fgColor = document.getElementById("qr-fg-color");
  const bgColor = document.getElementById("qr-bg-color");
  const errorLevel = document.getElementById("qr-error-level");
  const marginSlider = document.getElementById("qr-margin");
  const marginValue = document.getElementById("qr-margin-value");
  const logoUpload = document.getElementById("qr-logo-upload");
  const logoPreview = document.getElementById("qr-logo-preview");
  const logoRemove = document.getElementById("qr-logo-remove");

  // Download buttons
  const downloadPNG = document.getElementById("download-png");
  const downloadSVG = document.getElementById("download-svg");
  const downloadPDF = document.getElementById("download-pdf");
  const copyClipboard = document.getElementById("copy-clipboard");

  // Input tabs
  const tabs = document.querySelectorAll("[data-tab]");
  const tabPanels = document.querySelectorAll("[data-tab-panel]");

  if (!previewEl) return;

  let logoImage = null;

  // --- Tab switching ---
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;

      // Update tab styles
      tabs.forEach((t) => {
        t.classList.remove("bg-brand-600", "text-white", "border-brand-600");
        t.classList.add("bg-surface", "text-text-secondary", "border-border-default");
      });
      tab.classList.remove("bg-surface", "text-text-secondary", "border-border-default");
      tab.classList.add("bg-brand-600", "text-white", "border-brand-600");

      // Show/hide panels
      tabPanels.forEach((panel) => {
        if (panel.dataset.tabPanel === target) {
          panel.classList.remove("hidden");
        } else {
          panel.classList.add("hidden");
        }
      });

      generateQR();
    });
  });

  // --- Live preview on input changes ---
  const allInputs = document.querySelectorAll("[data-qr-input]");
  allInputs.forEach((input) => {
    input.addEventListener("input", () => generateQR());
    input.addEventListener("change", () => generateQR());
  });

  // --- Size slider ---
  sizeSlider?.addEventListener("input", () => {
    sizeValue.textContent = sizeSlider.value + "px";
    generateQR();
  });

  // --- Margin slider ---
  marginSlider?.addEventListener("input", () => {
    marginValue.textContent = marginSlider.value + "px";
    generateQR();
  });

  // --- Color pickers ---
  fgColor?.addEventListener("input", () => generateQR());
  bgColor?.addEventListener("input", () => generateQR());

  // --- Error level ---
  errorLevel?.addEventListener("change", () => generateQR());

  // --- Logo upload ---
  logoUpload?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        logoImage = img;
        logoPreview?.classList.remove("hidden");
        generateQR();
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  logoRemove?.addEventListener("click", () => {
    logoImage = null;
    logoPreview?.classList.add("hidden");
    if (logoUpload) logoUpload.value = "";
    generateQR();
  });

  // --- Generate QR ---
  function generateQR() {
    const data = getActiveInputData();
    if (!data) {
      previewEl.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full text-text-tertiary">
          <svg class="w-16 h-16 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
          </svg>
          <p class="text-sm">Enter data to generate QR code</p>
        </div>
      `;
      currentDataURL = null;
      return;
    }

    const size = parseInt(sizeSlider?.value || "256");
    const fg = fgColor?.value || "#000000";
    const bg = bgColor?.value || "#ffffff";
    const level = errorLevel?.value || "M";
    const margin = parseInt(marginSlider?.value || "4");

    // Clear previous
    previewEl.innerHTML = "";

    try {
      currentQR = new QRCode(previewEl, {
        text: data,
        width: size,
        height: size,
        colorDark: fg,
        colorLight: bg,
        correctLevel: QRCode.CorrectLevel[level],
      });

      // Wait for render then add logo and get dataURL
      setTimeout(() => {
        const canvas = previewEl.querySelector("canvas");
        if (canvas) {
          if (logoImage) {
            addLogoToCanvas(canvas, logoImage);
          }
          currentDataURL = canvas.toDataURL("image/png");
        }
        // Hide the auto-generated table if present
        const table = previewEl.querySelector("table");
        if (table) table.style.display = "none";
      }, 100);
    } catch (err) {
      console.error("QR generation failed:", err);
      previewEl.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full text-danger">
          <p class="text-sm">Failed to generate QR code</p>
          <p class="text-xs mt-1">${err.message}</p>
        </div>
      `;
    }
  }

  function addLogoToCanvas(canvas, logo) {
    const ctx = canvas.getContext("2d");
    const logoSize = canvas.width * 0.2;
    const x = (canvas.width - logoSize) / 2;
    const y = (canvas.height - logoSize) / 2;

    // Draw white background circle for logo
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, logoSize / 2 + 4, 0, Math.PI * 2);
    ctx.fill();

    // Draw logo
    ctx.drawImage(logo, x, y, logoSize, logoSize);
  }

  function getActiveInputData() {
    const activeTab = document.querySelector("[data-tab].bg-brand-600");
    if (!activeTab) return null;

    const tabType = activeTab.dataset.tab;

    switch (tabType) {
      case "url": {
        const input = document.getElementById("input-url");
        return input?.value?.trim() || null;
      }
      case "text": {
        const input = document.getElementById("input-text");
        return input?.value?.trim() || null;
      }
      case "email": {
        const email = document.getElementById("input-email")?.value?.trim();
        const subject = document.getElementById("input-email-subject")?.value?.trim();
        const body = document.getElementById("input-email-body")?.value?.trim();
        if (!email) return null;
        let mailto = `mailto:${email}`;
        const params = [];
        if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
        if (body) params.push(`body=${encodeURIComponent(body)}`);
        if (params.length) mailto += "?" + params.join("&");
        return mailto;
      }
      case "phone": {
        const input = document.getElementById("input-phone");
        return input?.value?.trim() ? `tel:${input.value.trim()}` : null;
      }
      case "wifi": {
        const ssid = document.getElementById("input-wifi-ssid")?.value?.trim();
        const password = document.getElementById("input-wifi-pass")?.value?.trim();
        const encryption = document.getElementById("input-wifi-enc")?.value || "WPA";
        if (!ssid) return null;
        return `WIFI:T:${encryption};S:${ssid};P:${password || ""};;`;
      }
      case "vcard": {
        const fn = document.getElementById("input-vcard-name")?.value?.trim();
        const org = document.getElementById("input-vcard-org")?.value?.trim();
        const title = document.getElementById("input-vcard-title")?.value?.trim();
        const phone = document.getElementById("input-vcard-phone")?.value?.trim();
        const email = document.getElementById("input-vcard-email")?.value?.trim();
        const url = document.getElementById("input-vcard-url")?.value?.trim();
        if (!fn) return null;

        let vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${fn}`;
        if (org) vcard += `\nORG:${org}`;
        if (title) vcard += `\nTITLE:${title}`;
        if (phone) vcard += `\nTEL:${phone}`;
        if (email) vcard += `\nEMAIL:${email}`;
        if (url) vcard += `\nURL:${url}`;
        vcard += `\nEND:VCARD`;
        return vcard;
      }
      default:
        return null;
    }
  }

  // --- Download as PNG ---
  downloadPNG?.addEventListener("click", () => {
    const canvas = previewEl.querySelector("canvas");
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = "qr-code.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  });

  // --- Download as SVG ---
  downloadSVG?.addEventListener("click", () => {
    const canvas = previewEl.querySelector("canvas");
    if (!canvas) return;

    const size = parseInt(sizeSlider?.value || "256");
    const fg = fgColor?.value || "#000000";
    const bg = bgColor?.value || "#ffffff";
    const data = getActiveInputData();
    if (!data) return;

    // Generate SVG from QR matrix
    const svg = generateSVG(data, size, fg, bg);
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = "qr-code.svg";
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  });

  function generateSVG(text, size, fg, bg) {
    // Use a simple QR encoding approach for SVG
    const qr = new QRCode(null, {
      text,
      width: size,
      height: size,
      correctLevel: QRCode.CorrectLevel[errorLevel?.value || "M"],
    });

    // Get the module count from the QR code
    const moduleCount = qr.getModuleCount();
    const cellSize = size / moduleCount;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;
    svg += `<rect width="${size}" height="${size}" fill="${bg}"/>`;

    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (qr.isDark(row, col)) {
          svg += `<rect x="${col * cellSize}" y="${row * cellSize}" width="${cellSize}" height="${cellSize}" fill="${fg}"/>`;
        }
      }
    }

    svg += `</svg>`;
    return svg;
  }

  // --- Download as PDF ---
  downloadPDF?.addEventListener("click", async () => {
    const canvas = previewEl.querySelector("canvas");
    if (!canvas) return;

    try {
      // Dynamic import jsPDF from CDN
      const { jsPDF } = await import("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "square",
        unit: "px",
        format: [canvas.width, canvas.height],
      });

      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save("qr-code.pdf");
    } catch (err) {
      console.error("PDF generation failed:", err);
      // Fallback: download as PNG
      const link = document.createElement("a");
      link.download = "qr-code.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    }
  });

  // --- Copy to clipboard ---
  copyClipboard?.addEventListener("click", async () => {
    const canvas = previewEl.querySelector("canvas");
    if (!canvas) return;

    try {
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);

      // Show success feedback
      const originalText = copyClipboard.innerHTML;
      copyClipboard.innerHTML = `
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
        Copied!
      `;
      copyClipboard.classList.add("bg-success", "text-white", "border-success");
      setTimeout(() => {
        copyClipboard.innerHTML = originalText;
        copyClipboard.classList.remove("bg-success", "text-white", "border-success");
      }, 2000);
    } catch (err) {
      console.error("Copy failed:", err);
      // Fallback: copy data URL
      try {
        await navigator.clipboard.writeText(currentDataURL || "");
        alert("QR code data URL copied to clipboard");
      } catch {
        alert("Failed to copy. Try downloading instead.");
      }
    }
  });

  // Initial generation
  generateQR();
}
