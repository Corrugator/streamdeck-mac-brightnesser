import { execFile, execFileSync } from 'child_process';
import { accessSync, chmodSync, constants } from 'fs';
import { basename, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import streamDeck from '@elgato/streamdeck';

export interface Display {
  id: string;
  index: number;
  name: string;             // resolved (user-custom if set, else defaultName)
  defaultName: string;      // original macOS-reported name
  stableKey: string;        // identity key — survives reboots/replugs; used to attach custom names
  brightness: number;
  method: 'ds' | 'ddc';     // ds = DisplayServices (Apple), ddc = m1ddc (third-party)
  cgDisplayID?: number;     // CoreGraphics display ID — stable identifier for highlight
  ddcIndex?: number;        // m1ddc display index (only for ddc method)
}

const M1DDC_CANDIDATE_PATHS = [
  '/opt/homebrew/bin/m1ddc', // Apple Silicon Homebrew
  '/usr/local/bin/m1ddc',    // Intel Homebrew
];

// ===== User-Custom Display Names =====
// Map<stableKey, customName>. Populated from globalSettings.displayNames by
// plugin.ts; getDisplays() consults this to resolve `display.name`.
let userDisplayNames: Record<string, string> = {};

export function setDisplayNames(names: Record<string, string>): void {
  userDisplayNames = names ?? {};
}

export function getDisplayNames(): Record<string, string> {
  return { ...userDisplayNames };
}

function resolveName(stableKey: string, defaultName: string): string {
  const custom = userDisplayNames[stableKey]?.trim();
  return custom && custom.length > 0 ? custom : defaultName;
}

// ===== Conditional Logger =====
// All calls become no-ops while diagnostic logging is disabled (default).
// The user opts in via the Property Inspector → globalSettings.diagnosticLogging.
let diagnosticLoggingEnabled = false;
const _scoped = streamDeck.logger.createScope('DisplayManager');

export function setDiagnosticLogging(enabled: boolean): void {
  diagnosticLoggingEnabled = enabled;
}

const logger = {
  trace: (...args: Parameters<typeof _scoped.trace>) => {
    if (diagnosticLoggingEnabled) _scoped.trace(...args);
  },
  info: (...args: Parameters<typeof _scoped.info>) => {
    if (diagnosticLoggingEnabled) _scoped.info(...args);
  },
  warn: (...args: Parameters<typeof _scoped.warn>) => {
    if (diagnosticLoggingEnabled) _scoped.warn(...args);
  },
  error: (...args: Parameters<typeof _scoped.error>) => {
    if (diagnosticLoggingEnabled) _scoped.error(...args);
  },
};

let helperPathCache: string | undefined;
let m1ddcPathCache: string | null | undefined;

function getHelperPath(): string {
  if (helperPathCache) return helperPathCache;
  const dir = dirname(fileURLToPath(import.meta.url));
  const path = join(dir, 'brightness-helper');
  // Stream Deck's plugin installer drops executable bits on bundled
  // binaries; ensure +x on first use so spawn doesn't fail.
  try {
    accessSync(path, constants.X_OK);
  } catch {
    try {
      chmodSync(path, 0o755);
      // Log basename only — full path would leak the user's home dir.
      logger.info(`Restored +x on helper: ${basename(path)}`);
    } catch (e) {
      logger.error(`Failed to chmod helper: ${basename(path)}`, e);
    }
  }
  helperPathCache = path;
  return path;
}

function runFile(bin: string, args: string[]): string {
  try {
    return execFileSync(bin, args, { encoding: 'utf-8', timeout: 5000 }).trim();
  } catch (e) {
    logger.error(`Command failed: ${bin} ${args.join(' ')}`, e);
    return '';
  }
}

function runFileChecked(bin: string, args: string[]): { ok: boolean; output: string } {
  try {
    const output = execFileSync(bin, args, { encoding: 'utf-8', timeout: 5000 }).trim();
    return { ok: true, output };
  } catch (e) {
    logger.error(`Command failed: ${bin} ${args.join(' ')}`, e);
    return { ok: false, output: '' };
  }
}

function baseName(n: string): string {
  return n.replace(/\s+\d+$/, '').trim().toLowerCase();
}

function getM1ddcPath(): string | null {
  if (m1ddcPathCache !== undefined) return m1ddcPathCache;
  for (const candidate of M1DDC_CANDIDATE_PATHS) {
    try {
      accessSync(candidate, constants.X_OK);
      m1ddcPathCache = candidate;
      return candidate;
    } catch {
      // not at this path, try next
    }
  }
  m1ddcPathCache = null;
  return null;
}

function getDDCDisplays(): Map<number, { ddcIndex: number; name: string; brightness: number; uuid: string }> {
  const result = new Map<number, { ddcIndex: number; name: string; brightness: number; uuid: string }>();

  const m1ddcPath = getM1ddcPath();
  if (!m1ddcPath) return result;

  const output = runFile(m1ddcPath, ['display', 'list']);
  if (!output) return result;

  for (const line of output.split('\n')) {
    // m1ddc format: [N] Display Name (UUID)
    const match = line.match(/^\[(\d+)\]\s+(.+?)\s+\(([0-9A-Fa-f-]+)\)\s*$/);
    if (!match) continue;

    const ddcIndex = parseInt(match[1], 10);
    let name = match[2].trim();
    const uuid = match[3];
    if (name === '(null)') continue;

    const brOutput = runFile(m1ddcPath, ['display', String(ddcIndex), 'get', 'luminance']);
    const rawBr = parseInt(brOutput, 10);
    const brightness = (!isNaN(rawBr) && rawBr >= 0 && rawBr <= 100) ? rawBr : -1;

    result.set(ddcIndex, { ddcIndex, name, brightness, uuid });
  }

  return result;
}

export function getDisplays(): Display[] {
  const helper = getHelperPath();
  const output = runFile(helper, ['list']);
  if (!output) {
    logger.warn('No output from brightness-helper list');
    return [];
  }

  const displays: Display[] = [];
  const dsUnsupportedIndices: number[] = [];
  // For DS displays without a real EDID serial (serial===0, common on
  // built-in panels), disambiguate by enumeration order under the same
  // (vendor, model) pair so two identical units still get distinct keys.
  const noSerialSeen = new Map<string, number>();

  for (const line of output.split('\n')) {
    const parts = line.split('|');
    // Helper now emits 9 cols: index|cgID|isBuiltIn|br%|name|dsSupp|vendor|model|serial
    if (parts.length < 6) continue;

    const index = parseInt(parts[0], 10);
    const cgDisplayID = parseInt(parts[1], 10);
    const isBuiltIn = parts[2] === 'true';
    const brightness = parseInt(parts[3], 10);
    const defaultName = parts[4];
    const dsSupported = parts[5] === 'true';
    const vendor = parts.length >= 9 ? parseInt(parts[6], 10) || 0 : 0;
    const model = parts.length >= 9 ? parseInt(parts[7], 10) || 0 : 0;
    const serial = parts.length >= 9 ? parseInt(parts[8], 10) || 0 : 0;

    let stableKey: string;
    if (serial !== 0) {
      stableKey = `ds:${vendor}-${model}-${serial}`;
    } else {
      const base = `${vendor}-${model}`;
      const seen = (noSerialSeen.get(base) ?? 0) + 1;
      noSerialSeen.set(base, seen);
      stableKey = `ds:${base}-n${seen}`;
    }

    if (dsSupported) {
      const resolved = resolveName(stableKey, defaultName);
      displays.push({
        id: `ds:${index}`,
        index,
        name: resolved,
        defaultName,
        stableKey,
        brightness: isNaN(brightness) ? 50 : brightness,
        method: 'ds',
        cgDisplayID: isNaN(cgDisplayID) ? undefined : cgDisplayID,
      });
      logger.trace(`Display ${index}: "${defaultName}" → "${resolved}" brightness=${brightness}% [DisplayServices]`);
    } else {
      dsUnsupportedIndices.push(index);
      logger.trace(`Display ${index}: "${defaultName}" – DisplayServices not supported, trying DDC`);
    }
  }

  if (dsUnsupportedIndices.length > 0 && getM1ddcPath()) {
    const ddcDisplays = getDDCDisplays();

    // DS displays may carry a "N" suffix for duplicates (added by Swift),
    // while m1ddc returns the raw name. Compare base names, and skip as many
    // ddc entries per base name as we already have ds entries.
    const dsCountsByBase = new Map<string, number>();
    for (const d of displays) {
      const base = baseName(d.name);
      dsCountsByBase.set(base, (dsCountsByBase.get(base) ?? 0) + 1);
    }
    const ddcSkippedByBase = new Map<string, number>();

    for (const [ddcIndex, ddc] of ddcDisplays) {
      const base = baseName(ddc.name);
      const skipBudget = dsCountsByBase.get(base) ?? 0;
      const alreadySkipped = ddcSkippedByBase.get(base) ?? 0;
      if (alreadySkipped < skipBudget) {
        ddcSkippedByBase.set(base, alreadySkipped + 1);
        continue;
      }

      const brightness = ddc.brightness >= 0 ? ddc.brightness : 50;
      const stableKey = `ddc:${ddc.uuid}`;
      const resolved = resolveName(stableKey, ddc.name);
      displays.push({
        id: `ddc:${ddcIndex}`,
        index: ddcIndex,
        name: resolved,
        defaultName: ddc.name,
        stableKey,
        brightness,
        method: 'ddc',
        ddcIndex,
      });
      logger.trace(
        `Display ddc:${ddcIndex}: "${ddc.name}" → "${resolved}" brightness=${brightness}% [m1ddc]`
      );
    }
  }

  logger.trace(`Found ${displays.length} displays total`);
  return displays;
}

export function setBrightness(display: Display, value: number): void {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));

  if (display.method === 'ds') {
    const helper = getHelperPath();
    const { ok } = runFileChecked(helper, ['set', String(display.index), String(clamped)]);
    if (ok) {
      display.brightness = clamped;
      logger.trace(`Set brightness DS "${display.name}" → ${clamped}%`);
    } else {
      logger.warn(`setBrightness DS failed for "${display.name}" target=${clamped}%`);
    }
  } else if (display.method === 'ddc') {
    const m1ddcPath = getM1ddcPath();
    if (!m1ddcPath) {
      logger.error(`Cannot set brightness for "${display.name}" – m1ddc not found`);
      return;
    }
    const { ok } = runFileChecked(m1ddcPath, ['display', String(display.ddcIndex), 'set', 'luminance', String(clamped)]);
    if (ok) {
      display.brightness = clamped;
      logger.trace(`Set brightness DDC "${display.name}" → ${clamped}%`);
    } else {
      logger.warn(`setBrightness DDC failed for "${display.name}" target=${clamped}%`);
    }
  }
}

export function highlightDisplay(display: Display, durationSeconds: number = 2): void {
  if (display.cgDisplayID === undefined) {
    logger.trace(`Highlight skipped for "${display.name}" – no cgDisplayID`);
    return;
  }
  const helper = getHelperPath();
  const dur = String(Math.max(0.1, durationSeconds));
  execFile(helper, ['highlight', String(display.cgDisplayID), dur], { timeout: 5000 }, (err) => {
    if (err) {
      logger.error(`Highlight failed for "${display.name}"`, err);
    }
  });
  logger.trace(`Highlight: "${display.name}" cgDisplayID=${display.cgDisplayID} duration=${dur}s`);
}

export function refreshBrightness(display: Display): number {
  if (display.method === 'ds') {
    const helper = getHelperPath();
    const output = runFile(helper, ['get', String(display.index)]);
    const val = parseInt(output, 10);
    if (!isNaN(val) && val >= 0 && val <= 100) {
      display.brightness = val;
    }
  } else if (display.method === 'ddc') {
    const m1ddcPath = getM1ddcPath();
    if (!m1ddcPath) return display.brightness;
    const output = runFile(m1ddcPath, ['display', String(display.ddcIndex), 'get', 'luminance']);
    const val = parseInt(output, 10);
    if (!isNaN(val) && val >= 0 && val <= 100) {
      display.brightness = val;
    }
  }
  return display.brightness;
}
