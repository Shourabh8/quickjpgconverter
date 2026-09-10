# Quick JPG Converter

A free, privacy-first image converter that runs entirely in your browser. No uploads, no accounts, no tracking.

[![Website](https://img.shields.io/badge/website-quickjpgconverter.com-blue)](https://quickjpgconverter.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Astro 5](https://img.shields.io/badge/Astro-5.x-BC52EE.svg)](https://astro.build)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC.svg)](https://tailwindcss.com)

---

## Features

- **Format Conversion** — JPG, PNG, WebP, HEIC, BMP, AVIF, SVG, PDF
- **Batch Processing** — Convert multiple files simultaneously with auto-ZIP export
- **Quality Control** — Custom compression levels and presets (High, Balanced, Smallest)
- **Target Size Compression** — Compress to exact file sizes (20KB, 50KB, 100KB, 200KB, or custom KB)
- **Aadhaar & UPSC Forms** — Preconfigured dimensions and file size limits for official portals
- **AI Background Removal** — Runs client-side via `@imgly/background-removal` and WebAssembly
- **Resize & Crop** — Pixel-perfect dimensions and preset aspect ratios
- **Passport Photos** — Compliant sizing for 50+ countries
- **EXIF Viewer & Stripper** — Inspect and strip camera metadata for privacy
- **PDF Operations** — PDF to JPG, JPG to PDF, and PDF compression

---

## How It Works

All image processing happens locally on your device:
- **Canvas API & WebAssembly** — High-speed browser-native image decoding and encoding
- **Dynamic HEIC Fallback** — In-browser `heic2any` decoding for universal Apple photo support
- **Zero Server Uploads** — Your images never touch a third-party server or cloud storage

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [Astro 5](https://astro.build/) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) |
| Typography | Self-hosted Inter font (`woff2`) |
| Deployment | [Cloudflare Pages](https://pages.cloudflare.com/) via Wrangler |
| Processing | Canvas API + WebAssembly + `heic2any` + `jszip` |
| AI | `@imgly/background-removal` (ONNX Runtime Web) |
| Language | TypeScript, Modern JavaScript |

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Installation

```bash
# Clone the repository
git clone https://github.com/shourabh/quickjpgconverter.git

# Navigate to project
cd quickjpgconverter

# Install dependencies
npm install

# Start development server
npm run dev

# Build production bundle
npm run build

# Preview build locally
npm run preview
```

---

## Project Structure

```
quickjpgconverter/
├── public/                 # Static assets, fonts, icons, robots.txt
├── src/
│   ├── components/         # Reusable Astro components (layout, SEO, tools)
│   ├── data/               # Tool definitions, blog index, metadata
│   ├── i18n/               # Internationalization (EN, ES, PT, HI, FR, DE)
│   ├── layouts/            # BaseLayout, BlogPostLayout
│   ├── lib/                # SEO helpers and JSON-LD schema generators
│   ├── pages/              # Canonical tool pages, blog guides, static routes
│   │   ├── tools/          # Directory index and legacy 301 redirects
│   │   └── ...             # Root-level tool routes (/jpg-to-png, etc.)
│   ├── scripts/            # Client-side converters, compressors, utilities
│   └── styles/             # Global CSS with design tokens
├── docs/                   # Backlink outreach docs, extension roadmap
├── astro.config.mjs        # Astro configuration & sitemap filters
└── wrangler.toml           # Cloudflare Pages deployment config
```

---

## Privacy Model

Quick JPG Converter was built on the principle that image manipulation should not require uploading sensitive personal photos or documents to unknown servers.

- No file uploads
- No account or sign-up requirement
- No telemetry on file contents
- 100% browser-based execution

---

## License

[MIT](LICENSE)
