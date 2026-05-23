# Release Assets

This folder contains release copy and future release assets for GitHub Releases and public launch posts.

## Files

- `release-notes-template.md`: copy-ready release notes structure.

Release images are not committed yet. Until final release artwork exists, use:

- `docs/assets/branding/banner.png` for the repository banner;
- `docs/assets/branding/icon.png` for launcher/app-icon presentation;
- real product screenshots from `docs/assets/screenshots/`.

Do not reference uncommitted thumbnail or installer artwork in public docs.

## Release Asset Checklist

Before publishing a GitHub Release:

1. Use the release notes template in this folder.
2. Attach validated platform artifacts only after CI/release workflow success.
3. Attach screenshots that show real implemented behavior.
4. Include unsigned-artifact warnings until signing is configured.
5. Confirm no screenshot or demo recording includes secrets, private URLs, or customer payloads.
6. Link to `docs/privacy.md`, `docs/security-model.md`, and `docs/manual-qa.md`.
