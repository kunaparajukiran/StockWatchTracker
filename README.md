# Stock Watchlist Manager Chrome Extension

A Chrome extension for managing stock watchlists with color-coded bookmarks and filtering capabilities.

## Features
- Add stocks to your watchlist with custom color coding
- Filter stocks by color
- Multiple watchlist tabs for better organization
- Edit and delete stock entries
- Persistent storage across browser sessions
- Convenient side panel interface for easy access while browsing

## Installation Instructions

1. Download or clone this repository to your local machine
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" using the toggle in the top right corner
4. Click "Load unpacked" and select the directory containing this extension
5. The extension icon should appear in your Chrome toolbar

## Usage

1. Click the extension icon in your Chrome toolbar to open the side panel
   - The side panel will appear on the right side of your browser window
   - You can resize the panel by dragging its left edge
2. Add stocks by entering the symbol (e.g., AAPL) and selecting a color
3. Use the color filters to view stocks by category
4. Create multiple watchlists using the tab system
5. Edit or delete stocks using the buttons next to each entry

## Development

The extension uses Chrome's Storage API to persist data and is built using:
- HTML5
- CSS3 with Bootstrap 5
- JavaScript
- Chrome Extension APIs
- Side Panel API for improved user experience

### Key Features
- **Side Panel Integration**: Uses Chrome's Side Panel API for a persistent, easily accessible interface
- **Color Coding**: Assign colors to stocks for visual organization
- **Multiple Lists**: Create and manage multiple watchlists in separate tabs
- **Filtering**: Filter stocks by their assigned colors
- **Responsive Design**: Optimized layout for the side panel's vertical format

## File Structure
```
├── manifest.json (Extension configuration)
├── side_panel.html (Main extension interface)
├── styles/
│   └── popup.css (Styling)
├── scripts/
│   ├── popup.js (Main functionality)
│   └── background.js (Background service worker)
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Troubleshooting

If the side panel doesn't open:
1. Make sure the extension is properly loaded in Chrome
2. Check that you've granted the necessary permissions
3. Try clicking the extension icon again
4. Refresh the browser page if needed