# Dictionary Define Extension

A fast, lightweight browser extension that allows you to instantly look up word definitions without leaving the page.

## Features

- **Inline Definitions**: Select a word and instantly view its definition in a clean, non-intrusive popup right over the text.
- **Context Menu Integration**: Just right-click any highlighted word and select **Define '%s'**.
- **Keyboard Shortcuts**: Quickly tap `Ctrl+Space` (Windows/Linux) or `Command+Space` (Mac) to define your active selection.
- **Full Offline Support**: Optionally download a compressed English dictionary (powered by GCIDE using WebAssembly SQLite) directly to your browser's local storage for lightning-fast, internet-free lookups.
- **Online API Fallback**: If the offline dictionary isn't installed or a word isn't found, it seamlessly falls back to the reliable Free Dictionary API.
- **Privacy First**: Absolutely zero user telemetry or data is collected. You can verify this in our manifest!

## How to Use

1. **Highlight a word** on any standard webpage.
2. Either **Right-click -> Define** or press the keyboard **Shortcut (`Ctrl+Space`)**.
3. **PDF Limitations**: Due to strict browser security sandboxing, inline overlays and keyboard shortcuts do not work inside built-in PDF viewers. However, you can still highlight text in a PDF and use the right-click context menu; the extension will safely open your definition in a fallback popup window!

## Settings & Customization

Click on the extension icon or access the Options page through your browser's extension manager to:
- Download, update, or completely remove the ~28MB offline dictionary database to save space.
- Toggle whether the extension should attempt to search the internet if an offline word isn't found.
- Manage and enable/disable keyboard shortcuts.

## Developer Installation

Want to run the extension straight from the source code?

1. Clone the repository:
   ```bash
   git clone https://github.com/abughalib/dictionary-define-extension.git
   ```
2. **Firefox**:
   - Go to `about:debugging#/runtime/this-firefox`
   - Click **Load Temporary Add-on...**
   - Select the `manifest.json` file inside the cloned directory.

## Privacy Policy

This extension respects your privacy. It does not collect, record, or transmit any personally identifiable information or browsing habits. If the Online Fallback setting is enabled, the specific word you highlight is securely queried against `api.dictionaryapi.dev` to retrieve a definition. All offline SQLite lookups happen entirely within your local machine.
