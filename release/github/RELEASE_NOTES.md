# Brightness Control v1.0.1 — Marketplace icon compliance

Functionally identical to v1.0.0 — no need to update if you already
have v1.0.0 installed and working. This release exists purely to
satisfy Elgato Marketplace's icon-guidelines requirement that the
in-app category and action icons be monochrome white on transparent.

## What changed

- `imgs/plugin/category.png` / `@2x` → now white-on-transparent
  (was full-color MacBook + sun)
- `imgs/actions/brightness/icon.png` / `@2x` → now white-on-transparent
- Plugin manifest version bumped to `1.0.1.0`

The Marketplace listing icon (the colorful MacBook-with-sun) stays
as-is — that's the "Plugin Icon" slot which has no color restriction
per Elgato's spec.

---

## Install

1. Download **`com.corrugator.brightness.streamDeckPlugin`** from the
   assets below.
2. Double-click the file. The Stream Deck app installs it
   automatically.
3. Drag the **Brightness** action onto a Stream Deck+ dial.

## Features (unchanged from v1.0.0)

- Rotate dial → brightness ±2 % per tick
- Press dial → cycle through connected monitors with red-flash
  confirmation
- Rename displays from the Property Inspector — custom names persist
- Identify button flashes a monitor while editing its name
- Per-dial custom text colors
- Auto-refresh every 10 s
- Opt-in diagnostic logging (off by default)
- Universal Binary (Apple Silicon + Intel)

## Verifying the download

```bash
shasum -a 256 com.corrugator.brightness.streamDeckPlugin
# 67024894c2df56f1e8ec96a43a3ac1c028b36dbd18c2b3011ec3334ede5950d0
```

## Supported displays

| Display | How it's driven |
|---|---|
| MacBook built-in | Apple DisplayServices |
| Apple Studio Display | Apple DisplayServices |
| Apple Pro Display XDR | Apple DisplayServices |
| Apple Thunderbolt Display | Apple DisplayServices |
| Other DDC/CI monitors | optional [`m1ddc`](https://github.com/waydabber/m1ddc) fallback |

## Requirements

- macOS 12 (Monterey) or newer
- Stream Deck App 6.9 or newer
- Stream Deck+ (encoder/dial hardware)
- *Optional:* `brew install m1ddc` for non-Apple DDC/CI displays
