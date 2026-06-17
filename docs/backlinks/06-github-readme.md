# Quick JPG Converter

A free, privacy-first image converter that runs entirely in your browser. No uploads, no accounts, no tracking.

## Features

- **Format Conversion** — JPG, PNG, WebP, HEIC, BMP, AVIF, SVG, PDF
- **Batch Processing** — Convert multiple files at once
- **Quality Control** — Choose between high quality, balanced, or smallest size
- **Image Compression** — Compress to specific file sizes (100KB, 200KB, custom)
- **AI Background Removal** — Runs entirely in-browser via ONNX Runtime
- **Resize & Crop** — Adjust dimensions to any size
- **Passport Photos** — Sizing for 50+ countries
- **EXIF Removal** — Strip metadata for privacy
- **PDF Operations** — PDF to JPG, JPG to PDF, PDF compression

## How It Works

All image processing happens in your browser using:
- **WebAssembly** — Fast, near-native performance
- **Canvas API** — Standard browser image rendering
- **ONNX Runtime** — AI models running client-side

Your images never leave your device. No server uploads, no data collection, no privacy concerns.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [Astro 5](https://astro.build/) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) |
| Hosting | [Cloudflare Pages](https://pages.cloudflare.com/) |
| Processing | WebAssembly + Canvas API |
| AI | ONNX Runtime Web |
| Language | TypeScript, Vanilla JavaScript |

## Getting Started

```bash
# Clone the repository
git clone https://github.com/yourusername/quickjpgconverter.git

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Deploy to Cloudflare Pages
npm run deploy
```

## Project Structure

```
src/
├── pages/              # All routes and pages
├── components/         # Reusable Astro components
├── layouts/            # Page layouts
├── scripts/            # Client-side JavaScript
├── data/               # Tool definitions and config
├── lib/                # Utilities and SEO helpers
├── i18n/               # Internationalization (6 languages)
└── styles/             # Global CSS
```

## Privacy Model

We believe image conversion shouldn't require trusting a stranger's server. Quick JPG Converter is built on a simple principle: **your images stay on your device**.

- No file uploads to any server
- No accounts or sign-ups
- No analytics tracking file content
- No data storage on our end
- 100% client-side processing

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License

## Links

- **Website:** [quickjpgconverter.com](https://quickjpgconverter.com)
- **Report Issues:** [GitHub Issues](https://github.com/yourusername/quickjpgconverter/issues)

## Built With

- [Astro](https://astro.build/) - The web framework for content-driven websites
- [Tailwind CSS](https://tailwindcss.com/) - A utility-first CSS framework
- [Cloudflare Pages](https://pages.cloudflare.com/) - Fast, secure static site hosting
