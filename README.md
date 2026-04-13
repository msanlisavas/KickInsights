# Extension Link
[Chrome Extension](https://chromewebstore.google.com/detail/kickinsights/nbaidimnboanjpinoffjpeildjoihhnh)

# KickInsights

A Chrome extension that estimates real viewer counts on [Kick.com](https://kick.com) by analyzing chat activity in real-time.

## The Problem

Kick has been reported to deflate viewer counts by averaging them over extended periods, which disproportionately hurts legitimate streamers. A streamer watched by 20,000+ people may see their count displayed as a fraction of that.

## The Solution

KickInsights intercepts chat messages via WebSocket and uses participation rate modeling to estimate the real viewer count. It displays the estimate as a range alongside Kick's displayed number, giving streamers and viewers an independent data point.

## Features

- **Real-time estimation** displayed inline next to Kick's viewer count (e.g., `est. 4.8K-19K`)
- **WebSocket interception** captures every chat message with 100% reliability
- **Interactive overlay** with live graph comparing Kick vs estimated counts -- draggable, resizable, minimizable
- **Dashboard popup** with real-time stats, charts, and diagnostic counters
- **Census mode** -- ask chat to type, get a verified floor count and auto-calibrate the model
- **Per-channel profiles** -- each streamer gets their own learned participation rate
- **Session history** with CSV, JSON, and PNG summary card export
- **Privacy-first** -- all data stays local in your browser, nothing is sent anywhere

## How It Works

1. **Chat capture**: A WebSocket interceptor (injected at `document_start`) patches the WebSocket constructor before Kick connects to Pusher. Every chat message is captured in real-time.

2. **Estimation**: Unique chatters in a rolling window (default 5 min) are divided by a participation rate to estimate total viewers. The result is shown as a range using optimistic and pessimistic rates.

3. **Calibration**: The participation rate starts at 3% and can be adjusted manually. For better accuracy, streamers can run a **Census** -- ask everyone to type in chat for 60 seconds. The extension counts unique participants and uses the result to calibrate future estimates.

4. **Visualization**: Both an on-page overlay and popup dashboard show Kick's count vs the estimated range, with the estimation band (dashed low/high lines with filled area).

## Installation

### From Source (Developer Mode)

1. Clone this repository
   ```bash
   git clone https://github.com/msanlisavas/KickInsights.git
   ```

2. Open Chrome and go to `chrome://extensions`

3. Enable **Developer mode** (top right)

4. Click **Load unpacked** and select the `kickinsights` folder

5. Visit any live stream on [kick.com](https://kick.com) and click the extension icon to start tracking

### From Chrome Web Store

Coming soon.

## Usage

1. **Navigate** to a live stream on Kick.com
2. **Click** the KickInsights extension icon
3. **Click "Start Tracking"** to begin monitoring
4. **View** the estimated range next to Kick's viewer count
5. **Open the popup** to see the Dashboard with live stats and graph

### Census Mode

For the most accurate results:

1. The streamer asks everyone to type something in chat (e.g., "type 1")
2. Click **Start Census** in the popup (or press `Ctrl+Shift+C`)
3. Wait 60 seconds while the extension counts unique chatters
4. Review the result and click **Apply Calibration** to update the model

### Settings

- **Participation rate** (0.5% - 20%): Adjustable slider, auto-calibrated by census
- **Rolling window** (2, 5, or 10 minutes): Time window for counting unique chatters
- **Show/Hide overlay**: Toggle the on-page graph widget
- **Clear data**: Per-channel or all data

## Architecture

```
kickinsights/
├── manifest.json                     # Chrome Extension Manifest V3
├── src/
│   ├── content/
│   │   ├── ws-interceptor-early.js   # WebSocket patch (MAIN world, document_start)
│   │   ├── content.js                # Main entry point, wires all modules
│   │   ├── chat-parser.js            # Message parsing, unique chatter tracking
│   │   ├── estimation-engine.js      # Viewer estimation with confidence/range
│   │   ├── calibration.js            # Weighted averaging from census data
│   │   ├── census.js                 # Active census mode (60s counting)
│   │   ├── viewer-count-reader.js    # Reads Kick's CSS odometer display
│   │   ├── dom-injector.js           # Injects estimate into page
│   │   ├── overlay-graph.js          # Interactive on-page widget
│   │   └── content.css               # Injected styles
│   ├── background/
│   │   └── service-worker.js         # Session pruning, alarms
│   ├── popup/
│   │   ├── popup.html/css/js         # Extension popup UI
│   │   ├── chart-renderer.js         # Canvas chart drawing
│   │   └── summary-card.js           # PNG summary card generator
│   └── shared/
│       ├── constants.js              # Configuration defaults
│       ├── format.js                 # Number/date formatting
│       └── storage.js                # chrome.storage.local wrapper
└── tests/                            # Jest test suite (59 tests)
```

## Tech Stack

- **Chrome Extension Manifest V3** -- no frameworks, vanilla JavaScript
- **Canvas API** -- for charts and summary card rendering
- **WebSocket interception** -- patches constructor at document_start
- **chrome.storage.local** -- all data persisted locally (~10MB limit)
- **Jest** -- test suite with jsdom environment

## Development

```bash
cd kickinsights
npm install
npm test          # Run all 59 tests
npm run test:watch # Watch mode
```

## Building for Chrome Web Store

```bash
cd kickinsights
bash scripts/build.sh
```

This creates a `kickinsights-v{version}.zip` ready for upload.

## Limitations

- Chat-based estimation gives a **range**, not an exact number
- Participation rates vary by channel, language, time of day, and chat restrictions
- Census requires streamer cooperation to be effective
- Chrome only (Manifest V3)

## Contributing

This is an open source project. Contributions, issues, and feature requests are welcome.

- **Repository**: [github.com/msanlisavas/KickInsights](https://github.com/msanlisavas/KickInsights)
- **Issues**: [github.com/msanlisavas/KickInsights/issues](https://github.com/msanlisavas/KickInsights/issues)

## License

MIT

## Author

**Murat Sanlisavas** -- [@msanlisavas](https://github.com/msanlisavas)

Crafted by [Ekolsoft](https://ekolsoft.com)
