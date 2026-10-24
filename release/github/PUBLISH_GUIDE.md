# GitHub Release — Publish Guide

So entsteht ein Release: Release Candidates vom Feature-Branch, das finale
Release nach dem Merge von `master`. Gebaut, getaggt und veröffentlicht wird
mit dem Release-Skript aus dem `streamdeck-release`-Skill:

```
~/.claude/skills/streamdeck-release/scripts/release.mjs
```

Das Skript baut mit `NODE_ENV=production`, validiert, packt nach
`deployment/Github/`, schreibt die `.sha256`, legt den Tag annotiert auf
`HEAD` des aktuellen Branches, pusht ihn und erstellt das Release mit
`--verify-tag`. Es bricht ab, wenn der lokale Stand nicht gepusht ist oder
der Tag schon auf einem anderen Commit liegt.

## Voraussetzungen

- `gh` installiert und angemeldet (`gh auth status`)
- Änderungen committet und gepusht

## 1. Version setzen

Version in beiden Dateien hochzählen, committen, pushen:

- `com.corrugator.brightness.sdPlugin/manifest.json` → `"Version": "X.Y.Z.0"`
- `package.json` → `"version": "X.Y.Z"`

Alle RCs einer Version tragen dieselbe Manifest-Version (bei 1.1.0 liefen
`rc.1` bis `rc.4` alle mit `1.1.0.0`). Die RC-Nummer steht nur im Tag.

## 2. Release Notes schreiben

Aufbau wie bei den bisherigen RCs: Symptom, Ursache, Fix, „Unchanged",
Install, Prüfsumme, Test-Fokus. Die Prüfsumme **nicht** von Hand eintragen,
sondern auf die mitgelieferte `.sha256` verweisen: Das Skript baut beim
echten Lauf neu, und der Hash weicht dann vom Dry-Run ab.

Die Notes des letzten Releases liegen in [`RELEASE_NOTES.md`](RELEASE_NOTES.md).

## 3. Release Candidate (vom Feature-Branch)

Erst trocken, dann echt:

```bash
node ~/.claude/skills/streamdeck-release/scripts/release.mjs --dry-run \
  --prerelease --tag vX.Y.Z-rc.N \
  --title "vX.Y.Z-rc.N — <Kurzbeschreibung> (RC)" \
  --tag-message "Brightness Control vX.Y.Z-rc.N — <Kurzbeschreibung>" \
  --notes-file <notes.md>
```

Ohne `--dry-run` wiederholen. `--prerelease` sorgt dafür, dass die letzte
stabile Version „Latest" bleibt.

## 4. Finales Release (von `master`)

1. PR des Feature-Branches nach `master` mergen.
2. `master` auschecken und `git pull`.
3. Skript ohne `--prerelease` und mit `--tag vX.Y.Z` ausführen. Das Release
   wird „Latest".

`v1.2.0` liegt auf dem Merge-Commit in `master`, so soll es bleiben.

## 5. Prüfen

```bash
gh release list --limit 3
gh release download vX.Y.Z -D /tmp/check
cd /tmp/check && shasum -a 256 -c com.corrugator.brightness.streamDeckPlugin.sha256
```

Nach dem Build ist `bin/brightness-helper` im Arbeitsverzeichnis geändert:
neu gebaut aus unveränderter Quelle, nur die Bytes weichen ab. Nicht
committen, mit `git restore` zurücksetzen.

## Wenn ein Release fehlerhaft ist

Einen Tag, den schon jemand heruntergeladen hat, nicht auf anderen Code
verschieben. Stattdessen die nächste RC-Nummer bzw. Patch-Version
veröffentlichen.

## Elgato Marketplace

Läuft getrennt und manuell, siehe [`../elgato/SUBMISSION_GUIDE.md`](../elgato/SUBMISSION_GUIDE.md).
Nur finale Versionen einreichen, keine RCs.
