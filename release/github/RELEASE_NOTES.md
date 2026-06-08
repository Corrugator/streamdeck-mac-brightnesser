# Brightness Control v1.1.0-rc.3 — Fix sleep/wake stale state (Release Candidate)

> ⚠️ **Pre-release.** Bug-fix iteration on v1.1.0 based on testing
> feedback from [Issue #1](https://github.com/Corrugator/streamdeck-mac-brightnesser/issues/1).

Thanks to [@Greenysmac](https://github.com/Greenysmac) for catching
the sleep/wake regression in rc.2.

---

## What changed since v1.1.0-rc.2

### Sleep/wake: dials no longer adjust the wrong monitor

**Symptom (rc.2):** After the Mac comes back from sleep, the PI
dropdown shows the correct displays, but rotating a dial adjusts the
brightness of the wrong monitor (or shows a stale brightness on the
LCD).

**Root cause:** The plugin caches the connected-displays list and
refreshes it every 10 seconds. The refresh timer is paused while the
Mac is asleep, so right after wake the cached list can be hours old.
The `index` and `ddcIndex` fields we use to address each monitor
(via the Swift helper for DisplayServices and `m1ddc` for DDC/CI)
are positional values that macOS may reorder after wake — the
stableKey identities don't change, but the index numbers do. Stale
indices → brightness commands land on whatever monitor now sits at
that position, not the one the dial is bound to.

**Fix:** Every dial interaction (`onDialRotate`, `onDialDown`) now
checks whether the cached displays array is older than 5 seconds.
If so, it forces a fresh helper roundtrip before processing the
event. That way the first dial action after wake re-resolves the
indices and subsequent rotates/presses use them. Cost is ~50–200 ms
on the first event after sustained inactivity; subsequent events
within the 5 second window use the cache as before.

```
Sleep/wake symptom diagram:

  Pre-sleep cache:                   Post-wake actual:
    [0] MacBook  (DS, idx 0)           [0] Studio    (DS, idx 0)  ← reordered
    [1] Studio   (DS, idx 1)           [1] MacBook   (DS, idx 1)
    [2] LG       (DDC, idx 0)          [2] LG        (DDC, idx 0)

  rc.2: dial bound to MacBook used cached index 0 → adjusts Studio. Wrong.
  rc.3: dial bound to MacBook re-resolves stableKey first → fresh index 1 → adjusts MacBook. Correct.
```

---

## Unchanged from rc.2

- Per-dial display assignment (each dial has its own bound monitor)
- Cycle mode (advances only the dial that was pressed)
- Locked mode default: press does nothing
- Opt-in: `Press opens System Settings → Displays`
- Identify button in PI for the naming workflow
- Per-dial text colors

## Install

> ⚠️ Installing this RC **replaces v1.0.0** since the plugin UUID is
> identical. If you want to keep v1.0.0 stable untouched, do not
> install the RC.

1. Download `com.corrugator.brightness.streamDeckPlugin` from the
   assets below.
2. Double-click. Stream Deck app installs it, overwriting any
   previous v1.x install.
3. Drag the **Brightness** action onto a Stream Deck+ dial.
4. Open the Property Inspector and pick a monitor or "Cycle".

## Verifying the download

```bash
shasum -a 256 com.corrugator.brightness.streamDeckPlugin
# bf05b82ddd54aa3f0145ba4413bd5de4df101b8147887ab7ed9c3742a8e53101
```

## Known limitations (unchanged)

- macOS only.
- DDC/CI monitors lack a CoreGraphics display ID, so the PI's
  Identify button doesn't flash them. (The "Identify only works for
  Mac monitor" thread from Issue #1 is still open as a separate
  enhancement.)
- macOS doesn't allow deep-linking to a specific monitor in
  System Settings → Displays — the opt-in "press opens settings"
  lands on the general Displays pane.

## Test focus for this RC

If you're testing, please confirm:
- ✅ Sleep the Mac, wake it back up, immediately rotate a dial → does it
  adjust the right monitor?
- ✅ Same as above but press first, then rotate → still right?
- ✅ Detach and reattach a display while running → does the dial
  adapt correctly?

Any regressions or weirdness — please drop a note in
[Issue #1](https://github.com/Corrugator/streamdeck-mac-brightnesser/issues/1).
