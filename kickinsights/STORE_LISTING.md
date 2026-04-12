# Chrome Web Store Listing

## Short Description (132 chars max)
Estimate real Kick.com viewer counts using chat analysis. Shows estimation range alongside Kick's displayed count for any stream.

## Detailed Description

KickInsights estimates real viewer counts on Kick.com by analyzing chat activity in real-time.

Kick has been reported to deflate viewer counts by averaging them over months, which hurts legitimate streamers. This extension gives you an independent estimate based on actual chat data.

HOW IT WORKS:
- Intercepts chat messages via WebSocket for 100% capture rate
- Counts unique chatters in a rolling time window
- Applies a participation rate model to estimate total viewers
- Shows the result as a range (e.g., "est. 4.8K-19K") next to Kick's count

FEATURES:
- Live estimation range displayed inline next to Kick's viewer count
- Draggable, resizable overlay graph comparing Kick vs estimated counts
- Dashboard popup with real-time stats, charts, and diagnostics
- Census tool: ask chat to type, get a verified floor count of real viewers
- Per-channel calibration: each streamer gets their own learned participation rate
- Session history with export (CSV, JSON, PNG summary card)
- Manual activation: only tracks when you choose to start
- Privacy-first: all data stays local in your browser, nothing sent anywhere

CENSUS MODE:
For the most accurate results, streamers can ask their chat to type something (e.g., "type 1"). Start a 60-second census to count unique participants and auto-calibrate the estimation model for that channel.

SETTINGS:
- Adjustable participation rate (0.5% - 20%)
- Rolling window size (2, 5, or 10 minutes)
- Show/hide overlay graph
- Clear data per channel or all data

This extension is open source and community-driven. No data leaves your browser.

## Category
Social & Communication

## Language
English

## Tags
kick, streaming, viewer count, analytics, chat
