# Ultraphonics Live Hub

**Live performance hub for Ultraphonics** - syncs song charts with AbleSet in real-time for band members on tablets.

## 🎵 For Band Members

The Ultraphonics Live Hub is a desktop app that runs on the drummer's laptop during performances. It:
- Connects to AbleSet and displays song charts/lyrics in real-time
- Serves a live viewer that band members can access on their tablets
- Automatically updates what song is playing and shows progress

### Installation (For Drummer)

1. **Download the installer** from the [Releases](https://github.com/keepitultra/ultraphonics-web/releases) page:
   - Download the `.dmg` file for macOS

2. **Install the app**:
   - Open the `.dmg` and drag the app to Applications

3. **Configure AbleSet connection**:
   - Launch the app
   - Click the settings gear icon
   - Enter your laptop's IP address (e.g., `http://192.168.1.243:39051`)
   - The app will connect to AbleSet via OSC

4. **Share the Live Charts URL** with band members:
   - The dashboard shows a URL like `http://10.0.0.102:3000/live-viewer.html`
   - Band members can bookmark this on their tablets
   - Charts update automatically when you change songs in AbleSet

### Network Setup

- Make sure your laptop and band members' tablets are on the same WiFi network
- The app serves on port 3000 (HTTP) and 8080 (WebSocket)
- AbleSet should be running and accessible at its default port (39051)

---

## 🛠️ For Developers

### Web App (Firebase)

The main Ultraphonics website is hosted on Firebase with Firestore database.

```bash
# Install dependencies
npm install

# Build Firebase bundle
npm run build

# Run local dev server
npm run serve

# Deploy to production
npm run deploy
```

### Desktop App (Electron)

The Electron app bundles the web interface with a local server and AbleSet bridge.

```bash
# Install dependencies
npm install

# Run in development
npm run start:electron

# Build macOS installer
npm run build:electron:mac
```

### Project Structure

- `/admin` - Admin pages (setlist manager, song manager, client manager, live charts)
- `/assets` - Images, fonts, static files
- `/build` - Generated app icons for Electron
- `/dist` - Built JavaScript bundles
- `/server` - Express server and AbleSet OSC bridge
- `/src` - Source JavaScript (Firebase services, live viewer)
- `/scripts` - Build scripts and utilities
- `electron-main.js` - Electron main process entry point

### Firebase Services

- **Hosting** - Static site hosting
- **Firestore** - Database for songs, setlists, shows, clients, quotes
- **Storage** - Song chart PDFs
- **Auth** - Google sign-in for admin pages

### GitHub Actions

The repo includes automated builds via GitHub Actions. When you create a new tag (e.g., `v1.0.0`), it automatically:
- Builds a macOS installer (.dmg and .zip)
- Creates a GitHub Release with the installer attached

To create a release:
```bash
git tag v1.0.0
git push origin v1.0.0
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
