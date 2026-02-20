// Electron Main Process
// Desktop wrapper for Ultraphonics live performance hub

const { app, BrowserWindow, nativeImage } = require('electron');
const path = require('path');
const { startBridge } = require('./server/ableset-bridge');
const { startServer } = require('./server/local-hub');

let mainWindow = null;
let bridge = null;
let server = null;

async function createWindow() {
    try {
        // Start the local Express server
        server = startServer(3000);

        // Start the AbleSet OSC bridge
        bridge = startBridge({
            ablesetHost: '127.0.0.1',
            ablesetPort: 39051,
            udpPort: 39052,
            wsPort: 8080
        });
    } catch (err) {
        console.error('[Electron] Failed to start services:', err);
        app.quit();
        return;
    }

    // Create app icon from the built icon file
    const iconPath = process.platform === 'darwin'
        ? path.join(__dirname, 'build/icons/icon.icns')
        : path.join(__dirname, 'build/icons/icon.png');
    const appIcon = nativeImage.createFromPath(iconPath);

    // Create the browser window
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        icon: appIcon,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true
        },
        title: 'Ultraphonics Live Hub',
        backgroundColor: '#0c0a09'
    });

    // Load the admin dashboard
    mainWindow.loadURL('http://localhost:3000/admin/index.html');

    // Open DevTools in development
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    // On macOS, keep app running until explicitly quit
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // On macOS, recreate window when dock icon is clicked
    if (mainWindow === null) {
        createWindow();
    }
});

app.on('before-quit', () => {
    // Clean shutdown
    if (bridge) {
        bridge.shutdown();
    }
    if (server) {
        server.close();
    }
});
