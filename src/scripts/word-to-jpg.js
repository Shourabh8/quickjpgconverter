/**
 * Client-side Word DOCX to JPG converter.
 * Uses mammoth.js for DOCX parsing and Canvas for rendering.
 *
 * Usage: initWordConverter()
 */

const MAMMOTH_CDN = "https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js";

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

async function loadMammoth() {
  if (window.mammoth) return window.mammoth;
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = MAMMOTH_CDN;
    script.onload = () => resolve(window.mammoth);
    script.onerror = () => reject(new Error("Failed to load mammoth.js"));
    document.head.appendChild(script);
  });
}

function renderHtmlToCanvas(html, width = 800) {
  return new Promise((resolve) => {
    const container = document.createElement("div");
    container.style.cssText = `
      position: absolute; left: -9999px; top: 0;
      width: ${width}px; padding: 40px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px; line-height: 1.6; color: #1a1a1a;
      background: white;
    `;
    container.innerHTML = html;
    document.body.appendChild(container);

    const imgs = container.querySelectorAll("img");
    const imgPromises = Array.from(imgs).map((img) => {
      return new Promise((res) => {
        if (img.complete) res();
        else {
          img.onload = res;
          img.onerror = res;
        }
      });
    });

    Promise.all(imgPromises).then(() => {
      requestAnimationFrame(() => {
        const canvas = document.createElement("canvas");
        const scale = 2;
        canvas.width = width * scale;
        canvas.height = container.scrollHeight * scale;
        const ctx = canvas.getContext("2d");
        ctx.scale(scale, scale);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, container.scrollHeight);

        const style = getComputedStyle(container);
        ctx.font = `${style.fontSize} ${style.fontFamily}`;
        ctx.fillStyle = "#1a1a1a";
        ctx.textBaseline = "top";

        let y = 40;
        const processNode = (node) => {
          if (node.nodeType === 3) {
            const text = node.textContent;
            if (text.trim()) {
              const words = text.split(/\s+/);
              let line = "";
              for (const word of words) {
                const testLine = line + (line ? " " : "") + word;
                const metrics = ctx.measureText(testLine);
                if (metrics.width > width - 80 && line) {
                  ctx.fillText(line, 40, y);
                  y += parseFloat(style.fontSize) * parseFloat(style.lineHeight || 1.6);
                  line = word;
                } else {
                  line = testLine;
                }
              }
              if (line) {
                ctx.fillText(line, 40, y);
                y += parseFloat(style.fontSize) * parseFloat(style.lineHeight || 1.6);
              }
            }
          } else if (node.nodeType === 1) {
            const tag = node.tagName.toLowerCase();
            const fontSize = parseFloat(style.fontSize);

            if (tag === "h1") {
              y += 10;
              ctx.font = `bold ${fontSize * 1.8}px ${style.fontFamily}`;
              ctx.fillText(node.textContent, 40, y);
              y += fontSize * 2.2;
              ctx.font = `${style.fontSize} ${style.fontFamily}`;
            } else if (tag === "h2") {
              y += 8;
              ctx.font = `bold ${fontSize * 1.4}px ${style.fontFamily}`;
              ctx.fillText(node.textContent, 40, y);
              y += fontSize * 1.8;
              ctx.font = `${style.fontSize} ${style.fontFamily}`;
            } else if (tag === "h3") {
              y += 6;
              ctx.font = `bold ${fontSize * 1.2}px ${style.fontFamily}`;
              ctx.fillText(node.textContent, 40, y);
              y += fontSize * 1.5;
              ctx.font = `${style.fontSize} ${style.fontFamily}`;
            } else if (tag === "p" || tag === "div") {
              for (const child of node.childNodes) {
                processNode(child);
              }
              y += 4;
            } else if (tag === "ul" || tag === "ol") {
              for (const child of node.childNodes) {
                if (child.tagName === "LI") {
                  ctx.fillText("  •  " + child.textContent, 40, y);
                  y += fontSize * 1.6;
                }
              }
              y += 4;
            } else {
              for (const child of node.childNodes) {
                processNode(child);
              }
            }
          }
        };

        for (const child of container.childNodes) {
          processNode(child);
        }

        document.body.removeChild(container);
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92);
      });
    });
  });
}

export function initWordConverter() {
  let files = [];
  let convertedBlobs = [];

  const dropArea = document.getElementById("drop-area");
  const fileInput = dropArea?.querySelector('input[type="file"]');
  const uploadZone = document.getElementById("upload-zone");
  const previewZone = document.getElementById("preview-zone");
  const previewGrid = document.getElementById("preview-grid");
  const fileCount = document.getElementById("file-count");
  const clearBtn = document.getElementById("clear-btn");
  const convertBtn = document.getElementById("convert-btn");
  const convertBtnArea = document.getElementById("convert-btn-area");
  const downloadArea = document.getElementById("download-area");
  const dropOverlay = document.getElementById("drop-overlay");
  const progressArea = document.getElementById("progress-area");
  const progressBar = document.getElementById("progress-bar");
  const progressText = document.getElementById("progress-text");

  if (!dropArea || !uploadZone) return;

  dropArea.setAttribute("tabindex", "0");
  dropArea.setAttribute("role", "button");
  dropArea.setAttribute("aria-label", "Upload Word documents. Press Enter or Space to browse.");

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
    addFiles(droppedFiles);
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
    addFiles(Array.from(fileInput.files));
    fileInput.value = "";
  });

  clearBtn?.addEventListener("click", () => {
    files = [];
    convertedBlobs = [];
    showUploadZone();
  });

  convertBtn?.addEventListener("click", () => {
    convertAll();
  });

  function addFiles(newFiles) {
    const valid = newFiles.filter((f) => {
      const ext = getExtension(f.name);
      if (!["docx", "doc"].includes(ext)) {
        alert(f.name + " is not a Word document (.docx).");
        return false;
      }
      if (ext === "doc") {
        alert(f.name + " is an old .doc format. Please save as .docx first.");
        return false;
      }
      if (f.size > 50 * 1024 * 1024) {
        alert(f.name + " exceeds 50MB limit.");
        return false;
      }
      return true;
    });

    files = [...files, ...valid];
    convertedBlobs = [];

    if (files.length > 0) {
      showPreviewZone();
    }
  }

  function showUploadZone() {
    uploadZone.classList.remove("hidden");
    previewZone?.classList.add("hidden");
    convertBtnArea?.classList.remove("hidden");
    downloadArea?.classList.add("hidden");
    progressArea?.classList.add("hidden");
    convertBtn?.classList.add("opacity-50", "cursor-not-allowed");
    convertBtn?.setAttribute("disabled", "");
  }

  function showPreviewZone() {
    uploadZone.classList.add("hidden");
    previewZone?.classList.remove("hidden");
    convertBtnArea?.classList.remove("hidden");
    downloadArea?.classList.add("hidden");
    progressArea?.classList.add("hidden");
    convertBtn?.classList.remove("opacity-50", "cursor-not-allowed");
    convertBtn?.removeAttribute("disabled");

    fileCount.textContent = files.length === 1
      ? "1 file ready"
      : files.length + " files ready";

    renderPreviewGrid();
  }

  function renderPreviewGrid() {
    if (!previewGrid) return;
    previewGrid.innerHTML = "";

    files.forEach((file, i) => {
      const card = document.createElement("div");
      card.className = "relative rounded-lg border border-border-default bg-surface overflow-hidden";

      const iconWrapper = document.createElement("div");
      iconWrapper.className = "aspect-[4/3] bg-surface-subtle flex items-center justify-center overflow-hidden";
      iconWrapper.innerHTML = `
        <div class="flex flex-col items-center gap-2">
          <svg class="w-12 h-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <span class="text-xs text-text-tertiary font-medium">DOCX</span>
        </div>
      `;

      const info = document.createElement("div");
      info.className = "px-3 py-2 border-t border-border-default";
      info.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-text-primary truncate max-w-[70%]">${file.name}</span>
          <span class="text-xs text-text-tertiary">${formatBytes(file.size)}</span>
        </div>
        <div class="flex items-center justify-between mt-1">
          <span class="text-xs text-text-tertiary">→ JPG</span>
          <button data-remove="${i}" class="text-xs text-danger hover:text-danger/80 font-medium transition-colors">Remove</button>
        </div>
      `;

      card.appendChild(iconWrapper);
      card.appendChild(info);
      previewGrid.appendChild(card);
    });

    previewGrid.querySelectorAll("[data-remove]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.remove);
        files.splice(idx, 1);
        convertedBlobs.splice(idx, 1);
        if (files.length === 0) {
          showUploadZone();
        } else {
          renderPreviewGrid();
          fileCount.textContent = files.length === 1
            ? "1 file ready"
            : files.length + " files ready";
        }
      });
    });
  }

  async function convertAll() {
    if (files.length === 0) return;

    convertBtn.classList.add("opacity-50", "cursor-not-allowed");
    convertBtn.setAttribute("disabled", "");
    progressArea?.classList.remove("hidden");
    downloadArea?.classList.add("hidden");
    convertedBlobs = [];

    let mammoth;
    try {
      mammoth = await loadMammoth();
    } catch (err) {
      alert("Failed to load conversion library. Please refresh and try again.");
      convertBtn.classList.remove("opacity-50", "cursor-not-allowed");
      convertBtn.removeAttribute("disabled");
      progressArea?.classList.add("hidden");
      return;
    }

    for (let i = 0; i < files.length; i++) {
      const pct = Math.round(((i) / files.length) * 100);
      progressBar.style.width = pct + "%";
      progressText.textContent = `Converting ${i + 1} of ${files.length}...`;

      try {
        const arrayBuffer = await files[i].arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        const html = result.value || "<p>(empty document)</p>";
        const blob = await renderHtmlToCanvas(html);

        convertedBlobs.push({
          blob,
          name: files[i].name.replace(/\.docx$/i, "") + ".jpg",
          originalName: files[i].name,
          originalSize: files[i].size,
        });
      } catch (err) {
        console.error("Conversion failed:", files[i].name, err);
        convertedBlobs.push({
          failed: true,
          name: files[i].name,
          error: err.message || "Conversion failed",
        });
      }
    }

    progressBar.style.width = "100%";
    progressText.textContent = "Conversion complete!";

    setTimeout(() => {
      progressArea?.classList.add("hidden");
      convertBtnArea?.classList.add("hidden");
      downloadArea?.classList.remove("hidden");
      renderDownloadArea();
    }, 500);
  }

  function renderDownloadArea() {
    if (!downloadArea) return;

    const successCount = convertedBlobs.filter((item) => item && !item.failed).length;
    const failCount = convertedBlobs.filter((item) => item && item.failed).length;

    let html = `
      <div class="p-4 rounded-xl border border-success/30 bg-success/5 mb-4">
        <div class="flex items-center gap-2 mb-2">
          <svg class="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-sm font-semibold text-success">${successCount} file${successCount !== 1 ? "s" : ""} converted!</span>
        </div>
        ${failCount > 0 ? `<p class="text-xs text-danger">${failCount} file${failCount !== 1 ? "s" : ""} failed</p>` : ""}
      </div>
    `;

    convertedBlobs.forEach((item, i) => {
      if (!item) return;
      if (item.failed) {
        html += `
          <div class="flex items-center justify-between p-3 rounded-lg border border-danger/30 bg-danger/5 mb-2">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center flex-shrink-0">
                <svg class="w-4 h-4 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <div class="min-w-0">
                <div class="text-xs font-medium text-text-primary truncate">${item.name}</div>
                <div class="text-xs text-danger">${item.error}</div>
              </div>
            </div>
          </div>
        `;
        return;
      }
      html += `
        <div class="flex items-center justify-between p-3 rounded-lg border border-border-default bg-surface mb-2">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/50 flex items-center justify-center flex-shrink-0">
              <svg class="w-4 h-4 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div class="min-w-0">
              <div class="text-xs font-medium text-text-primary truncate">${item.name}</div>
              <div class="text-xs text-text-tertiary">${formatBytes(item.originalSize)} → ${formatBytes(item.blob.size)}</div>
            </div>
          </div>
          <button data-download="${i}" class="btn-primary btn-sm flex-shrink-0 ml-3">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download
          </button>
        </div>
      `;
    });

    if (successCount > 1) {
      html += `
        <button id="download-all-btn" class="w-full btn-primary btn-lg justify-center mt-4">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Download All (${successCount} files as ZIP)
        </button>
      `;
    }

    html += `
      <p class="text-xs text-text-tertiary text-center mt-3">
        Converted locally in your browser · Your files never left your device
      </p>
      <button id="convert-more-btn" class="w-full btn-secondary btn-md justify-center mt-3">
        Convert More Files
      </button>
    `;

    downloadArea.innerHTML = html;

    downloadArea.querySelectorAll("[data-download]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.download);
        downloadBlob(convertedBlobs[idx].blob, convertedBlobs[idx].name);
      });
    });

    downloadArea.querySelector("#download-all-btn")?.addEventListener("click", downloadAll);

    downloadArea.querySelector("#convert-more-btn")?.addEventListener("click", () => {
      files = [];
      convertedBlobs = [];
      showUploadZone();
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
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function downloadAll() {
    const items = convertedBlobs.filter((item) => item && !item.failed);
    if (items.length === 0) return;
    const { default: JSZip } = await import("https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm");
    const zip = new JSZip();
    items.forEach((item) => zip.file(item.name, item.blob));
    const content = await zip.generateAsync({ type: "blob" });
    downloadBlob(content, "converted-documents.zip");
  }
}
