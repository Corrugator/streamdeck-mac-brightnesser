# Brightness Control v1.1.0-rc.2 — Press-behavior consistency (Release Candidate)

> ⚠️ **Pre-release.** Iteration on the v1.1.0 RC based on testing
> feedback from [Issue #1](https://github.com/Corrugator/meta-streamdeck-mac-brightnesser/issues/1).
> If v1.0.0 stable works for you, you can stay on it — install this
> RC only if you want to help test the per-dial assignment and the
> new press-behavior model.

Thanks to [@Greenysmac](https://github.com/Greenysmac) for testing
v1.1.0-rc.1 and pointing out the inconsistency below.

---

## What changed since v1.1.0-rc.1

### "Press to identify" is gone in locked mode

In rc.1, pressing a dial in locked mode briefly flashed the bound
monitor in red. This only worked for DisplayServices monitors (Apple
displays) — DDC/CI monitors (LG UltraFine, Dell, etc.) silently did
nothing. The inconsistency made dial behavior unpredictable depending
on which monitor was bound.

**rc.2 fix:** by default, press in locked mode now **does nothing**.
Same behavior regardless of monitor type. The identify feature is
still available via the **Identify** button in the PI for naming /
matching display.

### Opt-in: press opens System Settings → Displays

Picking up Greenysmac's suggestion — in locked mode you can now
opt in to having press open macOS System Settings → Displays. Useful
as a quick jump-off when you need anything beyond brightness
(resolution, arrangement, HDR, etc.).

```
This Dial Controls
  [Specific display]    ← e.g. "Studio Display (DisplayServices)"

  ☐ Press opens System Settings → Displays
        Off by default. Useful as a quick jump-off for resolution,
        arrangement, or HDR — anything a brightness dial can't do.
        Only applies when a specific display is selected.
```

The checkbox only appears when a specific display is selected
(hidden in Cycle mode, where press already has a defined job —
cycling to the next monitor).

### LCD switch hint reflects the new behavior

| Mode | LCD hint |
|---|---|
| Cycle (2+ displays) | `Press to switch N/M` |
| Locked, opt-in enabled | `Press for settings` |
| Locked, opt-in disabled (default) | empty |

No more "Press to identify" — gone everywhere.

---

## Unchanged from rc.1

- Each dial has its own bound display and state (per-dial assignment)
- Cycle mode advances only the dial that was pressed
- PI dropdown combines "Cycle" and "Specific display" choices into
  one widget
- Rename displays globally, Identify button in PI for naming workflow
- Per-dial text colors

## Install

> ⚠️ Installing this RC **replaces v1.0.0** since the plugin UUID is
> identical. If you want to keep v1.0.0 stable untouched, do not
> install the RC.

1. Download `com.corrugator.brightness.streamDeckPlugin` from the
   assets below.
2. Double-click. Stream Deck app installs it, overwriting v1.0.0 if
   installed.
3. Drag the **Brightness** action onto a Stream Deck+ dial.
4. Open the Property Inspector and pick a monitor or "Cycle".
5. Optionally: enable "Press opens System Settings → Displays" for
   the dials where you want that jump-off.

## Verifying the download

```bash
shasum -a 256 com.corrugator.brightness.streamDeckPlugin
# 153fd2b4bcf17bded3039dca5058700981ae8658bd1a84e48575d41f6d61db32
```

## Known limitations (unchanged)

- macOS only.
- macOS doesn't allow deep-linking to a specific monitor in System
  Settings → Displays, so press-opens-settings lands on the general
  Displays pane, not focused on the dial's bound monitor.
- The "Identify only works for the Mac monitor" topic from Issue #1
  is now sidestepped (press doesn't identify in any mode), but the
  underlying DDC-monitors-lack-cgDisplayID limitation still applies
  to the PI's Identify button.

## Feedback

If you're testing, please drop notes in [Issue #1](https://github.com/Corrugator/streamdeck-mac-brightnesser/issues/1)
or open a new issue. Particularly interested in:
- Does press-opens-settings feel useful, or just visual clutter you'd
  rather not see?
- Anything surprising about the default-does-nothing behavior?
- Per-dial cycling still working as expected in your setup?
