# Release material

Listing copy, artwork and notes for publishing Brightness Control. The
plugin bundles in here are **historical** — current builds are attached
to the [GitHub releases](https://github.com/Corrugator/streamdeck-mac-brightnesser/releases)
and are not checked in.

## Structure

```
release/
├── elgato/                 # Elgato Marketplace submission package (written for v1.0.0)
│   ├── com.corrugator.brightness.streamDeckPlugin   # v1.0.0 bundle as submitted
│   ├── assets/             # Listing artwork
│   ├── LISTING.md          # Copy-paste for the submission form
│   ├── MARKETPLACE_DESCRIPTION.md
│   └── SUBMISSION_GUIDE.md # Step-by-step submission
├── github/                 # GitHub release material
│   ├── assets/             # Icons and gallery images (also used by the repo README)
│   ├── com.corrugator.brightness.streamDeckPlugin(.sha256)  # v1.0.0 bundle
│   ├── RELEASE_NOTES.md    # Notes of the most recent release
│   └── PUBLISH_GUIDE.md    # How a release is built and published
├── prerelease/             # v1.1.0 RC-phase bundle (1.1.0.0)
├── test/                   # Early test bundle, separate UUID (0.1.0.0)
└── drafts/                 # Icon drafts
```

## How releases are made now

Builds are produced by the release script, which builds, validates and
packs the plugin into `deployment/Github/` (not checked in), writes the
`.sha256`, tags and publishes. See [`github/PUBLISH_GUIDE.md`](github/PUBLISH_GUIDE.md).

- **Release candidates** are tagged on the feature branch and published
  as GitHub pre-releases. The latest stable release stays "Latest".
- **Final releases** are tagged on `master` after the feature branch is
  merged (v1.2.0 sits on the merge commit).

## Elgato Marketplace

The Marketplace has **v1.2** (published 2026-06-24), with its own
"What's new" text for 1.2 entered directly in the submission form — it
is not stored in `elgato/`.

The **overview description** there is still the v1.0.0 copy from
`elgato/` (press-to-cycle dials only, Stream Deck+ only, log folder
`~/Library/Logs/ElgatoStreamDeck/`). It doesn't mention per-dial
assignment or preset keys, and the log path is wrong. Update `elgato/`
and the listing together with the next Marketplace submission.
