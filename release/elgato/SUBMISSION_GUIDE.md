# Elgato Marketplace — Submission Guide

Step-by-step Anleitung für die Einreichung von Brightness Control v1.0.0.

## Voraussetzungen

- Elgato Maker Account (https://marketplace.elgato.com/creator)
- Account ist als Plugin-Creator freigeschaltet (kann je nach Status
  einen separaten Onboarding-Antrag erfordern)
- GitHub Release ist bereits live (siehe `../github/PUBLISH_GUIDE.md`)
  damit der Link in der Listing-Beschreibung funktioniert

## Schritte

### 1. Vorprüfung — Bundle-Integrität

```bash
shasum -a 256 release/elgato/com.corrugator.brightness.streamDeckPlugin
# Erwartet:
# d407ffc7980237ac6d9a26886d20889fe7049b6245f312d33b4ae45342d4e649
```

Falls der Hash abweicht: `npm run pack` neu laufen lassen,
`release/elgato/` neu befüllen, neu hashen.

### 2. Plugin-Manifest crosscheck

Vor jedem Upload prüfen, dass Version + UUID stimmen:

```bash
unzip -p release/elgato/com.corrugator.brightness.streamDeckPlugin \
  com.corrugator.brightness.sdPlugin/manifest.json | \
  grep -E '"(Version|UUID|Name|SDKVersion)"'
```

Erwartet:
- `"Name": "Brightness Control"`
- `"Version": "1.0.0.0"`
- `"UUID": "com.corrugator.brightness"`
- `"SDKVersion": 3`

### 3. Marketplace-Submission

1. Auf https://marketplace.elgato.com/creator einloggen
2. **Submit Plugin** klicken
3. Upload des Bundles: `release/elgato/com.corrugator.brightness.streamDeckPlugin`
4. Listing-Form füllen — alle Werte aus `LISTING.md`:
   - Name, Tagline, Long Description
   - Category: Utilities
   - Tags: mac, display, brightness, productivity, dial, encoder
   - Supported devices: Stream Deck+
   - Platforms: macOS 12.0+
5. Assets hochladen aus `assets/`:
   - Icon: `icon-1024.png` (Marketplace nimmt evtl. auch 512/256 als Variants)
   - Banner/Thumbnail: `thumbnail.png`
   - Gallery: `gallery-1.png`, `gallery-2.png`, `gallery-3.png`
6. Release Notes: Inhalt aus `../github/RELEASE_NOTES.md` einfügen
7. GitHub-Link in der Beschreibung auf den realen User/Org-Pfad anpassen

### 4. Review absenden

- **Submit for Review** klicken
- Review-Dauer: typischerweise 1–2 Wochen für Erstprüfung
- Bei Rückfragen: Elgato schreibt per Mail an die Account-Adresse

### 5. Nach Freigabe

- Marketplace-URL kommt per Mail → in der GitHub-Release-Beschreibung
  als zweite Download-Option ergänzen (Edit-Release auf GitHub)
- README.md im Repo um den Marketplace-Badge erweitern

## Bekannte Stolperfallen

- **Private API**: Das Plugin nutzt DisplayServices (private Framework).
  Elgato hat in der Vergangenheit Plugins durchgewinkt, die das tun,
  aber ggf. proaktiv in der Submission-Beschreibung erwähnen, dass
  derselbe Mechanismus auch von macOS System Preferences benutzt wird.
- **Code-Signing**: Das Helper-Binary ist nicht notarisiert. Falls
  Elgato das während des Reviews fordert, müsste der Helper neu mit
  Developer ID signiert + notarisiert werden, dann neu gepackt, neu
  gehasht, neu hochgeladen.
- **m1ddc**: NICHT mitliefern — m1ddc ist GPLv3, und seine Distribution
  würde Lizenzkollisionen erzeugen. Das Plugin nutzt es nur, wenn der
  User es selbst per Homebrew installiert hat. Das ist in der
  Listing-Beschreibung sauber dokumentiert.
