# Chrome Extension Plan — QuickJPG Converter

## Overview

A Chrome extension that brings QuickJPG Converter's image conversion tools directly into the browser context menu, enabling right-click image conversion without visiting the website.

## Core Features

### 1. Context Menu Integration
- Right-click any image on a webpage → "Convert with QuickJPG"
- Sub-menu options:
  - Convert to PNG
  - Convert to JPG
  - Convert to WebP
  - Compress Image
  - Resize Image
  - Download converted file directly

### 2. Browser Action Popup
- Click extension icon → open converter popup
- Drag-and-drop zone for local files
- Format selector with quality presets
- Preview before download
- Batch conversion support

### 3. Options Page
- Default output format selection
- Quality preset configuration
- Auto-download vs. save-to-desktop preference
- Keyboard shortcut customization

## Technical Architecture

### Manifest V3 Structure
```
chrome-extension/
├── manifest.json
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── background/
│   └── service-worker.js
├── content/
│   └── content.js
├── options/
│   ├── options.html
│   └── options.js
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── lib/
    └── converter.js (reuse from main site)
```

### Key Components

#### Service Worker (`background/service-worker.js`)
- Register context menu items
- Handle image URL fetching
- Process conversion using Canvas API
- Manage downloads via `chrome.downloads` API

#### Content Script (`content/content.js`)
- Extract image URL from right-click target
- Send to service worker for processing
- Display conversion status via notification

#### Popup (`popup/popup.js`)
- Standalone converter interface
- File input with drag-and-drop
- Format selection and quality controls
- Preview and download functionality

### Conversion Pipeline
1. User initiates conversion (context menu or popup)
2. Image data fetched (URL or local file)
3. Canvas API processes image (same logic as main site)
4. Output blob created
5. File downloaded via Chrome downloads API

## API Reuse

Leverage existing conversion logic from `src/scripts/`:
- `converter.js` — format conversion (JPG, PNG, WebP)
- `compressor.js` — image compression
- `resize.js` — image resizing
- `image-enhancer.js` — brightness/contrast/saturation

Package as ES modules for extension context.

## Permissions Required

```json
{
  "permissions": [
    "contextMenus",
    "downloads",
    "activeTab",
    "storage"
  ],
  "host_permissions": [
    "https://quickjpgconverter.com/*",
    "http://*/*",
    "https://*/*"
  ]
}
```

## User Experience

### Context Menu Flow
1. User right-clicks image on any webpage
2. Sees "Convert with QuickJPG" in context menu
3. Hovers to see format options
4. Clicks desired format
5. Extension processes image
6. File downloads automatically
7. Toast notification confirms completion

### Popup Flow
1. User clicks extension icon
2. Popup opens with drag-and-drop zone
3. User drops images or clicks to browse
4. Selects output format and quality
5. Clicks "Convert"
6. Preview appears
7. User clicks download (individual or ZIP)

## Monetization Opportunities

### Free Tier
- 10 conversions per day
- Basic formats (JPG, PNG, WebP)
- Standard quality presets

### Pro Tier ($3.99/month)
- Unlimited conversions
- All formats including PDF
- Advanced quality controls
- Batch processing (up to 50 files)
- Priority processing

## Development Phases

### Phase 1: MVP (2 weeks)
- [ ] Manifest V3 setup
- [ ] Context menu with JPG→PNG conversion
- [ ] Basic popup with file upload
- [ ] Auto-download functionality

### Phase 2: Full Features (2 weeks)
- [ ] All format conversions
- [ ] Quality presets
- [ ] Batch processing
- [ ] Options page
- [ ] Keyboard shortcuts

### Phase 3: Polish (1 week)
- [ ] Pro tier integration
- [ ] Usage tracking
- [ ] Error handling
- [ ] Onboarding flow

### Phase 4: Launch (1 week)
- [ ] Chrome Web Store listing
- [ ] Screenshots and promo images
- [ ] Documentation
- [ ] Support page

## Marketing Strategy

### Chrome Web Store Optimization
- Title: "QuickJPG — Free Image Converter & Compressor"
- Description: Focus on privacy, speed, no uploads
- Keywords: image converter, jpg to png, webp converter, compress image
- Category: Productivity > Utilities

### Cross-Promotion
- Link to Chrome extension from website
- Browser notification prompt for website visitors
- Blog post announcing extension
- Social media campaign

### SEO Benefits
- Chrome Web Store page ranks for converter keywords
- Backlinks from extension review sites
- Increased brand visibility
- Referral traffic to main website

## Success Metrics

- Chrome Web Store installs: Target 10,000 in first month
- Daily active users: Target 1,000 within 3 months
- Conversion rate (free → pro): Target 5%
- User rating: Target 4.5+ stars
- Support tickets: Target < 1% of users

## Technical Considerations

### Performance
- Lazy-load conversion libraries
- Use Web Workers for heavy processing
- Cache frequently used formats
- Minimize extension bundle size (< 5MB)

### Privacy
- No image data sent to servers
- All processing client-side
- Minimal permissions requested
- Clear privacy policy

### Compatibility
- Chrome 88+ (Manifest V3 support)
- Edge 88+ (Chromium-based)
- Future: Firefox (Manifest V2 variant)

## Future Enhancements

- Firefox extension (Manifest V2)
- Safari extension (via Web Extension API)
- Integration with Google Drive / Dropbox
- AI-powered background removal
- Batch folder conversion
- API for developer integration
