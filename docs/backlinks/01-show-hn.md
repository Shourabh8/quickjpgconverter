# Show HN: Free JPG Converter – Runs Entirely in Your Browser (No Uploads)

**URL:** https://quickjpgconverter.com

I built a free image converter that runs 100% in the browser using WebAssembly and Canvas API. Your images never leave your device — no server uploads, no privacy concerns.

**What it does:**
- Convert between JPG, PNG, WebP, HEIC, BMP, AVIF, SVG, and PDF
- Compress images to specific sizes (100KB, 200KB, custom)
- Batch conversion with quality control
- Remove backgrounds with AI (runs in-browser via ONNX)
- Resize, crop, enhance images
- Passport photo sizing for 50+ countries
- All processing happens locally — zero uploads

**Why I built it:**
Most online converters upload your files to their servers. For photographers, designers, and anyone handling sensitive images, this is a privacy risk. I wanted a tool that's both powerful and private.

**Tech stack:**
- Astro 5 (SSG) deployed on Cloudflare Pages
- WebAssembly for image processing
- Canvas API for rendering
- ONNX Runtime for AI features (background removal)
- Vanilla JS (no framework)
- i18n in 6 languages

**Try it:** https://quickjpgconverter.com/jpg-converter

Would love feedback from the HN community.
