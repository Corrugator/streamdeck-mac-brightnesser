import streamDeck, {
  action,
  KeyDownEvent,
  SendToPluginEvent,
  SingletonAction,
} from '@elgato/streamdeck';
import {
  Display,
  applyBrightnessNow,
  getDisplayNames,
  getDisplays,
} from './display-manager';

/**
 * Brightness Preset — a keypad button that sets a FIXED brightness on a
 * specific monitor (or every connected monitor) with a single press.
 *
 * Deliberately separate from the dial action: a press = absolute value,
 * a rotate = relative change. Keeping them apart means the dial's
 * sleep/wake handling stays untouched. This action holds no long-lived
 * state and runs no polling timer — it pulls a fresh display list on every
 * press, which makes it inherently robust against the post-sleep index
 * shift the dial has to guard against.
 */

/** Sentinel displayKey meaning "apply to every connected display". */
const ALL_DISPLAYS = '__all__';
const DEFAULT_TARGET = 50;

type PresetSettings = {
  /** Stable identity key of the target display, or ALL_DISPLAYS. */
  displayKey?: string;
  /** Fixed brightness to apply, 0–100. */
  targetBrightness?: number;
  [key: string]: string | number | boolean | undefined;
};

function clampPercent(value: number | undefined): number {
  if (typeof value !== 'number' || isNaN(value)) return DEFAULT_TARGET;
  return Math.max(0, Math.min(100, Math.round(value)));
}

@action({ UUID: 'com.corrugator.brightness.preset' })
export class BrightnessPreset extends SingletonAction<PresetSettings> {
  /**
   * Action-scoped PI message handler. Using the scoped override (instead
   * of the global streamDeck.ui.onSendToPlugin the dial registers) keeps
   * the preset's PI traffic from being answered twice. Pulls the display
   * list fresh so a setup with ONLY preset buttons (no dial ever shown)
   * still gets a populated picker.
   */
  override onSendToPlugin(
    ev: SendToPluginEvent<PresetSettings, PresetSettings>
  ): void {
    const msg = ev.payload as { event?: string };
    if (msg?.event !== 'getDisplays') return;

    const names = getDisplayNames();
    const list = getDisplays().map((d) => ({
      key: d.stableKey,
      defaultName: d.defaultName,
      customName: names[d.stableKey] ?? '',
      method: d.method,
    }));
    streamDeck.ui.sendToPropertyInspector({
      event: 'displays',
      displays: list,
    } as unknown as Parameters<typeof streamDeck.ui.sendToPropertyInspector>[0]);
  }

  override async onKeyDown(ev: KeyDownEvent<PresetSettings>): Promise<void> {
    const { displayKey, targetBrightness } = ev.payload.settings;
    const target = clampPercent(targetBrightness);

    // Not configured yet — nothing to do, signal it.
    if (!displayKey) {
      await ev.action.showAlert();
      return;
    }

    // Pull fresh every press: robust against post-sleep index shifts and
    // plug/unplug without any cached state of our own.
    const displays = getDisplays();
    let targets: Display[];
    if (displayKey === ALL_DISPLAYS) {
      targets = displays;
    } else {
      const match = displays.find((d) => d.stableKey === displayKey);
      targets = match ? [match] : [];
    }

    if (targets.length === 0) {
      // Bound display absent (asleep / unplugged / m1ddc missing).
      await ev.action.showAlert();
      return;
    }

    const results = await Promise.all(
      targets.map((d) => applyBrightnessNow(d, target))
    );
    const anyOk = results.some((ok) => ok);
    if (anyOk) {
      await ev.action.showOk();
    } else {
      await ev.action.showAlert();
    }
  }
}
