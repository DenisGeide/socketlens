# SocketLens vX.Y.Z

## Summary

Briefly describe what changed and who should upgrade.

## Current Status

State the release maturity honestly:

- Alpha / beta / stable:
- Source-first or downloadable-artifact ready:
- Native desktop/proxy validation status:
- Any unsigned-artifact warning:

## Downloads

Unsigned release artifacts are attached to the GitHub Release after the release workflow completes:

- Windows: `.msi` or `.exe` installer from the Windows artifact
- macOS: `.dmg` or `.app` bundle from the macOS artifact
- Linux: `.AppImage`, `.deb`, or `.rpm` bundle from the Linux artifact

Until code signing is configured, operating systems may warn that the app is from an unidentified developer.

## Release Assets

- Banner: `docs/assets/branding/banner.png`
- Icon: `docs/assets/branding/icon.png`
- Screenshot guide: `docs/assets/screenshots/README.md`
- Demo recording guide: `docs/assets/demo/README.md`
- Asset naming convention: `socketlens-v<version>-<sequence>-<area>-<state>-<theme>-<viewport>-<locale>.<ext>`

## Highlights

- 

## Fixes

- 

## Known Limitations

- 

## Planned Improvements

- 

## How To Help

- Report reproducible setup, Direct Mode, Proxy Mode, replay, session, or documentation issues.
- Include screenshots/recordings for UI behavior and diagnostics/log details with secrets removed.

## Verification

- `npm ci`
- `npm run release:prepare`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml`
- Platform Tauri builds completed in GitHub Actions.

## Contributors

Thank you to everyone who contributed to this release.
