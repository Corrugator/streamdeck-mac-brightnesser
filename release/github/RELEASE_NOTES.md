# Brightness Control v1.1.0-rc.4 — Fix lost bindings after sleep/wake (Release Candidate)

> ⚠️ **Pre-release.** Bug-fix iteration on v1.1.0 based on testing
> feedback from [Issue #1](https://github.com/Corrugator/streamdeck-mac-brightnesser/issues/1).

Thanks again to [@Greenysmac](https://github.com/Greenysmac) for the
video repro of the rc.3 wake bug — exactly what was needed to pin
this down.

---

## What changed since v1.1.0-rc.3

### Dial bindings survive sleep/wake (no more "everything says MacBook")

**Symptom (rc.3):** After wake, all dials showed "MacBook Display"
and stayed that way until you opened the PI and changed anything —
only then did the correct assignments come back.

**Root cause:** When macOS wakes, external monitors take a few
seconds to re-enumerate — during that window the OS reports only the
built-in display. If the plugin's refresh timer fired inside that
window, the displays cache contained just one entry, and the
binding-resolution helper **overwrote** each dial's binding with the
first available display (the MacBook). The correct binding only
survived in the persisted settings, which are re-read when the PI
saves something — hence "clicking inside and doing anything restores
the state."

**Fix (three layers):**

1. **Bindings are never overwritten.** A dial bound to a display
   keeps that binding even while the display is temporarily absent.
   The LCD shows the custom display name (if set) with a
   `Reconnecting…` hint instead of silently switching to the wrong
   monitor. Rotating in that state does nothing (no more brightness
   commands going to the wrong screen).
2. **Instant wake refresh.** The plugin now listens for macOS's
   wake notification (`systemDidWakeUp`) and refreshes immediately,
   instead of waiting for the next poll tick.
3. **Adaptive fast poll.** While any bound display is missing, the
   plugin polls every **2 seconds** (instead of the normal 10) until
   everything is back, then drops back to the normal cadence. The
   recovery is fully automatic — no PI interaction needed.

**Expected behavior after this fix:** Wake the Mac → dials briefly
show `Reconnecting…` while macOS re-attaches the external monitors
(typically 2–5 s, hardware-dependent) → everything snaps back to the
correct displays automatically. If you rotate a dial during the
reconnect window, nothing happens (better than adjusting the wrong
screen); a second later the dial is live again.

---

## Unchanged from rc.3

- Stale-index protection on every dial interaction (the rc.2 fix)
- Per-dial display assignment, Cycle mode, locked-mode press options
- Identify button in PI, custom display names, per-dial colors

## Install

> ⚠️ Installing this RC **replaces v1.0.0** since the plugin UUID is
> identical.

1. Download `com.corrugator.brightness.streamDeckPlugin` from the
   assets below.
2. Double-click. Stream Deck app installs it, overwriting any
   previous v1.x install.
3. Existing dial assignments and settings are preserved.

## Verifying the download

```bash
shasum -a 256 com.corrugator.brightness.streamDeckPlugin
# 36a9d64eb75997bf9c00a0bccce9dab98a9e53e2391f388c5c9f225a934533a8
```

## Test focus for this RC

- ✅ Sleep → wake → **don't touch anything** → do all dials return to
  their correct displays within a few seconds, on their own?
- ✅ Sleep → wake → rotate immediately during `Reconnecting…` → no
  wrong-monitor adjustment, dial becomes live shortly after?
- ✅ Unplug an external display while running → its dial shows
  `Reconnecting…` → replug → dial recovers automatically?

Anything off — drop a note in
[Issue #1](https://github.com/Corrugator/streamdeck-mac-brightnesser/issues/1).
