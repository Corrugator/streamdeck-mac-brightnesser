# Brightness Control v1.2.1-rc.2 — Plugin no longer stalls on slow monitors (Release Candidate)

> ⚠️ **Pre-release.** Second release candidate for v1.2.1, based on
> [Issue #4](https://github.com/Corrugator/streamdeck-mac-brightnesser/issues/4).

Thanks to [@daspader](https://github.com/daspader) for sending the
Stream Deck log at the right moment. It showed what rc.1 had missed.

---

## What changed since v1.2.1-rc.1

### The plugin stays responsive while it reads the connected monitors

**Symptom (rc.1 and earlier):** Some time after a dock swap, turning the
brightness dial only made it flash red. Other actions on the Stream Deck
kept working. Only restarting the Stream Deck app, or unplugging the
Stream Deck, brought the dial back.

**Root cause:** To find the connected monitors, the plugin asks the
bundled helper and, for third-party monitors, `m1ddc`. Those calls were
synchronous: while one ran, the plugin could do nothing else, for up to
5 seconds per call. A monitor that is slow to answer over DDC/CI, as
often happens right after a dock replug, stacked several of them. The
Stream Deck app then got no reply from the plugin for over 10 seconds,
treated it as hung and restarted it. The restarted plugin ran into the
same wait, and after three attempts the Stream Deck app **disabled** it.
The red flash was the Stream Deck app reporting the disabled plugin.

rc.1's reconnect handler was a real gap, but it didn't touch this. It
only added one more of those waits at the moment a dock comes back.

**Fix:**

1. **No more blocking.** All monitor queries now run in the background.
   A slow monitor still takes as long as it takes, but the plugin keeps
   answering the Stream Deck app the whole time.
2. **Bounded waits.** A query that doesn't finish in time is cancelled,
   and the plugin stops waiting even if the process refuses to exit.
   Brightness reads from DDC/CI monitors give up after 2.5 s instead of 5 s.
3. **One lookup at a time.** Several dials starting together, the regular
   poll, wake and reconnect now share one monitor lookup instead of each
   starting their own.

The sleep/wake protection from v1.1.0 is unchanged: after wake, the first
turn of a dial still waits for a fresh monitor list, so it never adjusts
the wrong screen.

---

## Unchanged from v1.2.1-rc.1

- Recovery when the Stream Deck reconnects (dock swaps)
- Brightness Preset keypad buttons
- Per-dial display assignment, Cycle / Locked modes, per-dial defaults

## Install

> ⚠️ Installing this RC **replaces** any previous v1.x install, since the
> plugin UUID is identical.

1. Download `com.corrugator.brightness.streamDeckPlugin` from the
   assets below.
2. Double-click. The Stream Deck app installs it over the previous
   version.
3. Existing dial assignments, presets and settings are preserved.

## Verifying the download

The SHA-256 checksum is in `com.corrugator.brightness.streamDeckPlugin.sha256`
next to the download:

```bash
shasum -a 256 -c com.corrugator.brightness.streamDeckPlugin.sha256
```

## Test focus for this RC

- ✅ Dock swaps over a few days: does the dial keep working, including
  hours after the swap and the morning after?
- ✅ Third-party (DDC/CI) monitors: does the dial still show and set the
  right brightness?
- ✅ Sleep → wake still recovers as before (no regression)?

**If it still fails:** in the dial's settings, turn on **Enable diagnostic
logging**. When a monitor query times out, the plugin now writes which
command hung into its log at
`~/Library/Application Support/com.elgato.StreamDeck/Plugins/com.corrugator.brightness.sdPlugin/logs/`.
Please attach that log in
[Issue #4](https://github.com/Corrugator/streamdeck-mac-brightnesser/issues/4).

