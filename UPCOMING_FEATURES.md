# Upcoming Features

Planned work, not yet implemented. Each item lists what it's waiting on
(a test, a decision, a release) and links the issue where it's discussed.

---

## LCD style switch — match Elgato's dial look

**Status:** Lab build exists, not yet tested on hardware.
**Source:** [Issue #3 — "Match styling of other plugins"](https://github.com/Corrugator/streamdeck-mac-brightnesser/issues/3) (danvpeterson)

A per-dial **LCD Style** setting: the current four-line layout stays the
default, Elgato's built-in `$B1` layout (title, icon, value, bar) becomes
an option. The built-in layouts have no hint line, so `Reconnecting…` and
"No monitors found" take over the title while they apply, and the Cycle
position and press hint aren't shown.

The lab build lives on the local branch `lab/lcd-style-switch`
(`27adb4c`, 2026-07-26). It installs as a separate plugin
(`com.corrugator.brightness.lab`) next to the real one; its test plan is
`TESTING-LCD-STYLE.md` on that branch.

**Next:** run the hardware test. The open question is whether the
built-in layouts render with the item keys the build assumes (`title`,
`icon`, `value`, `indicator`) — wrong keys fail silently as a blank LCD.

**Before it can ship:**
- Port the changes in `brightness-dial.ts` and the PI onto the current
  code. The branch itself isn't mergeable: it renames the plugin folder,
  UUIDs and build paths, and predates the v1.2.1 fixes.
- If `setFeedbackLayout` fails, the lab build marks the layout as applied
  anyway and never retries, leaving the dial blank. Needs a retry or a
  fallback to the default layout.
- Its commit message carries a `Co-Authored-By` line; reword before the
  branch is ever pushed.

---

## Contrast control

**Status:** Requested, not started.
**Source:** [Issue #6](https://github.com/Corrugator/streamdeck-mac-brightnesser/issues/6) (requested by daspader in #4)

Adjust monitor contrast alongside brightness.

- Only DDC/CI monitors can support it. `m1ddc` already reads and sets
  `contrast` the same way the plugin uses `luminance`.
- Apple displays and built-in panels (DisplayServices) have no contrast
  control; for them the option should be hidden or shown as unavailable.
- **Decision needed:** a separate Contrast dial action, or a mode on the
  existing dial. A separate action is simpler and leaves the brightness
  dial's behavior untouched.

---

## Identify for DDC/CI monitors

**Status:** Not started, cause understood.
**Source:** [Issue #7](https://github.com/Corrugator/streamdeck-mac-brightnesser/issues/7) (split out of #1, Greenysmac)

**Identify** and the red outline need a monitor's CoreGraphics display ID.
The helper reports that ID for every online display, DDC ones included,
but `getDisplays()` drops it for displays without DisplayServices support,
and the m1ddc entries built afterwards never get one.

**Approach:** carry the ID over to the matching m1ddc entry. Matching by
name breaks with two identical monitors; matching by UUID is robust if
m1ddc's UUID equals `CGDisplayCreateUUIDFromDisplayID` for the display —
check that first.

---

## Known issues to fix

### Diagnostic logging only records errors

`plugin.ts` sets the SDK logger to `error`, and the `DisplayManager` scope
inherits that level. With **Enable diagnostic logging** on, only
`logger.error` calls reach the log file; every `trace`/`info`/`warn` line
is dropped. Command failures and timeouts are logged as errors, so the
most useful lines do get through. Fix: raise the scope's level while the
toggle is on, and log the important trace lines at `info` or above (the
file target's floor is `debug` outside debug mode).

### Property Inspector names the wrong log folder

The help text under **Diagnostics** points to
`~/Library/Logs/ElgatoStreamDeck/` (the Stream Deck app's own logs). The
plugin writes to
`~/Library/Application Support/com.elgato.StreamDeck/Plugins/com.corrugator.brightness.sdPlugin/logs/`.

---

## Shipped

- **Brightness Preset buttons** ([#2](https://github.com/Corrugator/streamdeck-mac-brightnesser/issues/2)) — v1.2.0
- **Per-dial display assignment** ([#1](https://github.com/Corrugator/streamdeck-mac-brightnesser/issues/1)) — v1.1.0 RCs, stable in v1.2.0
