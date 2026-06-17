# How I Built a Privacy-First Image Converter That Runs Entirely in the Browser

## The Problem

Every time you upload an image to an "online converter," it gets sent to someone else's server. For most people, this doesn't matter. But for photographers handling client work, designers with proprietary assets, or anyone who values privacy — it's a dealbreaker.

I wanted to build an image converter that processes everything locally. No uploads. No servers. No privacy concerns.

## The Solution: Browser-Based Processing

The key insight: modern browsers are powerful enough to handle image conversion without any server-side processing. Using **WebAssembly** and the **Canvas API**, we can do everything client-side.

Here's what the converter supports:
- **Format conversion:** JPG, PNG, WebP, HEIC, BMP, AVIF, SVG
- **PDF operations:** PDF to JPG, JPG to PDF, PDF compression
- **Image optimization:** Compress to specific file sizes (100KB, 200KB, custom)
- **Editing tools:** Resize, crop, enhance, remove backgrounds
- **Specialized tools:** Passport photo sizing, EXIF removal, Base64 encoding

## Tech Stack

```
Framework:  Astro 5 (Static Site Generation)
Hosting:    Cloudflare Pages
Processing: WebAssembly + Canvas API
AI:         ONNX Runtime (browser-based)
Styling:    Tailwind CSS v4
Languages:  TypeScript, Vanilla JavaScript
```

No React. No Vue. No heavy frameworks. Just fast, lean code.

## How the Conversion Works

### The Canvas API Approach

The core conversion is surprisingly simple:

```javascript
// Load the source image
const img = new Image();
img.src = URL.createObjectURL(file);

// Draw to canvas
const canvas = document.createElement('canvas');
canvas.width = img.width;
canvas.height = img.height;
const ctx = canvas.getContext('2d');
ctx.drawImage(img, 0, 0);

// Export as target format
canvas.toBlob((blob) => {
  // Download the converted file
}, 'image/jpeg', quality / 100);
```

The `quality` parameter (0-1) controls JPEG compression. This gives users direct control over the quality-vs-size tradeoff.

### Batch Processing

For batch conversion, we process files in parallel using Promise.all:

```javascript
const convertAll = async (files, targetFormat, quality) => {
  const results = await Promise.all(
    files.map(file => convertFile(file, targetFormat, quality))
  );
  return results;
};
```

### AI Background Removal

The most complex feature: browser-based AI background removal using ONNX Runtime Web. The model runs entirely in the browser — no server calls, no data leaving the device.

## Privacy by Design

The privacy model is simple: **nothing leaves the browser**.

- No file uploads to any server
- No analytics tracking file content
- No accounts or sign-ups required
- No data storage on our end
- Open about how it works

This isn't just a feature — it's the core architecture. Every decision is filtered through "does this require uploading user files?" If the answer is yes, we find another way.

## Performance Results

Browser-based processing is actually faster than server-based for most use cases:

| Operation | Browser | Server-based |
|-----------|---------|--------------|
| JPG → PNG (single) | 0.1s | 0.5s (upload) + 0.1s |
| Batch (20 images) | 2s | 10s (upload) + 2s |
| HEIC → JPG | 0.3s | 1s (upload) + 0.3s |

The "upload time" is eliminated entirely. For users on slow connections, this is a massive improvement.

## SEO Architecture

The site uses a two-path URL structure:
- `/jpg-converter` — landing page with converter widget
- `/tools/jpg-to-png` — functional tool page with full UI

Both pages exist, but `/tools/*` pages have canonical URLs pointing to the top-level versions. This consolidates SEO signals while maintaining a clean URL structure.

## What I Learned

1. **WebAssembly is production-ready.** ONNX Runtime in the browser handles AI models that would have required a server 2 years ago.

2. **Privacy is a feature, not a constraint.** The "no uploads" constraint actually improved the user experience — instant conversion, no waiting for uploads.

3. **Static sites can be powerful.** Astro + Cloudflare Pages gives us global CDN, instant loads, and zero server costs.

4. **SEO matters more than features.** A technically superior tool is useless if nobody finds it. Title tags, canonical URLs, and structured data drive real traffic.

## Try It

https://quickjpgconverter.com

Free, no sign-up, no uploads. Just convert your images.

---

*Built with Astro 5, Tailwind CSS, WebAssembly, and a strong opinion about privacy.*
