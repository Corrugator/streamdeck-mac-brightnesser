# Elgato Marketplace — Copy-Paste-Quelle

Plaintext-Blöcke, direkt aus den Codeblocks kopieren und ins
jeweilige Form-Feld einfügen.

---

## 1. FORMFELD: "Long Description"

```
Brightness Control turns the Stream Deck+ dials into a hardware
brightness regulator for every Mac display — built-in MacBook,
Apple Studio Display, Pro Display XDR, and third-party DDC/CI
monitors.

Rotate to adjust in 2 % steps. Press to cycle through monitors —
a red border briefly flashes on the selected screen so you always
know which one you're controlling. Rename displays from the
Property Inspector ("Right", "Left", "Desk") and the custom names
show on the dial LCD instead of "Studio Display 1, 2, 3…".

Built on Apple's native DisplayServices framework — the same API
macOS uses for its own brightness slider. Reliable with Studio
Display and Pro Display XDR where most tools fail. For third-party
monitors, optional m1ddc fallback.


KEY FEATURES

• Rotate to adjust brightness (2 % per tick)
• Press to cycle monitors with red-flash confirmation
• Rename displays — custom names persist across reboots
• Identify button flashes a monitor while editing its name
• Per-dial custom text colours
• Auto-refresh stays in sync with System Settings changes
• Privacy-respecting: diagnostic logging is opt-in (off by default)
• Universal Binary (Apple Silicon + Intel)


REQUIREMENTS

macOS 12+, Stream Deck App 6.9+, Stream Deck+ hardware.
Optional: "brew install m1ddc" for non-Apple DDC/CI displays.


PRIVACY

100 % local. No telemetry, no network calls outside the Stream
Deck WebSocket. Diagnostic logging stays in
~/Library/Logs/ElgatoStreamDeck/ on your machine.


Open source: https://github.com/Corrugator/streamdeck-mac-brightnesser
```

---

## 2. FORMFELD: "Release Notes" / "What's New" (für v1.0.0)

```
Initial release.

Turns Stream Deck+ dials into a brightness regulator for every Mac
display. Built on Apple's DisplayServices — handles Studio Display
and Pro Display XDR where most tools fail. Third-party monitors via
optional m1ddc.

• Rotate dial → brightness ±2 % per tick
• Press dial → cycle through monitors with red-flash confirmation
• Rename displays from the Property Inspector — names persist
• Identify button flashes a monitor while editing its name
• Per-dial custom text colours
• Auto-refresh every 10 s
• Opt-in diagnostic logging (off by default)
• Universal Binary

Source code and issues:
https://github.com/Corrugator/streamdeck-mac-brightnesser
```

---

## 3. Kurzfelder

| Feld | Wert |
|---|---|
| **Plugin Name** | `Brightness Control` |
| **Tagline / Short Description** | `Tune every connected Mac display from your Stream Deck+ dials.` |
| **Category** | Utilities |
| **Tags** | `mac, display, brightness, productivity, dial, encoder, studio display, pro display xdr` |
| **Supported Devices** | Stream Deck+ |
| **Supported Platform** | macOS 12.0 and newer |
| **Min Stream Deck App Version** | 6.9 |
| **Plugin Version** | 1.0.0 |
| **Source-Code-URL** | `https://github.com/Corrugator/streamdeck-mac-brightnesser` |

---

## 4. SHA-256 (falls Elgato beim Manifest-Check fragt)

```
0b635c824b2a1ab6eeed686264a9001c459fccd05e6fdd5f34e1f4ef3e023f87
```

Verifizierung: `shasum -a 256 com.corrugator.brightness.streamDeckPlugin`
