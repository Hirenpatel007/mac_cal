# MacCal

MacCal is a small, native-feeling macOS calculator built with **React Native for macOS**. It uses the standard macOS title bar and a compact dark interface designed for a MacBook window.

## Features

- Basic arithmetic, chained operations, repeat-equals, sign changes, and percentages
- Scientific mode with trigonometry, logarithms, square/root, reciprocal, powers, and π
- Degree/radian toggle
- Memory controls (MC, MR, M−, M+)
- Recent calculations you can select to reuse a result
- Keyboard input: `0–9`, `+ − * /`, `%`, `.`, `Enter`, `Backspace`, and `Escape`
- macOS app icon and a universal Apple Silicon/Intel release build

## Run on a Mac

**Requirements:** macOS 14 or later, Xcode with Command Line Tools, Node.js 20.19.4 or later, Ruby, and CocoaPods.

```sh
npm ci
bundle install
bundle exec pod install --project-directory=macos
npm start                  # leave Metro running
npm run macos -- --no-packager
```

For a release-mode local build, run `npm run build:macos`. The Xcode product is `MacCal.app`.

## Build and release the downloadable app

The GitHub Actions workflow **Build macOS release** builds a universal app (arm64 + x86_64) and packages:

- `MacCal-macos-universal.dmg` — open it, then drag `MacCal.app` to **Applications**
- `MacCal-macos-universal.zip` — the app bundle in a ZIP
- `SHA256SUMS` — checksums for both downloads

Run the workflow from the repository's **Actions** tab to create downloadable artifacts. Pushing a version tag such as `v1.0.0` also publishes those files as a GitHub Release.

The build is unsigned because signing and notarization require the publisher's Apple Developer ID credentials. On first launch, macOS may ask you to control-click `MacCal.app` and choose **Open**. A signed/notarized installer is needed to remove that warning.

## Checks

```sh
npm test
npm run typecheck
npm run lint
```
