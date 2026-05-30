# Elgato Marketplace — Copy-Paste-Quelle

Beide Blöcke sind reines Plaintext. Direkt aus dem Codeblock kopieren
und ins jeweilige Form-Feld einfügen. Keine `<img>`-Tags, keine
Markdown-Bilder, keine Badges — Elgato's Form-Renderer kommt damit
zuverlässig klar.

---

## 1. FORMFELD: "Long Description" / "Beschreibung"

```
Brightness Control turns the Stream Deck+ dials into a direct hardware
brightness regulator for every monitor connected to your Mac — the
built-in MacBook display, Apple Studio Display, Pro Display XDR, and
most third-party USB-C/HDMI monitors.

Rotate a dial to adjust brightness in 2 % steps. Press the dial to
cycle through all connected displays — a red border briefly flashes
on the newly selected screen so you always know which one you're
controlling. The LCD strip shows monitor name, exact brightness
percentage, a live bar indicator, and a switch hint such as
"Press to switch 2/3".

Built on Apple's native DisplayServices framework — the same API
macOS uses internally for its own brightness controls. This means it
works reliably with Apple Studio Displays and Pro Display XDR, which
most third-party tools can't touch because they use a proprietary
Thunderbolt protocol instead of standard DDC/CI.

For third-party monitors that don't expose DisplayServices, the
plugin falls back to m1ddc (optional, install via "brew install m1ddc").


KEY FEATURES

• Rotate to adjust brightness — 2 % step per dial tick
• Press to cycle through every connected monitor
• Visual switch-confirmation: red border briefly flashes on the active
  display so you always know which screen you're tuning
• Rename displays — give each monitor a custom name from the Property
  Inspector ("Right", "Left", "Desk") that persists across reboots
  and re-plugs. Click the "Identify" button to flash the matching
  physical monitor while editing — useful when two monitors carry
  the same default name
• Customisable text colours per dial via the Property Inspector
• Auto-refresh every 10 seconds — external brightness changes
  (System Settings, ambient sensor, AppleScript) stay in sync
• Privacy-respecting — diagnostic logging is opt-in, off by default
• Universal Binary covering Apple Silicon and Intel


SUPPORTED DISPLAYS

• MacBook built-in display
• Apple Studio Display (including multiple units side-by-side)
• Apple Pro Display XDR
• Apple Thunderbolt Display
• Any display macOS can address via DisplayServices
• Third-party DDC/CI monitors via the optional m1ddc fallback


REQUIREMENTS

• macOS 12 (Monterey) or newer
• Stream Deck App 6.9 or newer
• Stream Deck+ (encoder/dial hardware)
• Optional: m1ddc (install via "brew install m1ddc") for non-Apple
  monitors that don't expose DisplayServices


PRIVACY

100 % local. No telemetry, no analytics, no network calls outside the
local Stream Deck WebSocket. The plugin reads display metadata from
macOS (IOKit) and the open-source m1ddc tool only — nothing leaves
your machine.

Diagnostic logging is opt-in: off by default, with a toggle in the
Property Inspector. Even when enabled, logs stay in
~/Library/Logs/ElgatoStreamDeck/ on your machine — no data ever
leaves your Mac.


SOURCE & SUPPORT

Open source on GitHub:
https://github.com/Corrugator/streamdeck-mac-brightnesser

Latest signed bundle (with SHA-256 verification):
https://github.com/Corrugator/streamdeck-mac-brightnesser/releases/latest

Issues and feature requests:
https://github.com/Corrugator/streamdeck-mac-brightnesser/issues
```

---

## 2. FORMFELD: "Release Notes" / "What's New" (für v1.0.0)

```
Initial release of Brightness Control — a Stream Deck+ plugin that
turns the dials into a hardware brightness regulator for every
display connected to your Mac.

WHAT IT DOES

Live brightness across every dial
Each dial controls one display. Rotate to adjust brightness in 2 %
steps, press to cycle through every connected monitor. The LCD shows
monitor name, exact percentage, a live bar, and a switch hint.

Always know which screen you're tuning
Pressing a dial briefly outlines the active monitor in red — a
glance confirms you're tuning the right screen, especially handy
with two identical displays side by side.

Make it yours
Pick custom text colours per dial. Rename each display ("Right",
"Left", "Desk") and the custom name appears on the dial LCD instead
of the macOS-reported one. Names persist across reboots and re-plugs.
While editing, the "Identify" button briefly flashes the matching
physical monitor in red so you always know which one you're naming.


FEATURE SUMMARY

• Rotate to adjust brightness (2 % per dial tick)
• Press to cycle through connected monitors
• Red border flashes on the active display
• Per-display custom names with Identify button
• Per-dial custom text colours via Property Inspector
• Auto-refresh every 10 s keeps in sync with external changes
• Opt-in diagnostic logging (off by default)
• Universal Binary (Apple Silicon + Intel)


SUPPORTED DISPLAYS

• MacBook built-in — Apple DisplayServices
• Apple Studio Display — Apple DisplayServices
• Apple Pro Display XDR — Apple DisplayServices
• Apple Thunderbolt Display — Apple DisplayServices
• Other DDC/CI monitors — optional m1ddc fallback


REQUIREMENTS

• macOS 12 (Monterey) or newer
• Stream Deck App 6.9 or newer
• Stream Deck+ encoder/dial hardware
• Optional: brew install m1ddc for non-Apple DDC/CI displays


PRIVACY & SECURITY

• 100 % local. No telemetry, no analytics, no network calls outside
  the local Stream Deck WebSocket.
• Diagnostic logging is opt-in — off by default.
• OS interactions use execFile with array arguments (no shell, no
  injection vector).
• Universal helper binary verified clean — no build paths, no PII,
  no embedded credentials.
• Open source — verify yourself with "npm run pack" from the repo.


KNOWN LIMITATIONS

• macOS only — DisplayServices is an Apple-private framework.
• Some inexpensive USB-C monitors expose neither DisplayServices nor
  DDC/CI — those will not appear in the display list.
• Apple may change DisplayServices in a future macOS release without
  notice; this plugin will need a patch if/when that happens.


ACKNOWLEDGEMENTS

• m1ddc by @waydabber for the DDC/CI fallback path.
• Elgato Stream Deck SDK (@elgato/streamdeck v2.1.0).
```

---

## 3. FORMFELDER: Kurze Werte (Single-Line)

| Feld | Wert |
|---|---|
| **Plugin Name** | `Brightness Control` |
| **Tagline / Short Description** | `Tune every connected Mac display from your Stream Deck+ dials.` |
| **Category (Primary)** | Utilities |
| **Tags (kommagetrennt)** | `mac, display, brightness, productivity, dial, encoder, studio display, pro display xdr` |
| **Supported Devices** | Stream Deck+ |
| **Supported Platform** | macOS 12.0 and newer |
| **Min Stream Deck App Version** | 6.9 |
| **Plugin Version** | 1.0.0 |
| **Source-Code-URL** | `https://github.com/Corrugator/streamdeck-mac-brightnesser` |

---

## 4. SHA-256 für den Manifest-Check (falls Elgato fragt)

```
d407ffc7980237ac6d9a26886d20889fe7049b6245f312d33b4ae45342d4e649
```

Verifizierung:

```bash
shasum -a 256 com.corrugator.brightness.streamDeckPlugin
```
