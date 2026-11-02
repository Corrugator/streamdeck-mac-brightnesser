# Brightness Control v1.2.1-rc.3 — Fewer m1ddc calls, no more jumps to 50 % (Release Candidate)

> ⚠️ **Pre-release.** Third release candidate for v1.2.1, based on
> [Issue #8](https://github.com/Corrugator/streamdeck-mac-brightnesser/issues/8)
> and [Issue #4](https://github.com/Corrugator/streamdeck-mac-brightnesser/issues/4).

Thanks to [@Greenysmac](https://github.com/Greenysmac) for the crash
counts and the crash signature, and to
[@daspader](https://github.com/daspader) for spotting the 50 % jumps.

---

## What changed since v1.2.1-rc.2

### The plugin stops hammering a crashing m1ddc

**Symptom:** With certain display setups, `m1ddc` crashes on every call,
and macOS writes a crash report each time — dozens a day, and more than
20 in the first two minutes after boot.

**Root cause:** The crash itself is in `m1ddc`: it reads a null
IORegistry path for displays that have no DDC entry. But the plugin made
it much worse. When `m1ddc display list` failed, the DDC monitor dropped
out of the list, the dial switched to its fast 2-second reconnect poll,
and the next call crashed again — one crash every 2 seconds for as long
as the condition lasted.

**Fix:** From the second failure in a row, the plugin pauses `m1ddc` for
10 seconds, doubling with every further failure up to 5 minutes. A single
failure is still retried on the next poll, so a monitor that is just
waking up after a dock swap isn't delayed. The pause ends right away
when a display is added, removed or plugged back in, after wake, and when
the Stream Deck reconnects.

While `m1ddc` is paused, a dial bound to a DDC monitor shows
`Reconnecting…`.

### The dial no longer jumps to 50 %

**Symptom:** On some DDC monitors, the dial set to, say, 32 % showed 50 %
a few seconds later, although the monitor's brightness didn't change.

**Root cause:** When reading the current brightness over DDC failed, the
plugin filled in a fixed 50 %. The next refresh then overwrote the real
value.

**Fix:** Each monitor keeps the last brightness the plugin read or set.
A failed read keeps that value; 50 % is only shown before any value is
known.

---

## Unchanged from v1.2.1-rc.2

- Monitor queries run in the background; a slow monitor can't freeze the plugin
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

- ✅ Setups where `m1ddc` crashed: far fewer new reports in
  `~/Library/Logs/DiagnosticReports`, especially after boot and while
  undocked?
- ✅ After docking or waking, do DDC monitors come back on their own?
- ✅ DDC monitors whose reading failed: does the dial keep the value you
  set instead of jumping to 50 %?

**If something is off:** turn on **Enable diagnostic logging** in a
dial's settings. The plugin logs when it pauses `m1ddc` and which
command failed, in
`~/Library/Application Support/com.elgato.StreamDeck/Plugins/com.corrugator.brightness.sdPlugin/logs/`.
Please attach that log in the matching issue.

