# KANJO CHASE - NAIROBI

A mobile-friendly endless runner game built in HTML5 Canvas and JavaScript, themed around Nairobi CBD, Tom Mboya Street, and the comic chaos of a Kenyan hawker boy trying to outrun the Nairobi County Kanjo van.

## Features
- 3-lane endless runner gameplay
- Swipe left/right, swipe up to jump, swipe down to slide
- Double-tap to throw ketchup bomb and slow the Kanjo van for 5 seconds
- Obstacles and collectibles themed for Nairobi
- Chase distance meter that decreases if the Kanjo van catches up
- Coins, shield item, boost pickup, M-Pesa-style bribe flow
- Full-screen responsive layout for Android phones
- Splash screen and HUD designed for a 1920x1080 canvas
- AdMob placeholder hooks for banner and interstitial ads

## Run locally
Open `index.html` in a browser, or serve the directory with a local web server:

```bash
python3 -m http.server 8000
```

Then visit:

```text
http://localhost:8000
```

## Android export notes
This project is structured as a web app that can be wrapped for Android with Capacitor or a WebView-based app. A basic Capacitor setup is included in `capacitor.config.json` for easy packaging.

```bash
npm install @capacitor/core @capacitor/cli
npx cap init
npx cap add android
npx cap copy android
npx cap open android
```

Then build and sign the APK in Android Studio.

## Files
- `index.html` – app shell and overlays
- `style.css` – responsive UI styling
- `game.js` – endless runner logic and rendering
- `manifest.json` – installable web app manifest
- `capacitor.config.json` – Android packaging config

## Theme inspiration
- Nairobi CBD skyline
- Tom Mboya Street energy
- Kenyan Sheng chatter
- Bright colors and humorous chase tension
- Nairobi street life with matatus, signage, and hawker culture

## Important note
This is a complete browser game demo with monetization hooks and Android-ready packaging instructions. You can then add real AdMob SDKs and signed APK generation in Android Studio or Capacitor.
