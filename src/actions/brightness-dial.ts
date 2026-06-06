import streamDeck, {
  action,
  DialAction,
  DialDownEvent,
  DialRotateEvent,
  DidReceiveSettingsEvent,
  SingletonAction,
  WillAppearEvent,
  WillDisappearEvent,
} from '@elgato/streamdeck';
import {
  Display,
  getDisplayNames,
  getDisplays,
  highlightDisplay,
  openDisplaySettings,
  refreshBrightness,
  setBrightness,
} from './display-manager';

/**
 * Press behavior per dial:
 * - 'locked' (default): the dial stays on its selected display. By
 *   default, pressing does nothing (consistent across Apple and
 *   DDC/CI monitors). Opt-in via pressOpensSettings to make press
 *   open System Settings → Displays.
 * - 'cycle': pressing advances THIS dial to the next display in the
 *   list (and persists the choice so it survives reload).
 */
type Mode = 'locked' | 'cycle';

type BrightnessSettings = {
  /** Stable identity key of the display this dial controls. */
  displayKey?: string;
  /** Press behavior, see Mode. */
  mode?: Mode;
  /**
   * Only used in 'locked' mode: when true, pressing the dial opens
   * macOS System Settings → Displays. When false (default), pressing
   * does nothing — safe against accidental presses.
   */
  pressOpensSettings?: boolean;
  nameColor?: string;
  valueColor?: string;
  hintColor?: string;
  [key: string]: string | boolean | undefined;
};

const DEFAULT_COLOR = '#FFFFFF';
const DEFAULT_MODE: Mode = 'locked';
const STEP_SIZE = 2;
const REFRESH_INTERVAL_MS = 10000;

type Colors = { nameColor: string; valueColor: string; hintColor: string };

const DEFAULT_COLORS: Colors = {
  nameColor: DEFAULT_COLOR,
  valueColor: DEFAULT_COLOR,
  hintColor: DEFAULT_COLOR,
};

// Module-level cache of all currently-connected displays. Shared across
// actions because the helper invocation is heavy and the data is the same
// for everyone.
let displays: Display[] = [];
let refreshTimer: ReturnType<typeof setInterval> | undefined;
let visibleInstances = 0;
const colorsByAction = new Map<string, Colors>();
// Per-action assignment: which display's stableKey each dial controls.
// This is the core of the "one dial = one monitor" model — replaces the
// shared currentIndex from the cycle-based prototype.
const displayKeyByAction = new Map<string, string>();
// Per-action press behavior (locked vs cycle).
const modeByAction = new Map<string, Mode>();
// Per-action: in locked mode, should press open System Settings?
const pressOpensSettingsByAction = new Map<string, boolean>();

function modeFor(actionId: string): Mode {
  return modeByAction.get(actionId) ?? DEFAULT_MODE;
}

function modeFromSettings(settings: BrightnessSettings): Mode {
  return settings.mode === 'cycle' ? 'cycle' : 'locked';
}

function pressOpensSettingsFor(actionId: string): boolean {
  return pressOpensSettingsByAction.get(actionId) ?? false;
}

function colorsFor(actionId: string): Colors {
  return colorsByAction.get(actionId) ?? DEFAULT_COLORS;
}

function colorsFromSettings(settings: BrightnessSettings): Colors {
  return {
    nameColor: settings.nameColor || DEFAULT_COLOR,
    valueColor: settings.valueColor || DEFAULT_COLOR,
    hintColor: settings.hintColor || DEFAULT_COLOR,
  };
}

function findDisplay(key: string | undefined): Display | undefined {
  if (!key) return undefined;
  return displays.find((d) => d.stableKey === key);
}

function loadDisplays(): void {
  displays = getDisplays();
}

function indexOfDisplay(key: string | undefined): number {
  if (!key) return -1;
  return displays.findIndex((d) => d.stableKey === key);
}

/** Default to the first display if this action has no current binding. */
function ensureCurrentKey(actionId: string): string | undefined {
  let key = displayKeyByAction.get(actionId);
  if (key && indexOfDisplay(key) !== -1) return key;
  if (displays.length > 0) {
    key = displays[0].stableKey;
    displayKeyByAction.set(actionId, key);
  }
  return key;
}

function updateFeedbackForAction(a: DialAction<BrightnessSettings>): void {
  const { nameColor, valueColor, hintColor } = colorsFor(a.id);
  const key = ensureCurrentKey(a.id);
  const display = findDisplay(key);

  if (!display) {
    a.setFeedback({
      monitorName: { value: 'No Displays', color: nameColor },
      brightnessValue: { value: '--', color: valueColor },
      indicator: 0,
      switchHint: { value: 'No monitors found', color: hintColor },
    });
    return;
  }

  const mode = modeFor(a.id);
  const idx = indexOfDisplay(key);
  const positionLabel =
    displays.length > 1 ? `${idx + 1}/${displays.length}` : '';
  let hint: string;
  if (mode === 'cycle' && displays.length > 1) {
    hint = `Press to switch ${positionLabel}`;
  } else if (mode === 'locked' && pressOpensSettingsFor(a.id)) {
    hint = 'Press for settings';
  } else {
    // Locked + no opt-in: press does nothing, no hint. Consistent for
    // every monitor type (no more "Press to identify" sometimes-flashes
    // that only worked for Apple displays).
    hint = '';
  }
  a.setFeedback({
    monitorName: { value: display.name, color: nameColor },
    brightnessValue: { value: `${display.brightness}%`, color: valueColor },
    indicator: display.brightness,
    switchHint: { value: hint, color: hintColor },
  });
}

function updateAllFeedback(instance: BrightnessDial): void {
  for (const a of instance.actions) {
    if (a.isDial()) {
      updateFeedbackForAction(a);
    }
  }
}

@action({ UUID: 'com.corrugator.brightness.dial' })
export class BrightnessDial extends SingletonAction<BrightnessSettings> {
  constructor() {
    super();
    streamDeck.ui.onSendToPlugin((ev) => {
      this.handlePIMessage(ev.payload as unknown);
    });
  }

  /** Public hook used by plugin.ts after global-settings updates. */
  refreshAllVisible(): void {
    loadDisplays();
    updateAllFeedback(this);
  }

  private handlePIMessage(payload: unknown): void {
    if (typeof payload !== 'object' || payload === null) return;
    const msg = payload as { event?: string; key?: string };

    if (msg.event === 'getDisplays') {
      const names = getDisplayNames();
      const list = displays.map((d) => ({
        key: d.stableKey,
        defaultName: d.defaultName,
        customName: names[d.stableKey] ?? '',
        method: d.method,
        canHighlight: d.cgDisplayID !== undefined,
      }));
      streamDeck.ui.sendToPropertyInspector({
        event: 'displays',
        displays: list,
      } as unknown as Parameters<typeof streamDeck.ui.sendToPropertyInspector>[0]);
      return;
    }

    if (msg.event === 'highlightDisplay' && typeof msg.key === 'string') {
      const target = displays.find((d) => d.stableKey === msg.key);
      if (target) {
        highlightDisplay(target, 1.5);
      }
      return;
    }
  }

  override onWillAppear(ev: WillAppearEvent<BrightnessSettings>): void {
    colorsByAction.set(ev.action.id, colorsFromSettings(ev.payload.settings));
    modeByAction.set(ev.action.id, modeFromSettings(ev.payload.settings));
    pressOpensSettingsByAction.set(
      ev.action.id,
      !!ev.payload.settings.pressOpensSettings
    );
    if (ev.payload.settings.displayKey) {
      displayKeyByAction.set(ev.action.id, ev.payload.settings.displayKey);
    }
    loadDisplays();
    updateAllFeedback(this);

    visibleInstances++;
    if (!refreshTimer) {
      refreshTimer = setInterval(() => {
        loadDisplays();
        updateAllFeedback(this);
      }, REFRESH_INTERVAL_MS);
    }
  }

  override onWillDisappear(ev: WillDisappearEvent<BrightnessSettings>): void {
    colorsByAction.delete(ev.action.id);
    displayKeyByAction.delete(ev.action.id);
    modeByAction.delete(ev.action.id);
    pressOpensSettingsByAction.delete(ev.action.id);
    visibleInstances = Math.max(0, visibleInstances - 1);
    if (visibleInstances === 0 && refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = undefined;
    }
  }

  override onDidReceiveSettings(
    ev: DidReceiveSettingsEvent<BrightnessSettings>
  ): void {
    colorsByAction.set(ev.action.id, colorsFromSettings(ev.payload.settings));
    modeByAction.set(ev.action.id, modeFromSettings(ev.payload.settings));
    pressOpensSettingsByAction.set(
      ev.action.id,
      !!ev.payload.settings.pressOpensSettings
    );
    if (ev.payload.settings.displayKey) {
      displayKeyByAction.set(ev.action.id, ev.payload.settings.displayKey);
    } else {
      displayKeyByAction.delete(ev.action.id);
    }
    if (ev.action.isDial()) {
      updateFeedbackForAction(ev.action);
    }
  }

  override async onDialDown(
    ev: DialDownEvent<BrightnessSettings>
  ): Promise<void> {
    if (displays.length === 0) {
      loadDisplays();
    }
    if (displays.length === 0) {
      updateFeedbackForAction(ev.action);
      return;
    }

    const mode = modeFor(ev.action.id);

    if (mode === 'locked') {
      // Locked default: press does nothing. Opt-in via PI to make
      // press open System Settings → Displays. Consistent regardless
      // of DisplayServices vs DDC/CI — the inconsistent "press to
      // identify" sometimes-feature is gone.
      if (pressOpensSettingsFor(ev.action.id)) {
        openDisplaySettings();
      }
      return;
    }

    // Cycle mode: advance THIS dial only — find current position,
    // advance by one, wrap around. Each dial has its own key in
    // displayKeyByAction so dial #1 doesn't drag dial #2 along.
    const currentKey = ensureCurrentKey(ev.action.id);
    const currentIdx = indexOfDisplay(currentKey);
    const nextIdx = (currentIdx + 1) % displays.length;
    const nextDisplay = displays[nextIdx];
    displayKeyByAction.set(ev.action.id, nextDisplay.stableKey);

    refreshBrightness(nextDisplay);
    highlightDisplay(nextDisplay);
    updateFeedbackForAction(ev.action);

    // Persist so this dial restores to the same display next launch.
    await ev.action.setSettings({
      ...ev.payload.settings,
      displayKey: nextDisplay.stableKey,
    });
  }

  override onDialRotate(ev: DialRotateEvent<BrightnessSettings>): void {
    const key = ensureCurrentKey(ev.action.id);
    const display = findDisplay(key);
    if (!display) {
      updateFeedbackForAction(ev.action);
      return;
    }
    const { ticks } = ev.payload;
    const newBrightness = display.brightness + ticks * STEP_SIZE;
    setBrightness(display, newBrightness);
    updateFeedbackForAction(ev.action);
  }
}
