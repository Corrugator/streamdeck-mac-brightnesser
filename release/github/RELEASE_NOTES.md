# Brightness Control v1.1.0-rc.1 — Per-dial display assignment (Release Candidate)

> ⚠️ **Pre-release.** This is a release candidate, not yet promoted to
> stable. If you have v1.0.0 installed and it works for you, you can
> stay on it. Install this RC only if you want to help test the new
> per-dial assignment or you specifically need the behavior change
> below.

Addresses [Issue #1](https://github.com/Corrugator/streamdeck-mac-brightnesser/issues/1):
the v1.0.0 plugin tied all dials to a single shared current-display
index, so pressing one dial moved every dial to the new monitor at
once. v1.1.0-rc.1 gives each dial its own state.

---

## What's new

### Per-dial display assignment

Each dial now tracks its own monitor independently. Pressing dial 1
no longer drags dials 2 and 3 along. Set each dial up via the
Property Inspector — pick a specific monitor, or set the dial to
cycle through all monitors on press.

### Single dropdown for the per-dial decision

```
This Dial Controls:
  Cycle through all displays
  ─── or pick a specific display ───
  MacBook Display       (DisplayServices)
  Studio Display        (DisplayServices)
  LG UltraFine          (DDC/CI)
  Dell                  (DDC/CI)
```

- **Cycle:** press advances this dial only to the next monitor
- **Specific monitor (e.g. MacBook Display):** press just identifies
  that monitor with a red flash — the dial stays put. Safe against
  accidental presses.

### Behavior change vs v1.0.0

| Scenario | v1.0.0 | v1.1.0-rc.1 default |
|---|---|---|
| Press any dial | cycles **all** dials to next monitor | **identifies** the dial's bound monitor (no switching) |
| Rotate any dial | adjusts shared current monitor's brightness | adjusts the dial's bound monitor's brightness |
| Want the old cycle behavior? | (it was the only behavior) | set the dial's dropdown to **Cycle through all displays** |

The default for new dials is "locked" — pick one specific monitor —
because pressing a dial in v1.0.0 frequently surprised users by
moving multiple dials at once. Cycling is one click away in the PI
if you prefer it.

---

## Install

> ⚠️ Installing this RC **replaces v1.0.0** since the plugin UUID is
> identical. If you want to keep v1.0.0 working untouched, **do not**
> install the RC — wait for v1.1.0 stable, or use the test branch
> bundle (different UUID, side-by-side install) from the source repo.

1. Download `com.corrugator.brightness.streamDeckPlugin` from the
   assets below.
2. Double-click the file. The Stream Deck app installs it,
   overwriting v1.0.0 if installed.
3. Drag the **Brightness** action onto a Stream Deck+ dial.
4. Open the Property Inspector and pick a monitor (or "Cycle") for
   each dial.

## Verifying the download

```bash
shasum -a 256 com.corrugator.brightness.streamDeckPlugin
# e172be88047297801a559f4f48f168f1df9546c16d4faec6dc00f303f2519d90
```

## Existing features (unchanged from v1.0.0)

- Apple DisplayServices for built-in MacBook, Studio Display, Pro
  Display XDR, Thunderbolt Display
- m1ddc fallback for DDC/CI third-party monitors
- Identify highlight (red border flash) on the active display
- Custom per-display names (in PI, persisted globally across all
  dials)
- Custom text colors per dial
- Opt-in diagnostic logging
- Universal Binary (Apple Silicon + Intel)

## Known limitations

- macOS only (DisplayServices is Apple-private).
- DDC/CI monitors don't have a CoreGraphics display ID, so the
  identify-flash overlay doesn't work for them — the LCD switch
  hint shows nothing instead of "Press to identify" on those
  monitors.
- The "Identify only works for the Mac monitor" part of Issue #1 is
  not fixed in this RC. It's a separate work item.

## Acknowledgements

- @Greenysmac for filing Issue #1 with a clear three-display
  reproduction.
- [`m1ddc`](https://github.com/waydabber/m1ddc) by @waydabber for the
  DDC/CI fallback path.
- Elgato Stream Deck SDK (`@elgato/streamdeck` v2.1.0).
