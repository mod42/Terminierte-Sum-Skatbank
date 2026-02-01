# Sum Scheduled Transfers - Skatbank

A Tampermonkey userscript that automatically sums all scheduled transfers on the Skatbank portal.

## Features

- 📊 Automatically detects and sums all scheduled transfers
- 🎯 Displays total amount and transfer count in a floating widget
- 🔄 Refresh button to manually rescan transfers
- 🎨 Beautiful gradient UI with draggable widget
- 💱 Handles German number format (1.234,56 EUR)
- ✨ No browser extension installation required (Tampermonkey only)

## Installation

### Prerequisites
- [Tampermonkey](https://www.tampermonkey.net/) browser extension installed

### Steps

1. Install Tampermonkey for your browser:
   - [Chrome/Chromium](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobblbi)
   - [Firefox](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)
   - [Safari](https://apps.apple.com/us/app/tampermonkey/id1482490089)
   - [Edge](https://microsoftedge.microsoft.com/addons/detail/iikmkjmpaadaobahmlepeloendndfohd)

2. Click the raw link to install:
   - [transfer-sum.js](https://raw.githubusercontent.com/YOUR_USERNAME/Termiante-Sum-Skatbank/main/transfer-sum.js)

3. Tampermonkey will prompt you to confirm installation. Click "Install"

4. Navigate to [Skatbank Scheduled Transfers](https://www.skatbank.de/services_cloud/portal/webcomp/auftraege/terminierte-ueberweisungen/) and the script will automatically run

## Usage

1. Open your Skatbank account and go to "Terminierte Überweisungen" (Scheduled Transfers)
2. The script waits ~15-20 seconds for the page to load all transfers
3. A floating widget appears in the bottom-right corner showing:
   - Total sum of all transfers
   - Number of transfers detected
   - List of individual transfers (up to 30)

### Widget Actions
- **🔄 Button**: Manually refresh and rescan transfers
- **✕ Button**: Close the widget
- **Drag**: Click and drag the widget to move it around

## How It Works

1. Scans the page for all "EUR" currency labels
2. Extracts amounts in German format (1.234,56)
3. Deduplicates transfers to prevent double-counting
4. Displays results in a floating widget
5. Updates automatically when transfers change

## Technical Details

- **Target**: https://www.skatbank.de/services_cloud/portal/webcomp/auftraege/terminierte-ueberweisungen/*
- **Language**: JavaScript (Tampermonkey userscript)
- **Format Support**: German (1.234,56) and US (1,234.56) number formats
- **Permissions**: None (runs entirely client-side)

## Version History

### v3.0 - Current
- Fixed duplicate transfer detection
- Improved EUR element finding
- Removed endless loop issues
- Proper parent container tracing

### v2.0
- Added deduplication logic
- Disabled MutationObserver for stability

### v1.0
- Initial release
- Basic transfer summing

## Updates

The script will automatically check for updates. To enable auto-updates:

1. In Tampermonkey, click the extension icon
2. Find "Sum Scheduled Transfers - Skatbank"
3. Click the gear icon → Options
4. Note the "Update URL" (auto-configured)

## Troubleshooting

### Widget doesn't appear
- Wait 15-20 seconds (page is still loading)
- Check browser console (F12 → Console) for error messages
- Verify Tampermonkey is enabled for this page

### Only showing partial transfers
- Click the 🔄 refresh button
- Wait for all transfers to load on the page

### Duplicate amounts appearing
- This has been fixed in v3.0. Update the script.

## License

MIT License - Feel free to use and modify for personal use

## Support

For issues or suggestions, please create an issue on GitHub.

---

**Note**: This script is not affiliated with Skatbank. Use at your own risk.
