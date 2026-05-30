# Elgato Marketplace Listing — Brightness Control

Copy-paste source for the Marketplace submission form. Field order
matches the standard creator dashboard.

---

## Plugin Name
```
Brightness Control
```

## Short Description / Tagline
```
Tune every connected Mac display from your Stream Deck+ dials.
```

## Category
- Primary: **Utilities**
- Tags: `mac`, `display`, `brightness`, `productivity`, `dial`, `encoder`

## Supported Devices
- Stream Deck+ (Encoder / Dial)

## Supported Platforms
- macOS 12.0 (Monterey) and newer
- Apple Silicon and Intel (Universal Binary)

## Minimum Stream Deck App Version
- 6.9

## Long Description

```
Brightness Control turns the Stream Deck+ dials into a direct hardware
brightness regulator for every monitor connected to your Mac — internal
display, Apple Studio Display, Pro Display XDR, and most third-party
USB-C/HDMI monitors.

Rotate a dial to adjust brightness in 2 % steps. Press the dial to
cycle through all connected displays — a red border briefly flashes on
the newly selected screen so you always know which one you're
controlling. The LCD strip shows monitor name, exact brightness
percentage, a live bar indicator, and a switch hint.

Built on Apple's private DisplayServices framework — the same API
macOS uses internally for its own brightness controls. This means it
works reliably with Apple Studio Displays and Pro Display XDR, which
most third-party tools can't touch because they use a proprietary
Thunderbolt protocol instead of standard DDC/CI.

For third-party monitors that don't expose DisplayServices, the
plugin falls back to m1ddc (optional, install via `brew install m1ddc`).


KEY FEATURES

• Rotate to adjust brightness (2 % per tick)
• Press to switch between connected monitors
• Visual switch-confirmation: red border flashes on the active display
• LCD shows monitor name, brightness %, live bar, and current index
• Rename each display from the Property Inspector — "Left", "Right",
  "Desk", etc. — and the custom name shows on the dial LCD. Survives
  reboots and re-plugs (bound to the display's identity hash). Click
  a display's name (above its text field) to briefly flash the
  matching physical monitor in red — useful when two monitors carry
  the same default name.
• Customizable text colors per dial (Property Inspector)
• Auto-refresh every 10 s so external brightness changes stay in sync
• Privacy-respecting: diagnostic logging is opt-in, off by default
• Universal Binary (Apple Silicon + Intel)


SUPPORTED DISPLAYS

• MacBook built-in display
• Apple Studio Display (including multiple units)
• Apple Pro Display XDR
• Apple Thunderbolt Display
• Any display macOS can address via DisplayServices
• Third-party DDC/CI displays via optional m1ddc fallback


REQUIREMENTS

• macOS 12 (Monterey) or newer
• Stream Deck App 6.9 or newer
• Stream Deck+ (dial/encoder hardware)
• Optional: m1ddc (brew install m1ddc) for non-Apple displays
  without DisplayServices support


PRIVACY

100 % local. No telemetry, no analytics, no network calls outside the
local Stream Deck WebSocket. The plugin reads display metadata from
macOS (IOKit) and the open-source m1ddc tool only — nothing leaves
your machine.

Diagnostic logging is opt-in: off by default, with a toggle in the
Property Inspector. Even when enabled, logs stay in
~/Library/Logs/ElgatoStreamDeck/ on your machine — no data leaves
your Mac.


SOURCE & SUPPORT

Source code, issues, and discussions:
https://github.com/Corrugator/MacStreamBrightnesser

Latest signed bundle download (with SHA-256 verification):
https://github.com/Corrugator/MacStreamBrightnesser/releases/latest
```

## Release Notes (for this version)

See `../github/RELEASE_NOTES.md` — paste the same content into the
"What's new" field of the Marketplace form.

## Listing Assets

All in `assets/`:

| Asset | File | Size |
|---|---|---|
| Icon (Marketplace tile) | `icon-1024.png` | 1024×1024 |
| Icon (compact) | `icon-512.png` | 512×512 |
| Icon (thumbnail) | `icon-256.png` | 256×256 |
| Wide thumbnail / banner | `thumbnail.png` | 1920×960 |
| Gallery 1 | `gallery-1.png` | (see Marketplace spec) |
| Gallery 2 | `gallery-2.png` | (see Marketplace spec) |
| Gallery 3 | `gallery-3.png` | (see Marketplace spec) |

## Plugin File

`com.corrugator.brightness.streamDeckPlugin` — upload as-is.
