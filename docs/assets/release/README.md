# Release Assets

This folder contains assets for GitHub Releases and public launch posts.

## Files

- `icon.png`: release/app icon placeholder generated from the temporary SocketLens mark.
- `thumbnail.png`: 16:9 release thumbnail placeholder for GitHub release pages.
- `socketlens-release-thumbnail.svg`: 16:9 release thumbnail for GitHub and social previews.
- `release-notes-template.md`: copy-ready release notes structure.

## Release Asset Checklist

Before publishing a GitHub Release:

1. Use the release notes template in this folder.
2. Attach validated platform artifacts only after CI/release workflow success.
3. Attach screenshots that show real implemented behavior.
4. Include unsigned-artifact warnings until signing is configured.
5. Confirm no screenshot or demo recording includes secrets, private URLs, or customer payloads.
6. Link to `docs/privacy.md`, `docs/security-model.md`, and `docs/manual-qa.md`.
