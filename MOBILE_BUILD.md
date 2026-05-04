# 9jaTalk — Mobile Build Guide

> Designed by Thompson Obosa

## Overview

9jaTalk uses [Capacitor](https://capacitorjs.com/) to wrap the React web app into native Android and iOS apps.

---

## Prerequisites

| Platform | Required Tools |
|----------|---------------|
| Android  | [Android Studio](https://developer.android.com/studio) + JDK 17+ |
| iOS      | [Xcode 15+](https://developer.apple.com/xcode/) (macOS only) |
| Both     | Node.js 18+, npm |

---

## Step 1 — Build the Web App

```bash
npm run build
```

This creates the `dist/` folder that Capacitor packages into the native app.

---

## Step 2 — Add Native Platforms (first time only)

```bash
# Android
npm run cap:add:android

# iOS (macOS only)
npm run cap:add:ios
```

---

## Step 3 — Sync Web Assets to Native Projects

After every web build, sync the assets:

```bash
npm run cap:sync
```

---

## Step 4 — Open in Native IDE

```bash
# Open in Android Studio
npm run cap:open:android

# Open in Xcode (macOS only)
npm run cap:open:ios
```

Then build and run from the IDE onto your device or emulator.

---

## One-Command Build

```bash
# Build web + sync to Android
npm run build:android

# Build web + sync to iOS
npm run build:ios
```

---

## Production vs Development

The `capacitor.config.ts` currently points to `http://localhost:3000` for development.

**For production builds**, comment out the `server.url` line in `capacitor.config.ts`:

```ts
// server: {
//   url: 'http://localhost:3000',
//   cleartext: true,
// },
```

This makes the app load from the bundled `dist/` files instead of a live server.

---

## App Details

- **App ID:** `com.njatalk.app`
- **App Name:** 9jaTalk
- **Theme Color:** `#008751` (Nigerian Green)
- **Min Android SDK:** 22 (Android 5.1+)
- **Min iOS:** 13.0+

---

*Designed by Thompson Obosa*
