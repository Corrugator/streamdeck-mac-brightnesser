import streamDeck from '@elgato/streamdeck';
import { BrightnessDial } from './actions/brightness-dial';
import { BrightnessPreset } from './actions/brightness-preset';
import { setDiagnosticLogging, setDisplayNames } from './actions/display-manager';

type DisplayNamesMap = { [key: string]: string };

type GlobalSettings = {
  diagnosticLogging?: boolean;
  displayNames?: DisplayNamesMap;
  [key: string]: boolean | DisplayNamesMap | undefined;
};

// SDK-internal noise is suppressed; our own logger calls additionally
// gate on the user-controlled diagnosticLogging flag (default: off).
streamDeck.logger.setLevel('error');

const dialAction = new BrightnessDial();
streamDeck.actions.registerAction(dialAction);
streamDeck.actions.registerAction(new BrightnessPreset());

function applyGlobalSettings(settings: GlobalSettings): void {
  setDiagnosticLogging(!!settings.diagnosticLogging);
  setDisplayNames(settings.displayNames ?? {});
  // Push the renamed labels onto every visible LCD immediately.
  dialAction.refreshAllVisible();
}

streamDeck.settings.onDidReceiveGlobalSettings<GlobalSettings>((ev) => {
  applyGlobalSettings(ev.settings);
});

streamDeck.connect().then(async () => {
  const settings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
  applyGlobalSettings(settings);
});
