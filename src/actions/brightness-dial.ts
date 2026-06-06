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
  refreshBrightness,
  setBrightness,
} from './display-manager';

type BrightnessSettings = {
  /** Stable identity key of the display this dial controls. */
  displayKey?: string;
  nameColor?: string;
  valueColor?: string;
  hintColor?: string;
  [key: string]: string | undefined;
};

const DEFAULT_COLOR = '#FFFFFF';
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

function updateFeedbackForAction(a: DialAction<BrightnessSettings>): void {
  const { nameColor, valueColor, hintColor } = colorsFor(a.id);
  const key = displayKeyByAction.get(a.id);
  const display = findDisplay(key);

  if (!key) {
    // No display assigned yet — prompt user via the LCD.
    a.setFeedback({
      monitorName: { value: 'Not configured', color: nameColor },
      brightnessValue: { value: '--', color: valueColor },
      indicator: 0,
      switchHint: { value: 'Open settings → pick a display', color: hintColor },
    });
    return;
  }

  if (!display) {
    // Display assigned but currently not connected.
    a.setFeedback({
      monitorName: { value: 'Disconnected', color: nameColor },
      brightnessValue: { value: '--', color: valueColor },
      indicator: 0,
      switchHint: { value: 'Display not connected', color: hintColor },
    });
    return;
  }

  a.setFeedback({
    monitorName: { value: display.name, color: nameColor },
    brightnessValue: { value: `${display.brightness}%`, color: valueColor },
    indicator: display.brightness,
    switchHint: {
      value: display.cgDisplayID !== undefined ? 'Press to identify' : '',
      color: hintColor,
    },
  });
}

function updateAllFeedback(instance: BrightnessDial): void {
  for (const a of instance.actions) {
    if (a.isDial()) {
      updateFeedbackForAction(a);
    }
  }
}

@action({ UUID: 'com.corrugator.brightness.test.dial' })
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
    if (ev.payload.settings.displayKey) {
      displayKeyByAction.set(ev.action.id, ev.payload.settings.displayKey);
    } else {
      displayKeyByAction.delete(ev.action.id);
    }
    if (ev.action.isDial()) {
      updateFeedbackForAction(ev.action);
    }
  }

  override onDialDown(ev: DialDownEvent<BrightnessSettings>): void {
    const key = displayKeyByAction.get(ev.action.id);
    const display = findDisplay(key);
    if (!display) {
      updateFeedbackForAction(ev.action);
      return;
    }
    refreshBrightness(display);
    highlightDisplay(display);
    updateFeedbackForAction(ev.action);
  }

  override onDialRotate(ev: DialRotateEvent<BrightnessSettings>): void {
    const key = displayKeyByAction.get(ev.action.id);
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
