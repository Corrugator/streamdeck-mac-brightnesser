import streamDeck, {
  action,
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

let displays: Display[] = [];
let currentIndex = 0;
let refreshTimer: ReturnType<typeof setInterval> | undefined;
let visibleInstances = 0;
const colorsByAction = new Map<string, Colors>();

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

function currentDisplay(): Display | undefined {
  return displays[currentIndex];
}

function loadDisplays(): void {
  const newDisplays = getDisplays();
  const prev = currentDisplay();
  if (newDisplays.length > 0 && prev) {
    const newIdx = newDisplays.findIndex((d) => d.id === prev.id);
    currentIndex = newIdx >= 0 ? newIdx : 0;
  } else {
    currentIndex = 0;
  }
  displays = newDisplays;
}

function updateAllFeedback(instance: BrightnessDial): void {
  const display = currentDisplay();
  for (const a of instance.actions) {
    if (a.isDial()) {
      const { nameColor, valueColor, hintColor } = colorsFor(a.id);
      if (!display) {
        a.setFeedback({
          monitorName: { value: 'No Displays', color: nameColor },
          brightnessValue: { value: '--', color: valueColor },
          indicator: 0,
          switchHint: { value: 'No monitors found', color: hintColor },
        });
      } else {
        const monitorLabel =
          displays.length > 1
            ? `${currentIndex + 1}/${displays.length}`
            : '';
        a.setFeedback({
          monitorName: { value: display.name, color: nameColor },
          brightnessValue: { value: `${display.brightness}%`, color: valueColor },
          indicator: display.brightness,
          switchHint: {
            value:
              displays.length > 1 ? `Press to switch ${monitorLabel}` : '',
            color: hintColor,
          },
        });
      }
    }
  }
}

@action({ UUID: 'com.corrugator.brightness.dial' })
export class BrightnessDial extends SingletonAction<BrightnessSettings> {
  constructor() {
    super();
    // PI ↔ plugin RPC for the display-rename feature. The PI asks for
    // the current list of connected displays so it can render an
    // inline edit row per display, keyed by the stable identity hash.
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
        // PI uses this to grey out highlight-on-focus for monitors we
        // can't flash (DDC-only entries lack a CoreGraphics ID).
        canHighlight: d.cgDisplayID !== undefined,
      }));
      // Cast to silence the JsonValue constraint without pulling in
      // @elgato/utils as a direct dependency. The shape is JSON-safe.
      streamDeck.ui.sendToPropertyInspector({
        event: 'displays',
        displays: list,
      } as unknown as Parameters<typeof streamDeck.ui.sendToPropertyInspector>[0]);
      return;
    }

    if (msg.event === 'highlightDisplay' && typeof msg.key === 'string') {
      const target = displays.find((d) => d.stableKey === msg.key);
      if (target) {
        // Shorter than the dial-press highlight (2 s) — this is an
        // exploratory cue while editing, not a confirmation.
        highlightDisplay(target, 1.5);
      }
      return;
    }
  }

  override onWillAppear(ev: WillAppearEvent<BrightnessSettings>): void {
    colorsByAction.set(ev.action.id, colorsFromSettings(ev.payload.settings));
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
    updateAllFeedback(this);
  }

  override onDialDown(_ev: DialDownEvent<BrightnessSettings>): void {
    if (displays.length === 0) {
      loadDisplays();
    }

    if (displays.length > 1) {
      currentIndex = (currentIndex + 1) % displays.length;
    }

    const display = currentDisplay();
    if (display) {
      refreshBrightness(display);
      highlightDisplay(display);
    }

    updateAllFeedback(this);
  }

  override onDialRotate(ev: DialRotateEvent<BrightnessSettings>): void {
    const display = currentDisplay();
    if (!display) {
      loadDisplays();
      updateAllFeedback(this);
      return;
    }

    const { ticks } = ev.payload;
    const newBrightness = display.brightness + ticks * STEP_SIZE;
    setBrightness(display, newBrightness);
    updateAllFeedback(this);
  }

}
