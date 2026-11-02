import { execFile } from 'child_process';
import { accessSync, chmodSync, constants } from 'fs';
import { basename, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import streamDeck from '@elgato/streamdeck';

const execFileAsync = promisify(execFile);

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

// Every helper / m1ddc call runs asynchronously. The old synchronous calls
// blocked the event loop for up to 5 s each; a DDC monitor slow to answer
// (e.g. right after a dock replug) stacked several of them, Stream Deck
// stopped getting heartbeat replies, killed the plugin as unresponsive and
// after three strikes disabled it (issue #4).
const COMMAND_TIMEOUT_MS = 5000;
// DDC luminance reads: a monitor that doesn't answer quickly is reported
// with unknown brightness instead of holding up the whole display list.
const DDC_READ_TIMEOUT_MS = 2500;
// A child stuck in the kernel (mid DDC transaction) may not exit even on
// SIGKILL, and execFile only calls back once it does. Stop waiting this
// long after the kill so one wedged process can't stall refreshes forever.
const KILL_GRACE_MS = 1000;

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

async function runFileAsync(
  bin: string,
  args: string[],
  timeoutMs: number = COMMAND_TIMEOUT_MS
): Promise<{ ok: boolean; output: string }> {
  // Log basename only — the helper's full path would leak the home dir.
  const label = `${basename(bin)} ${args.join(' ')}`;
  const run = execFileAsync(bin, args, {
    encoding: 'utf-8',
    timeout: timeoutMs,
    killSignal: 'SIGKILL',
  }).then(
    ({ stdout }) => ({ ok: true, output: stdout.trim() }),
    (e) => {
      logger.error(`Command failed: ${label}`, e);
      return { ok: false, output: '' };
    }
  );
  let deadline: ReturnType<typeof setTimeout> | undefined;
  const gaveUp = new Promise<{ ok: boolean; output: string }>((resolve) => {
    deadline = setTimeout(() => {
      logger.error(`Gave up waiting for: ${label}`);
      resolve({ ok: false, output: '' });
    }, timeoutMs + KILL_GRACE_MS);
  });
  try {
    return await Promise.race([run, gaveUp]);
  } finally {
    clearTimeout(deadline);
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

// ===== m1ddc backoff =====
// On some display setups m1ddc crashes on every call (it dereferences a
// null IORegistry path for displays without a DDC entry, e.g. some Apple
// panels or Sidecar). The plugin used to retry on every poll — every 2 s
// while a DDC display was missing, which that crash guarantees — and macOS
// wrote a crash report each time (issue #8). From the second failure in a
// row, m1ddc is left alone for a growing interval. A change in the set of
// non-DisplayServices displays, a wake or a Stream Deck reconnect ends the
// pause early, since that's when DDC can actually have come back.
const M1DDC_BACKOFF_BASE_MS = 10_000;
const M1DDC_BACKOFF_MAX_MS = 5 * 60_000;
let m1ddcFailures = 0;
let m1ddcRetryAt = 0;
// Identity of the displays that would be looked up over DDC on the last
// enumeration; '' while there are none, so their return counts as a change.
let ddcCandidatesSignature = '';

function noteM1ddcResult(ok: boolean): void {
  if (ok) {
    m1ddcFailures = 0;
    m1ddcRetryAt = 0;
    return;
  }
  m1ddcFailures++;
  // A single failure (a monitor still waking up after a dock swap) is
  // retried on the next poll as before; only repeated failures back off.
  if (m1ddcFailures < 2) return;
  const delay = Math.min(
    M1DDC_BACKOFF_BASE_MS * 2 ** (m1ddcFailures - 2),
    M1DDC_BACKOFF_MAX_MS
  );
  m1ddcRetryAt = Date.now() + delay;
  logger.error(
    `m1ddc failed ${m1ddcFailures} times in a row; pausing DDC lookups for ${Math.round(delay / 1000)} s`
  );
}

/** End an m1ddc pause early — call when the displays may have changed. */
export function resetDdcBackoff(): void {
  m1ddcFailures = 0;
  m1ddcRetryAt = 0;
}

// Last brightness read or written per display (stableKey). A failed read
// falls back to this instead of a made-up 50 %, which made the dial jump to
// 50 % on every poll for monitors whose DDC reads fail (issue #4).
const lastKnownBrightness = new Map<string, number>();

function brightnessOrLastKnown(stableKey: string, read: number | undefined): number {
  if (read !== undefined) {
    lastKnownBrightness.set(stableKey, read);
    return read;
  }
  return lastKnownBrightness.get(stableKey) ?? 50;
}

async function getDDCDisplays(): Promise<Map<number, { ddcIndex: number; name: string; brightness: number; uuid: string }>> {
  const result = new Map<number, { ddcIndex: number; name: string; brightness: number; uuid: string }>();

  const m1ddcPath = getM1ddcPath();
  if (!m1ddcPath) return result;

  const { ok, output } = await runFileAsync(m1ddcPath, ['display', 'list']);
  noteM1ddcResult(ok);
  if (!output) return result;

  for (const line of output.split('\n')) {
    // m1ddc format: [N] Display Name (UUID)
    const match = line.match(/^\[(\d+)\]\s+(.+?)\s+\(([0-9A-Fa-f-]+)\)\s*$/);
    if (!match) continue;

    const ddcIndex = parseInt(match[1], 10);
    let name = match[2].trim();
    const uuid = match[3];
    if (name === '(null)') continue;

    const { output: brOutput } = await runFileAsync(
      m1ddcPath,
      ['display', String(ddcIndex), 'get', 'luminance'],
      DDC_READ_TIMEOUT_MS
    );
    const rawBr = parseInt(brOutput, 10);
    const brightness = (!isNaN(rawBr) && rawBr >= 0 && rawBr <= 100) ? rawBr : -1;

    result.set(ddcIndex, { ddcIndex, name, brightness, uuid });
  }

  return result;
}

export async function getDisplays(): Promise<Display[]> {
  const helper = getHelperPath();
  const { output } = await runFileAsync(helper, ['list']);
  if (!output) {
    logger.warn('No output from brightness-helper list');
    return [];
  }

  const displays: Display[] = [];
  // Displays DisplayServices can't drive; m1ddc is only consulted for them.
  const ddcCandidates: string[] = [];
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
        brightness: brightnessOrLastKnown(
          stableKey,
          isNaN(brightness) ? undefined : brightness
        ),
        method: 'ds',
        cgDisplayID: isNaN(cgDisplayID) ? undefined : cgDisplayID,
      });
      logger.trace(`Display ${index}: "${defaultName}" → "${resolved}" brightness=${brightness}% [DisplayServices]`);
    } else {
      ddcCandidates.push(`${cgDisplayID}:${vendor}-${model}-${serial}`);
      logger.trace(`Display ${index}: "${defaultName}" – DisplayServices not supported, trying DDC`);
    }
  }

  if (ddcCandidates.length === 0) {
    ddcCandidatesSignature = '';
  } else if (getM1ddcPath()) {
    const signature = ddcCandidates.sort().join(',');
    if (signature !== ddcCandidatesSignature) {
      ddcCandidatesSignature = signature;
      resetDdcBackoff();
    }
    let ddcDisplays: Awaited<ReturnType<typeof getDDCDisplays>> = new Map();
    if (Date.now() >= m1ddcRetryAt) {
      ddcDisplays = await getDDCDisplays();
    } else {
      logger.trace('Skipping m1ddc while DDC lookups are paused');
    }

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

      const stableKey = `ddc:${ddc.uuid}`;
      const brightness = brightnessOrLastKnown(
        stableKey,
        ddc.brightness >= 0 ? ddc.brightness : undefined
      );
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

/**
 * Fire the actual subprocess write for a single brightness target.
 * Returns true if the write succeeded, false otherwise.
 */
async function writeBrightness(display: Display, clamped: number): Promise<boolean> {
  if (display.method === 'ds') {
    const helper = getHelperPath();
    const { ok } = await runFileAsync(helper, [
      'set',
      String(display.index),
      String(clamped),
    ]);
    if (ok) {
      logger.trace(`Set brightness DS "${display.name}" → ${clamped}%`);
    } else {
      logger.warn(`setBrightness DS failed for "${display.name}" target=${clamped}%`);
    }
    return ok;
  } else if (display.method === 'ddc') {
    const m1ddcPath = getM1ddcPath();
    if (!m1ddcPath) {
      logger.error(`Cannot set brightness for "${display.name}" – m1ddc not found`);
      return false;
    }
    const { ok } = await runFileAsync(m1ddcPath, [
      'display',
      String(display.ddcIndex),
      'set',
      'luminance',
      String(clamped),
    ]);
    if (ok) {
      logger.trace(`Set brightness DDC "${display.name}" → ${clamped}%`);
    } else {
      logger.warn(`setBrightness DDC failed for "${display.name}" target=${clamped}%`);
    }
    return ok;
  }
  return false;
}

/**
 * Direct, awaitable brightness write for one-shot callers (e.g. preset
 * keypad buttons) that need to know whether it worked. Unlike the
 * coalesced fire-and-forget `setBrightness` — which exists to absorb rapid
 * dial ticks — this performs a single awaited write and reports success,
 * so the caller can decide showOk/showAlert. Still updates
 * `display.brightness` optimistically for consistency.
 */
export async function applyBrightnessNow(
  display: Display,
  value: number
): Promise<boolean> {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const ok = await writeBrightness(display, clamped);
  if (ok) {
    display.brightness = clamped;
    lastKnownBrightness.set(display.stableKey, clamped);
  }
  return ok;
}

// Coalesced brightness writes, keyed by stableKey. Spinning a dial fires
// many DialRotate events in quick succession. The old path shelled out
// synchronously per tick — and the helper re-enumerates every display on
// each `set` — which blocked the Node event loop (and the WebSocket) and
// made fast spins lag, badly on slow DDC/CI monitors. Now each tick only
// updates the latest desired value and at most ONE write runs at a time
// per display: when it finishes, it re-writes only if the target moved
// meanwhile. A fast spin collapses to ~2 subprocess calls per display and
// never blocks the event loop.
type PendingWrite = { target: number; writing: boolean };
const pendingByKey = new Map<string, PendingWrite>();

async function flushWrites(display: Display): Promise<void> {
  const pending = pendingByKey.get(display.stableKey);
  if (!pending || pending.writing) return;
  pending.writing = true;
  try {
    let lastWritten = -1;
    // Keep writing while newer ticks have moved the target. lastWritten is
    // advanced unconditionally so a failing write can't spin forever.
    while (pending.target !== lastWritten) {
      const target = pending.target;
      await writeBrightness(display, target);
      lastWritten = target;
    }
  } finally {
    pending.writing = false;
    pendingByKey.delete(display.stableKey);
  }
}

/**
 * Optimistically update `display.brightness` (so feedback and subsequent
 * ticks read the latest value immediately) and queue a coalesced async
 * write. Replaces the old synchronous setBrightness — see flushWrites.
 */
export function setBrightness(display: Display, value: number): void {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  display.brightness = clamped;
  lastKnownBrightness.set(display.stableKey, clamped);

  const existing = pendingByKey.get(display.stableKey);
  if (existing) {
    existing.target = clamped;
    if (existing.writing) return; // the in-flight write will pick this up
  } else {
    pendingByKey.set(display.stableKey, { target: clamped, writing: false });
  }
  void flushWrites(display);
}

/**
 * Open macOS System Settings → Displays. The OS doesn't let us deep-link
 * to a specific monitor's pane, so this just lands the user on the
 * general Displays settings — useful when a brightness dial is too
 * narrow for what they want to adjust (resolution, arrangement, etc).
 */
export function openDisplaySettings(): void {
  execFile(
    'open',
    ['x-apple.systempreferences:com.apple.Displays-Settings.extension'],
    { timeout: 5000 },
    (err) => {
      if (err) {
        logger.error('Failed to open Display Settings', err);
      } else {
        logger.trace('Opened Display Settings');
      }
    }
  );
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

export async function refreshBrightness(display: Display): Promise<number> {
  if (display.method === 'ds') {
    const helper = getHelperPath();
    const { output } = await runFileAsync(helper, ['get', String(display.index)]);
    const val = parseInt(output, 10);
    if (!isNaN(val) && val >= 0 && val <= 100) {
      display.brightness = val;
      lastKnownBrightness.set(display.stableKey, val);
    }
  } else if (display.method === 'ddc') {
    const m1ddcPath = getM1ddcPath();
    if (!m1ddcPath) return display.brightness;
    const { output } = await runFileAsync(
      m1ddcPath,
      ['display', String(display.ddcIndex), 'get', 'luminance'],
      DDC_READ_TIMEOUT_MS
    );
    const val = parseInt(output, 10);
    if (!isNaN(val) && val >= 0 && val <= 100) {
      display.brightness = val;
      lastKnownBrightness.set(display.stableKey, val);
    }
  }
  return display.brightness;
}
