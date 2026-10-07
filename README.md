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

The GitHub Actions workflow **Build macOS release** builds a universal `.app` (arm64 + x86_64), packages it as `MacCal-macos-universal.zip`, and uploads it as a workflow artifact. Run it from the repository's **Actions** tab to create an artifact. Pushing a version tag such as `v1.0.0` also creates a GitHub Release and attaches the ZIP and its SHA-256 checksum.

The release build is unsigned because Developer ID signing and notarization require the publisher's Apple credentials. For a locally built or unsigned download, macOS may require you to control-click the app and choose **Open** the first time.

## Checks

```sh
npm test
npm run typecheck
npm run lint
```
