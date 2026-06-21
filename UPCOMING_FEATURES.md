# Upcoming Features

Planned work, not yet implemented. Items here are scoped and ready to build —
they're waiting on a gate (a release promotion, a dependency, a decision).

---

## Brightness Preset Buttons (Keypad action)

**Status:** Planned — blocked on promoting **v1.1.0** (per-dial displays) to stable.
**Source:** [Issue #2 — "Feature request: Assign to buttons"](https://github.com/Corrugator/streamdeck-mac-brightnesser/issues/2) (Valentin Despa)

### What the user asked for

Classic Stream Deck keypad buttons that act as brightness **presets**: one button
sets a fixed value (e.g. 10 %), another sets a high value (e.g. 100 %), so you can
flip between fixed brightness settings with a single press. Today the plugin only
offers the **Encoder/Dial** action (rotate to adjust) — there is no fixed-value
button.

### Scope (v1)

> **One keypad button = (a specific monitor **or** "All displays") + a fixed
> percentage. Pressing the button sets that value.**

No toggle, no relative +/−, no live polling. Those can follow later if requested.

### Feasibility

High, and cheap. All the heavy lifting already exists in
[`src/actions/display-manager.ts`](src/actions/display-manager.ts) and is cleanly
decoupled from the dial. A preset button only needs:

- `getDisplays()` → resolve display(s) by `stableKey`
- an awaitable write that reports success → for `showOk` / `showAlert`

**No Swift/helper changes. No new m1ddc handling. No changes to the dial's
sleep/wake logic** (the rc.3/rc.4 fixes stay untouched).

> **⚠️ Changed since this doc was first written (rc.5 work):** `setBrightness()`
> is now **fire-and-forget and coalesced** (optimistic update + async write,
> keyed by `stableKey`) — it returns `void`, so a preset button can no longer
> learn from it whether the write succeeded. That coalescing exists to absorb
> rapid *dial* ticks; a single keypad press doesn't need it. So the preset must
> use a direct, awaitable write instead (see step 0 below).

### Approach: a separate action, not an extension of the dial

A button (press = set fixed value) behaves fundamentally differently from the dial
(rotate = relative change). Cleaner and lower-risk to add a **new action**
`com.corrugator.brightness.preset` with `Controllers: ["Keypad"]`, leaving
[`brightness-dial.ts`](src/actions/brightness-dial.ts) — and its freshly-fixed
sleep/wake handling — alone.

### Implementation plan

0. **Export an awaitable write** in
   [`display-manager.ts`](src/actions/display-manager.ts). The internal
   `writeBrightness(display, clamped)` already does the real subprocess call;
   make it return `Promise<boolean>` (true on success) and export a thin wrapper
   `applyBrightnessNow(display, value): Promise<boolean>` that clamps, updates
   `display.brightness` optimistically, and awaits one write. The dial's
   coalescing path keeps calling `writeBrightness` internally — unchanged
   behaviour. The preset uses `applyBrightnessNow` so it can report real
   success/failure. (~10 lines, no change to the dial.)

1. **Manifest** — add a second action in
   [`manifest.json`](com.corrugator.brightness.sdPlugin/manifest.json):
   `UUID: com.corrugator.brightness.preset`, `Controllers: ["Keypad"]`, own icon,
   `PropertyInspectorPath: ui/brightness-preset-pi.html`. (Bump SDK-version-safe;
   keep the existing dial action intact.)

2. **New action** `src/actions/brightness-preset.ts`
   - Settings: `displayKey` (a `stableKey`, or the special value `__all__`) +
     `targetBrightness` (0–100) + optional title color.
   - `onKeyDown`: pull `getDisplays()` fresh → resolve target(s) →
     `await Promise.all(targets.map(d => applyBrightnessNow(d, targetBrightness)))`.
     - `__all__`: every connected display.
     - specific key: the one display matching `stableKey` (may be absent → empty).
   - Feedback: `showOk()` if **at least one** write resolved `true`;
     `showAlert()` if no target was reachable (asleep / cable out / m1ddc missing)
     or every write failed.
   - No polling timer — pulling fresh on every press is inherently robust against
     the post-sleep index-shift problem (simpler than the dial).
   - **Reuse the helper coalescing? No.** A press is a single discrete event;
     `applyBrightnessNow` (direct await) is the right tool, not the dial's
     fire-and-forget queue.

3. **Register** the action — second `registerAction` in
   [`plugin.ts`](src/plugin.ts).

4. **Property Inspector** `ui/brightness-preset-pi.html`
   - **Own `getDisplays` handler — do NOT depend on the dial's display cache.**
     The dial's `handlePIMessage` answers `getDisplays` from a module-level cache
     that is only populated once a *dial* has appeared / polled. A user with only
     preset buttons (no dial) would get an empty/stale list. So the preset action
     registers its own `streamDeck.ui.onSendToPlugin` handler that calls
     `getDisplays()` fresh and replies with the same `{ event: 'displays', ... }`
     shape the existing PI already understands. (Custom display names come from
     `getDisplayNames()`, same as the dial.)
   - Display picker: top option **"All displays"** (modeled on the dial's
     "Cycle through all displays"), separator, then individual monitors.
   - Target brightness input: slider 0–100 + number field (kept in sync).
   - Optional: render the target value as the button title.

5. **Build / release** — `rollup` picks up the new action automatically; bump the
   manifest version, repack `.sdPlugin`, ship in the next rc build.

### Notes / risks

- **PI message cross-talk.** The dial registers a **global**
  `streamDeck.ui.onSendToPlugin` listener in its constructor (not action-scoped),
  so it receives `getDisplays` from *any* PI — including the preset's. If the
  preset also adds a global listener, a single `getDisplays` triggers two replies
  to the same PI. Use the **action-scoped** `override onSendToPlugin(ev)` on the
  preset action (the SDK routes it only for that action), and consider migrating
  the dial to the scoped override too. Harmless if missed (double render), but
  worth doing cleanly.
- **Dial action stays completely untouched** — sleep/wake fixes unaffected
  (step 0 only refactors `writeBrightness`'s return type; the dial's coalesced
  path is unchanged).
- **DDC/CI monitors** work the same as on the dial (via m1ddc). Same known limit:
  no Identify flash, but setting brightness works.
- **"All displays" with mixed transports**: Apple (DisplayServices) and third-party
  (DDC/CI) are handled in the same loop. DDC writes are ~50–150 ms slower per
  monitor — noticeable with several DDC displays but harmless (no live feedback
  needed).
- **Partial availability after wake**: only the currently-attached displays are
  set; still reports `showOk`. Consistent with the "pull fresh on every press"
  strategy.

### Effort estimate

Small — roughly one new action file (~80 lines) plus a trimmed-down PI HTML. ~80 %
of the logic already exists.
