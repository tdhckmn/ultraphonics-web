// Local Hub - Express server for serving frontend files during live performances
// This server hosts the web app locally for band members to access on tablets

const express = require('express');
const cors = require('cors');
const path = require('path');

/**
 * Start the local Express server
 * @param {number} port - Port to listen on (default: 3000)
 * @returns {Object} - Server instance with close method
 */
function startServer(port = 3000) {
    const app = express();

    // Enable CORS for all origins (local network access)
    app.use(cors());

    // Serve static files from the root directory
    const rootDir = path.join(__dirname, '..');
    app.use(express.static(rootDir));

    // SPA fallback - serve index.html for all unmatched routes
    app.get('*', (req, res) => {
        res.sendFile(path.join(rootDir, 'index.html'));
    });

    const server = app.listen(port, '0.0.0.0', () => {
        console.log(`[Hub] Local server started on http://0.0.0.0:${port}`);
        console.log(`[Hub] Network devices can access at http://<this-machine-ip>:${port}`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`[Hub] Port ${port} is already in use. Please close any other instances or choose a different port.`);
            process.exit(1);
        } else {
            console.error('[Hub] Server error:', err);
        }
    });

    return {
        close: () => {
            console.log('[Hub] Shutting down server...');
            server.close();
        }
    };
}

module.exports = { startServer };
