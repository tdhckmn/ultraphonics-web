# Ultraphonics Live Hub

Desktop app for the main laptop. Connects to AbleSet and serves live song charts to band members on tablets over WiFi.

## Installing

1. Download the `.dmg` from [Releases](https://github.com/keepitultra/ultraphonics-web/releases)
2. Open the `.dmg` and drag the app to Applications
3. Run this in Terminal to bypass macOS security:
   ```bash
   xattr -cr "/Applications/Ultraphonics Live Hub.app"
   ```
4. Open the app, click the settings gear, and enter your AbleSet URL (e.g. `http://192.168.1.243:39051`)
5. Share the Live Charts URL shown on the dashboard with band members — they can bookmark it on their tablets

> Make sure the laptop and tablets are on the same WiFi network. The app uses ports 3000 (HTTP) and 8080 (WebSocket).

---

## Development

```bash
npm install
npm run build           # Build Firebase bundle
npm run start:electron  # Run Electron app locally
npm run build:electron:mac  # Build macOS installer
npm run deploy          # Deploy web app to Firebase
```

### Releasing

Push a version tag to trigger a GitHub Actions build and create a release:

```bash
git tag v0.1.0
git push origin v0.1.0
```

### Development Scripts

```bash
npm run build          # Build Firebase bundle
npm run build:dev      # Build with sourcemaps
npm run build:icons    # Generate app icons
npm run kill-ports     # Kill processes on ports 3000/8080/39052
npm run migrate        # Run Firestore migrations
npm run deploy:rules   # Deploy Firestore rules only
```

---

## 📝 License

MIT
