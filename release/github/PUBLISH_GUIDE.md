# GitHub Release — Publish Guide

Step-by-step Anleitung für den GitHub Release v1.0.0.

## Voraussetzungen

- GitHub-Account, der das Repo besitzt (oder Push-Rechte hat)
- `gh` CLI installiert + authentifiziert (`gh auth status`)
- Repo lokal sauber (`git status` → working tree clean)

## Status-Check vor Release

```bash
# Aktueller HEAD
git log --oneline -1

# Bundle-Hash gegen Release-Asset prüfen
shasum -a 256 release/github/com.corrugator.brightness.streamDeckPlugin
# Erwartet:
# 487f2c0b4d41b2df2dc8993dae559f61cfa36c5afa4dadeec68411619d6f2798
```

## 1. Remote setzen (falls noch nicht geschehen)

`git remote -v` zeigt aktuell **keine Origin**. Vor dem Push:

```bash
# Repo auf GitHub anlegen (z.B. über gh)
gh repo create streamdeck-mac-brightnesser --public \
  --description "Stream Deck+ plugin for controlling Mac display brightness" \
  --source=. --remote=origin

# ODER: existierendes Remote setzen
# git remote add origin git@github.com:<USER>/streamdeck-mac-brightnesser.git
```

## 2. Branch + Code pushen

```bash
git push -u origin master
```

> Falls du auf `main` umbenennen willst, vorher:
> ```bash
> git branch -m master main
> git push -u origin main
> ```

## 3. Release-Tag setzen

```bash
git tag -a v1.0.0 -m "Brightness Control v1.0.0 — initial public release"
git push origin v1.0.0
```

## 4. GitHub Release erzeugen

Eine Zeile, lädt Bundle + SHA-Datei als Assets hoch und nimmt die
Release Notes aus der vorbereiteten Markdown-Datei:

```bash
gh release create v1.0.0 \
  release/github/com.corrugator.brightness.streamDeckPlugin \
  release/github/com.corrugator.brightness.streamDeckPlugin.sha256 \
  --title "v1.0.0 — Initial release" \
  --notes-file release/github/RELEASE_NOTES.md
```

GitHub erzeugt automatisch zusätzlich:
- `Source code (zip)`
- `Source code (tar.gz)`
… als Standard-Assets aus dem Tag.

## 5. Verifikation

```bash
# Release auf GitHub ansehen
gh release view v1.0.0

# Im Browser öffnen
gh release view v1.0.0 --web
```

## 6. Optional — Latest-Pointer

```bash
gh release edit v1.0.0 --latest
```

## Nachgang

- Den Release-URL (`gh release view v1.0.0 --json url -q .url`) in die
  Elgato Marketplace Listing-Beschreibung einbauen (`../elgato/LISTING.md`,
  Platzhalter `<USER>` anpassen).
- README im Repo um einen Download-Badge ergänzen, sobald die URL
  bekannt ist.

## Wenn du einen Fehler im Bundle findest, NACHDEM der Release live ist

```bash
# Tag + Release löschen (vorsichtig!)
gh release delete v1.0.0 --yes
git push origin --delete v1.0.0
git tag -d v1.0.0

# Fix committen, neu packen, release-Ordner aktualisieren,
# dann ab Schritt 3 erneut
```
