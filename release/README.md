# Release v1.0.0 — Brightness Control

Staging directory for the v1.0.0 release. Everything in here is
release-frozen and ready to upload.

## Structure

```
release/
├── elgato/                 # Elgato Marketplace submission package
│   ├── com.corrugator.brightness.streamDeckPlugin   # The plugin
│   ├── assets/             # Listing artwork
│   ├── LISTING.md          # Copy-paste for the submission form
│   └── SUBMISSION_GUIDE.md # Step-by-step submission
└── github/                 # GitHub release package
    ├── com.corrugator.brightness.streamDeckPlugin           # Release asset
    ├── com.corrugator.brightness.streamDeckPlugin.sha256    # Integrity hash
    ├── RELEASE_NOTES.md    # v1.0.0 changelog
    └── PUBLISH_GUIDE.md    # gh release create workflow
```

## Source of truth

- Plugin bundle: identical SHA-256 in `elgato/` and `github/`
  (`487f2c0b4d41b2df2dc8993dae559f61cfa36c5afa4dadeec68411619d6f2798`)
- Built from commit `523922e` (or later, as long as `npm run pack`
  produces the same hash).

## Order of operations

1. Publish the **GitHub** release first — gives users a direct
   download path and a permalink we can reference from the
   Marketplace listing.
2. Submit to **Elgato Marketplace** with the GitHub link included
   in the listing description.

This way the public download is live before Marketplace review
starts and any Marketplace QA reviewers can verify the binary
matches.
