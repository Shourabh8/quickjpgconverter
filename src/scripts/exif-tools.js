/**
 * EXIF Viewer & Remover — client-side metadata tool
 * Pure binary parsing for JPEG EXIF and PNG metadata. No external dependencies.
 */

const EXIF_TAGS = {
  0x010f: "Camera Make",
  0x0110: "Camera Model",
  0x0112: "Orientation",
  0x011a: "X Resolution",
  0x011b: "Y Resolution",
  0x0131: "Software",
  0x0132: "Date Modified",
  0x013b: "Artist",
  0x8298: "Copyright",
  0x829a: "Exposure Time",
  0x829d: "F-Number",
  0x8827: "ISO",
  0x9000: "Exif Version",
  0x9003: "Date Taken",
  0x9004: "Date Digitized",
  0x9201: "Shutter Speed",
  0x9202: "Aperture",
  0x920a: "Focal Length",
  0xa001: "Color Space",
  0xa002: "Pixel X",
  0xa003: "Pixel Y",
  0xa405: "Focal Length (35mm)",
  0xa430: "Camera Owner",
  0xa431: "Body Serial",
  0xa432: "Lens Info",
  0xa433: "Lens Make",
  0xa434: "Lens Model",
  0xa435: "Lens Serial",
};

const GPS_TAGS = {
  0x0001: "GPS Lat Ref",
  0x0002: "GPS Latitude",
  0x0003: "GPS Lon Ref",
  0x0004: "GPS Longitude",
  0x0005: "GPS Alt Ref",
  0x0006: "GPS Altitude",
  0x0007: "GPS Time Stamp",
  0x001d: "GPS Date Stamp",
};

function readUint16(view, offset, little) {
  return little ? view.getUint16(offset, true) : view.getUint16(offset, false);
}

function readUint32(view, offset, little) {
  return little ? view.getUint32(offset, true) : view.getUint32(offset, false);
}

function readRational(view, offset, little) {
  const num = readUint32(view, offset, little);
  const den = readUint32(view, offset + 4, little);
  return den === 0 ? num : `${num}/${den}`;
}

function readAscii(view, offset, len) {
  let s = "";
  for (let i = 0; i < len; i++) {
    const c = view.getUint8(offset + i);
    if (c === 0) break;
    s += String.fromCharCode(c);
  }
  return s.trim();
}

function readAsciiNullTerm(view, offset, maxLen) {
  let s = "";
  for (let i = 0; i < maxLen; i++) {
    const c = view.getUint8(offset + i);
    if (c === 0) break;
    s += String.fromCharCode(c);
  }
  return s;
}

function formatExposure(val) {
  if (typeof val === "string") return val;
  if (val > 1) return `${val}s`;
  const denom = Math.round(1 / val);
  return `1/${denom}s`;
}

function formatFNumber(val) {
  if (typeof val === "string") return val;
  return `f/${val.toFixed(1)}`;
}

function formatCoord(dms, ref) {
  if (!dms || dms.length < 3) return null;
  const d = typeof dms[0] === "string" ? eval(dms[0]) : dms[0];
  const m = typeof dms[1] === "string" ? eval(dms[1]) : dms[1];
  const s = typeof dms[2] === "string" ? eval(dms[2]) : dms[2];
  let dec = d + m / 60 + s / 3600;
  if (ref === "S" || ref === "W") dec = -dec;
  return dec.toFixed(6);
}

/* ─── JPEG EXIF Parser ─── */

function parseExifFromJpeg(buffer) {
  const view = new DataView(buffer);
  const results = { basic: {}, exif: {}, gps: {}, icc: null };

  // Check JPEG SOI
  if (view.getUint16(0) !== 0xffd8) return null;

  let offset = 2;
  while (offset < view.byteLength - 1) {
    if (view.getUint8(offset) !== 0xff) break;
    const marker = view.getUint8(offset + 1);

    if (marker === 0xe1) {
      // APP1 — EXIF or XMP
      const segLen = readUint16(view, offset + 2, false);
      const sig = readAscii(view, offset + 4, 6);
      if (sig.startsWith("Exif")) {
        parseExifHeader(view, offset + 10, results);
      }
      offset += 2 + segLen;
    } else if (marker === 0xe2) {
      // APP2 — ICC profile
      const segLen = readUint16(view, offset + 2, false);
      const sig = readAscii(view, offset + 4, 12);
      if (sig.startsWith("ICC_PROFILE")) {
        results.icc = "Present";
      }
      offset += 2 + segLen;
    } else if (marker === 0xda) {
      break; // Start of scan
    } else if (marker === 0xd9) {
      break; // EOI
    } else {
      const segLen = readUint16(view, offset + 2, false);
      offset += 2 + segLen;
    }
  }

  return results;
}

function parseExifHeader(view, offset, results) {
  const byteOrder = view.getUint16(offset, false);
  if (byteOrder !== 0x4949 && byteOrder !== 0x4d4d) return;
  const little = byteOrder === 0x4949;
  const ifdOffset = readUint32(view, offset + 4, little);

  // Parse first IFD (0th)
  parseIFD(view, offset, ifdOffset, little, results.exif, EXIF_TAGS);

  // Find ExifIFD pointer
  const exifPtr = results.exif[0x8769];
  if (exifPtr) {
    const exifData = {};
    parseIFD(view, offset, exifPtr, little, exifData, EXIF_TAGS);
    // Merge into exif, replacing raw tag IDs with readable values
    for (const [tag, val] of Object.entries(exifData)) {
      results.exif[tag] = val;
    }
    delete results.exif[0x8769];
  }

  // Find GPS IFD pointer
  const gpsPtr = results.exif[0x8825];
  if (gpsPtr) {
    parseIFD(view, offset, gpsPtr, little, results.gps, GPS_TAGS);
    delete results.exif[0x8825];
  }

  // Flatten exif results into readable key-value pairs
  for (const [tagId, val] of Object.entries(results.exif)) {
    const id = parseInt(tagId);
    const name = EXIF_TAGS[id];
    if (!name) { delete results.exif[tagId]; continue; }

    let display = val;
    if (id === 0x829a) display = formatExposure(val);
    else if (id === 0x829d) display = formatFNumber(val);
    else if (id === 0x9201) display = formatExposure(val);
    else if (id === 0x9202) display = formatFNumber(val);
    else if (id === 0x920a) display = typeof val === "string" ? val : `${eval(val)}mm`;
    else if (id === 0xa405) display = typeof val === "string" ? val : `${val}mm`;
    else if (id === 0xa002 || id === 0xa003) display = `${val} px`;

    results.exif[name] = display;
    delete results.exif[tagId];
  }

  // Format GPS
  const gpsResult = {};
  for (const [tagId, val] of Object.entries(results.gps)) {
    const id = parseInt(tagId);
    const name = GPS_TAGS[id];
    if (!name) continue;
    gpsResult[name] = val;
  }
  results.gps = gpsResult;

  // Compute decimal coordinates
  const lat = results.gps["GPS Latitude"];
  const latRef = results.gps["GPS Lat Ref"];
  const lon = results.gps["GPS Longitude"];
  const lonRef = results.gps["GPS Lon Ref"];
  if (lat && latRef && lon && lonRef) {
    results.gps["Decimal Latitude"] = formatCoord(lat, latRef);
    results.gps["Decimal Longitude"] = formatCoord(lon, lonRef);
    results.gps["Google Maps Link"] = `https://maps.google.com/?q=${results.gps["Decimal Latitude"]},${results.gps["Decimal Longitude"]}`;
  }
}

function parseIFD(view, base, ifdOffset, little, store, tagMap) {
  const count = readUint16(view, base + ifdOffset, little);
  for (let i = 0; i < count; i++) {
    const entryOffset = base + ifdOffset + 2 + i * 12;
    const tag = readUint16(view, entryOffset, little);
    const type = readUint16(view, entryOffset + 2, little);
    const count = readUint32(view, entryOffset + 4, little);
    const valueOffset = entryOffset + 8;

    // ASCII string
    if (type === 2) {
      const strLen = count;
      if (strLen <= 4) {
        store[tag] = readAscii(view, valueOffset, strLen);
      } else {
        const absOffset = readUint32(view, valueOffset, little);
        store[tag] = readAscii(view, base + absOffset, strLen);
      }
      continue;
    }

    // RATIONAL (two uint32s per value)
    if (type === 5) {
      const absOffset = readUint32(view, valueOffset, little);
      if (count === 1) {
        store[tag] = readRational(view, base + absOffset, little);
      } else {
        const vals = [];
        for (let j = 0; j < count; j++) {
          vals.push(readRational(view, base + absOffset + j * 8, little));
        }
        store[tag] = vals;
      }
      continue;
    }

    // SRATIONAL
    if (type === 10) {
      const absOffset = readUint32(view, valueOffset, little);
      if (count === 1) {
        const num = readUint32(view, base + absOffset, little);
        const den = readUint32(view, base + absOffset + 4, little);
        store[tag] = `${num}/${den}`;
      }
      continue;
    }

    // SHORT (uint16)
    if (type === 3) {
      if (count === 1) {
        store[tag] = readUint16(view, valueOffset, little);
      } else {
        const absOffset = readUint32(view, valueOffset, little);
        store[tag] = readUint16(view, base + absOffset, little);
      }
      continue;
    }

    // LONG (uint32)
    if (type === 4) {
      if (count === 1) {
        store[tag] = readUint32(view, valueOffset, little);
      } else {
        const absOffset = readUint32(view, valueOffset, little);
        store[tag] = readUint32(view, base + absOffset, little);
      }
      continue;
    }

    // UNDEFINED or BYTE — skip
    const val = readUint32(view, valueOffset, little);
    if (count <= 4) {
      store[tag] = val;
    }
  }
}

/* ─── PNG Metadata Parser ─── */

function parsePngMetadata(buffer) {
  const view = new DataView(buffer);
  const results = { basic: {}, text: [], itxt: [] };

  // Check PNG signature
  if (view.getUint32(0) !== 0x89504e47) return null;

  let offset = 8;
  while (offset < view.byteLength - 8) {
    const chunkLen = readUint32(view, offset, false);
    const chunkType = String.fromCharCode(
      view.getUint8(offset + 4),
      view.getUint8(offset + 5),
      view.getUint8(offset + 6),
      view.getUint8(offset + 7)
    );

    if (chunkType === "IHDR") {
      results.basic.Width = readUint32(view, offset + 8, false);
      results.basic.Height = readUint32(view, offset + 12, false);
      results.basic["Bit Depth"] = view.getUint8(offset + 16);
      const colorType = view.getUint8(offset + 17);
      const colorTypes = { 0: "Grayscale", 2: "RGB", 3: "Indexed", 4: "Grayscale+Alpha", 6: "RGBA" };
      results.basic["Color Type"] = colorTypes[colorType] || colorType;
    } else if (chunkType === "tEXt") {
      let key = "";
      let val = "";
      let i = offset + 8;
      const end = offset + 8 + chunkLen;
      while (i < end && view.getUint8(i) !== 0) {
        key += String.fromCharCode(view.getUint8(i));
        i++;
      }
      i++; // null separator
      while (i < end) {
        val += String.fromCharCode(view.getUint8(i));
        i++;
      }
      results.text.push({ key, value: val });
    } else if (chunkType === "iTXt") {
      let key = "";
      let i = offset + 8;
      const end = offset + 8 + chunkLen;
      while (i < end && view.getUint8(i) !== 0) {
        key += String.fromCharCode(view.getUint8(i));
        i++;
      }
      // skip compression flag + separator
      i += 2;
      // skip language tag
      while (i < end && view.getUint8(i) !== 0) i++;
      i++;
      // skip keyword
      while (i < end && view.getUint8(i) !== 0) i++;
      i++;
      let val = "";
      while (i < end) {
        val += String.fromCharCode(view.getUint8(i));
        i++;
      }
      results.itxt.push({ key, value: val });
    } else if (chunkType === "tIME") {
      const y = readUint16(view, offset + 8, false);
      const mo = view.getUint8(offset + 10);
      const d = view.getUint8(offset + 11);
      const h = view.getUint8(offset + 12);
      const mi = view.getUint8(offset + 13);
      const s = view.getUint8(offset + 14);
      results.basic["Last Modified"] = `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")} ${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    } else if (chunkType === "gAMA") {
      const gamma = readUint32(view, offset + 8, false);
      results.basic["Gamma"] = (gamma / 100000).toFixed(2);
    } else if (chunkType === "pHYs") {
      const px = readUint32(view, offset + 8, false);
      const py = readUint32(view, offset + 12, false);
      const unit = view.getUint8(offset + 16);
      results.basic["Resolution"] = `${px} × ${py} ${unit === 1 ? "pixels/meter" : "aspect ratio"}`;
    } else if (chunkType === "IDAT") {
      break; // Don't read past image data
    }

    offset += 12 + chunkLen;
  }

  return results;
}

/* ─── EXIF Stripping ─── */

function stripJpegExif(buffer) {
  const src = new Uint8Array(buffer);
  const dst = [];
  let offset = 0;

  // Copy SOI
  dst.push(src[0], src[1]);
  offset = 2;

  while (offset < src.length - 1) {
    if (src[offset] !== 0xff) break;
    const marker = src[offset + 1];

    if (marker === 0xd9 || marker === 0xda) {
      // EOI or SOS — copy rest
      while (offset < src.length) dst.push(src[offset++]);
      break;
    }

    const segLen = (src[offset + 2] << 8) | src[offset + 3];

    // Skip APP1 (EXIF) and APP2 (ICC) segments
    if (marker === 0xe1 || marker === 0xe2) {
      offset += 2 + segLen;
      continue;
    }

    // Copy all other segments
    for (let i = 0; i < 2 + segLen; i++) {
      dst.push(src[offset + i]);
    }
    offset += 2 + segLen;
  }

  return new Blob([new Uint8Array(dst)], { type: "image/jpeg" });
}

function stripPngMetadata(buffer) {
  const src = new Uint8Array(buffer);
  const dst = [];

  // Copy PNG signature (8 bytes)
  for (let i = 0; i < 8; i++) dst.push(src[i]);

  let offset = 8;
  const metadataChunks = new Set(["tEXt", "iTXt", "zTXt", "tIME", "gAMA", "pHYs", "sRGB", "iCCP", "sBIT"]);

  while (offset < src.length - 8) {
    const chunkLen = (src[offset] << 24) | (src[offset + 1] << 16) | (src[offset + 2] << 8) | src[offset + 3];
    const chunkType = String.fromCharCode(src[offset + 4], src[offset + 5], src[offset + 6], src[offset + 7]);

    // Skip metadata chunks
    if (metadataChunks.has(chunkType)) {
      offset += 12 + chunkLen;
      continue;
    }

    // Copy this chunk (length + type + data + CRC)
    for (let i = 0; i < 12 + chunkLen; i++) {
      dst.push(src[offset + i]);
    }
    offset += 12 + chunkLen;
  }

  return new Blob([new Uint8Array(dst)], { type: "image/png" });
}

/* ─── UI Logic ─── */

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

function isJpeg(file) {
  return file.type === "image/jpeg" || file.name.toLowerCase().endsWith(".jpg") || file.name.toLowerCase().endsWith(".jpeg");
}

function isPng(file) {
  return file.type === "image/png" || file.name.toLowerCase().endsWith(".png");
}

function renderBasicInfo(container, info) {
  if (!info || Object.keys(info).length === 0) return;
  let html = '<div class="mb-4"><h4 class="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">Image Info</h4><div class="grid grid-cols-2 gap-2">';
  for (const [k, v] of Object.entries(info)) {
    html += `<div class="p-2 rounded-lg bg-surface-muted border border-border-default"><div class="text-[10px] text-text-tertiary mb-0.5">${k}</div><div class="text-xs font-medium text-text-primary">${v}</div></div>`;
  }
  html += "</div></div>";
  container.insertAdjacentHTML("beforeend", html);
}

function renderExifData(container, data, title) {
  if (!data || Object.keys(data).length === 0) return;
  let html = `<div class="mb-4"><h4 class="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">${title}</h4><div class="space-y-1">`;
  for (const [k, v] of Object.entries(data)) {
    if (k.startsWith("GPS") && k.includes("Link")) {
      html += `<div class="flex items-center justify-between p-2 rounded-lg bg-surface-muted border border-border-default"><span class="text-[10px] text-text-tertiary">${k}</span><a href="${v}" target="_blank" rel="noopener" class="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline">Open Map ↗</a></div>`;
    } else {
      html += `<div class="flex items-center justify-between p-2 rounded-lg bg-surface-muted border border-border-default"><span class="text-[10px] text-text-tertiary">${k}</span><span class="text-xs font-medium text-text-primary text-right max-w-[60%] break-all">${v}</span></div>`;
    }
  }
  html += "</div></div>";
  container.insertAdjacentHTML("beforeend", html);
}

function renderNoData(container) {
  container.insertAdjacentHTML("beforeend", '<p class="text-xs text-text-tertiary italic p-3 rounded-lg bg-surface-muted border border-border-default">No metadata found in this image.</p>');
}

export function initExifTools() {
  const dropArea = document.getElementById("drop-area");
  const fileInput = dropArea?.querySelector('input[type="file"]');
  const uploadZone = document.getElementById("upload-zone");
  const previewZone = document.getElementById("preview-zone");
  const previewGrid = document.getElementById("preview-grid");
  const fileCount = document.getElementById("file-count");
  const clearBtn = document.getElementById("clear-btn");
  const overlay = document.getElementById("drop-overlay");
  const dropOverlay = document.getElementById("drop-overlay");
  const metadataPanel = document.getElementById("metadata-panel");
  const stripArea = document.getElementById("strip-area");
  const stripBtn = document.getElementById("strip-btn");
  const stripProgress = document.getElementById("strip-progress");
  const stripProgressBar = document.getElementById("strip-progress-bar");

  if (!dropArea || !fileInput) return;

  let files = [];

  function handleFiles(newFiles) {
    const filtered = Array.from(newFiles).filter((f) => isJpeg(f) || isPng(f));
    if (filtered.length === 0) return;
    files = filtered;
    showPreview();
    analyzeAll();
  }

  function showPreview() {
    uploadZone.classList.add("hidden");
    previewZone.classList.remove("hidden");
    fileCount.textContent = `${files.length} file${files.length > 1 ? "s" : ""} ready`;
    previewGrid.innerHTML = "";

    for (const file of files) {
      const thumb = document.createElement("div");
      thumb.className = "relative aspect-square rounded-lg overflow-hidden bg-surface-muted border border-border-default group";
      const img = document.createElement("img");
      img.className = "w-full h-full object-cover";
      img.src = URL.createObjectURL(file);
      const label = document.createElement("div");
      label.className = "absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1";
      label.innerHTML = `<span class="text-[10px] text-white font-medium truncate block">${file.name}</span>`;
      thumb.appendChild(img);
      thumb.appendChild(label);
      previewGrid.appendChild(thumb);
    }

    stripArea.classList.remove("hidden");
  }

  async function analyzeAll() {
    metadataPanel.innerHTML = "";
    let hasAnyMetadata = false;

    for (const file of files) {
      const buffer = await file.arrayBuffer();
      let data;

      if (isJpeg(file)) {
        data = parseExifFromJpeg(buffer);
      } else if (isPng(file)) {
        data = parsePngMetadata(buffer);
      }

      if (!data) continue;

      const hasData = (data.exif && Object.keys(data.exif).length > 0) ||
                      (data.gps && Object.keys(data.gps).length > 0) ||
                      (data.text && data.text.length > 0) ||
                      (data.itxt && data.itxt.length > 0) ||
                      (data.basic && Object.keys(data.basic).length > 0);

      if (!hasData) continue;
      hasAnyMetadata = true;

      const fileSection = document.createElement("div");
      fileSection.className = "p-4 rounded-xl border border-border-default bg-surface-muted/50";

      fileSection.innerHTML = `<div class="flex items-center gap-2 mb-3"><div class="w-8 h-8 rounded-lg overflow-hidden bg-surface border border-border-default flex-shrink-0"><img src="${URL.createObjectURL(file)}" class="w-full h-full object-cover" /></div><div><div class="text-sm font-semibold text-text-primary">${file.name}</div><div class="text-[10px] text-text-tertiary">${formatBytes(file.size)}</div></div></div>`;

      renderBasicInfo(fileSection, data.basic);
      renderExifData(fileSection, data.exif, "EXIF Metadata");

      if (data.gps && Object.keys(data.gps).length > 0) {
        renderExifData(fileSection, data.gps, "📍 GPS Location");
      }

      if (data.text && data.text.length > 0) {
        const txtData = {};
        data.text.forEach((t) => { txtData[t.key] = t.value; });
        renderExifData(fileSection, txtData, "Text Metadata");
      }

      if (data.itxt && data.itxt.length > 0) {
        const iTxtData = {};
        data.itxt.forEach((t) => { iTxtData[t.key] = t.value; });
        renderExifData(fileSection, iTxtData, "Extended Text");
      }

      if (data.icc) {
        fileSection.insertAdjacentHTML("beforeend", '<div class="mb-4"><div class="flex items-center gap-1.5 p-2 rounded-lg bg-brand-50 dark:bg-brand-950/50 border border-brand-200 dark:border-brand-800"><span class="text-xs text-brand-700 dark:text-brand-400">ICC Color Profile: </span><span class="text-xs font-medium text-brand-800 dark:text-brand-300">Present</span></div></div>');
      }

      metadataPanel.appendChild(fileSection);
    }

    if (!hasAnyMetadata) {
      renderNoData(metadataPanel);
    }
  }

  // Drag & Drop
  ["dragenter", "dragover"].forEach((e) => {
    dropArea.addEventListener(e, (ev) => { ev.preventDefault(); dropOverlay.classList.remove("hidden"); });
  });
  ["dragleave", "drop"].forEach((e) => {
    dropArea.addEventListener(e, (ev) => { ev.preventDefault(); dropOverlay.classList.add("hidden"); });
  });
  dropArea.addEventListener("drop", (e) => { handleFiles(e.dataTransfer.files); });
  dropArea.addEventListener("click", (e) => { if (e.target.tagName !== "INPUT") fileInput.click(); });
  fileInput.addEventListener("change", (e) => { handleFiles(e.target.files); });

  clearBtn?.addEventListener("click", () => {
    files = [];
    uploadZone.classList.remove("hidden");
    previewZone.classList.add("hidden");
    metadataPanel.innerHTML = '<p class="text-sm text-text-tertiary text-center py-8">Drop or select image files to view their metadata</p>';
    stripArea.classList.add("hidden");
    fileInput.value = "";
  });

  // Strip & Download
  stripBtn?.addEventListener("click", async () => {
    if (files.length === 0) return;
    stripBtn.disabled = true;
    stripProgress.classList.remove("hidden");

    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    let processed = 0;

    for (const file of files) {
      const buffer = await file.arrayBuffer();
      let blob;
      const baseName = file.name.replace(/\.[^.]+$/, "");

      if (isJpeg(file)) {
        blob = stripJpegExif(buffer);
        zip.file(`${baseName}-clean.jpg`, blob);
      } else if (isPng(file)) {
        blob = stripPngMetadata(buffer);
        zip.file(`${baseName}-clean.png`, blob);
      }

      processed++;
      const pct = Math.round((processed / files.length) * 100);
      stripProgressBar.style.width = `${pct}%`;
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(zipBlob);
    a.download = files.length === 1 ? `${files[0].name.replace(/\.[^.]+$/, "")}-clean.zip` : "clean-images.zip";
    a.click();
    URL.revokeObjectURL(a.href);

    stripBtn.disabled = false;
    stripProgress.classList.add("hidden");
    stripProgressBar.style.width = "0%";
  });
}
