# Brightness Control v1.0.0 — Initial public release

First public release of **Brightness Control** — a Stream Deck+ plugin
that turns the dials into a hardware brightness regulator for every
Mac-connected display. Built on Apple's native DisplayServices, so it
handles Apple Studio Display and Pro Display XDR cleanly where most
third-party tools fail.

> The in-app category and action icons are monochrome white per
> Elgato's Marketplace plugin guidelines; the Marketplace tile icon
> (colorful MacBook-with-sun) is kept as-is.

---

## Install

1. Download **`com.corrugator.brightness.streamDeckPlugin`** from the
   assets below.
2. Double-click the file. The Stream Deck app installs it
   automatically.
3. Drag the **Brightness** action onto a Stream Deck+ dial.

---

## What it does

### Live brightness across every dial

<img src="https://raw.githubusercontent.com/Corrugator/streamdeck-mac-brightnesser/v1.0.0/release/github/assets/gallery-1.png" alt="LCD strip showing four displays with brightness controls">

Each dial controls one display. Rotate to adjust brightness in 2 % steps, press to cycle through every connected monitor. The LCD shows monitor name, exact percentage, a live bar, and a switch hint such as `Press to switch 2/3`.

### Always know which screen you're tuning

<img src="https://raw.githubusercontent.com/Corrugator/streamdeck-mac-brightnesser/v1.0.0/release/github/assets/gallery-2.png" alt="Red border flashes on the active monitor">

Pressing a dial briefly outlines the active monitor in red — a quick glance confirms you're tuning the right screen, especially handy with two identical displays side by side.

### Make it yours

<img src="https://raw.githubusercontent.com/Corrugator/streamdeck-mac-brightnesser/v1.0.0/release/github/assets/gallery-3.png" alt="Property Inspector with colors and renaming">

Pick custom text colors per dial. Rename each display to whatever makes sense ("Right", "Left", "Desk") — names persist across reboots and re-plugs, and the **Identify** button briefly flashes the matching physical monitor while you're editing.

---

## Features at a glance

- **Rotate to adjust** — 2 % brightness step per dial tick
- **Press to switch monitor** — cycles through every connected display
- **Active-display indicator** — red border briefly flashes on the selected screen
- **Rename displays** — custom names from the Property Inspector; click *Identify* to flash the matching monitor
- **Custom text colors** — per dial via Property Inspector
- **Auto-refresh** every 10 s — keeps in sync with external brightness changes
- **Privacy-respecting** — diagnostic logging is opt-in (off by default)
- **Universal Binary** — single helper covers Apple Silicon and Intel

---

## Supported displays

| Display | How it's driven |
|---|---|
| MacBook built-in | Apple DisplayServices |
| Apple Studio Display | Apple DisplayServices |
| Apple Pro Display XDR | Apple DisplayServices |
| Apple Thunderbolt Display | Apple DisplayServices |
| Other DDC/CI monitors | optional [`m1ddc`](https://github.com/waydabber/m1ddc) fallback |

The DisplayServices path uses the same private framework macOS itself uses for the System Settings brightness slider — that's why this plugin handles Studio Display and Pro Display XDR cleanly.

---

## Requirements

- macOS 12 (Monterey) or newer
- Stream Deck App 6.9 or newer
- Stream Deck+ (encoder/dial hardware)
- *Optional:* `brew install m1ddc` for non-Apple DDC/CI displays

---

## Verifying the download

```bash
shasum -a 256 com.corrugator.brightness.streamDeckPlugin
# 487f2c0b4d41b2df2dc8993dae559f61cfa36c5afa4dadeec68411619d6f2798
```

---

## Privacy & security

- 100 % local. No telemetry, no analytics, no network calls outside the local Stream Deck WebSocket.
- **Diagnostic logging is opt-in** — off by default. Enable from the Property Inspector when troubleshooting; turn off again afterwards. Even when enabled, log files stay in `~/Library/Logs/ElgatoStreamDeck/` — nothing leaves your machine.
- All OS interactions use `execFile` with array arguments — no shell, no injection vector.
- Universal helper binary verified clean (`strings`/`nm`) — no build paths, no PII, no embedded credentials.
- Source code in this repo; verify yourself with `npm run pack`.

## Known limitations

- macOS only (DisplayServices is Apple-private).
- Some inexpensive USB-C monitors expose neither DisplayServices nor DDC/CI — those will not appear in the display list.
- Apple may change DisplayServices in future macOS releases without notice; this plugin will need a patch if/when that happens.

## Acknowledgements

- [`m1ddc`](https://github.com/waydabber/m1ddc) by @waydabber for the DDC/CI fallback path.
- Elgato Stream Deck SDK (`@elgato/streamdeck` v2.1.0).
