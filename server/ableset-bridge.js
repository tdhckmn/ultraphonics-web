#!/usr/bin/env node
// AbleSet OSC → WebSocket Bridge
// Receives OSC from AbleSet over UDP and relays to browser clients via WebSocket.
// Usage: node server/ableset-bridge.js [--ableset-host 127.0.0.1] [--ableset-port 39051] [--udp-port 39052] [--ws-port 8080]

const dgram = require('dgram');
const { WebSocketServer } = require('ws');
const osc = require('osc');

/**
 * Start the AbleSet OSC to WebSocket bridge
 * @param {Object} options - Configuration options
 * @param {string} options.ablesetHost - AbleSet host (default: '127.0.0.1')
 * @param {number} options.ablesetPort - AbleSet OSC port (default: 39051)
 * @param {number} options.udpPort - UDP listen port (default: 39052)
 * @param {number} options.wsPort - WebSocket server port (default: 8080)
 * @returns {Object} - Bridge instance with shutdown method
 */
function startBridge(options = {}) {
    // --- Config ---
    const ABLESET_HOST = options.ablesetHost || '127.0.0.1';
    const ABLESET_PORT = options.ablesetPort || 39051;
    const UDP_PORT = options.udpPort || 39052;
    const WS_PORT = options.wsPort || 8080;
    const HEARTBEAT_TIMEOUT_MS = 6000;

    // --- State ---
    let ablesetConnected = false;
    let lastHeartbeat = 0;
    const wsClients = new Set();

    // --- UDP Socket (receive from AbleSet) ---
    const udpSocket = dgram.createSocket('udp4');

    udpSocket.on('message', (buf) => {
        try {
            const msg = osc.readPacket(buf, { metadata: true });
            handleOscMessage(msg);
        } catch (err) {
            console.error('[UDP] Parse error:', err.message);
        }
    });

    udpSocket.on('listening', () => {
        console.log(`[UDP] Listening on port ${UDP_PORT}`);
        subscribe();
    });

    udpSocket.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`[UDP] Port ${UDP_PORT} is already in use. Please close any other instances or choose a different port.`);
            process.exit(1);
        } else {
            console.error('[UDP] Socket error:', err);
        }
    });

    udpSocket.bind(UDP_PORT);

    // --- WebSocket Server ---
    const wss = new WebSocketServer({ port: WS_PORT });

    wss.on('listening', () => {
        console.log(`[WS] Server listening on port ${WS_PORT}`);
    });

    wss.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`[WS] Port ${WS_PORT} is already in use. Please close any other instances or choose a different port.`);
            process.exit(1);
        } else {
            console.error('[WS] Server error:', err);
        }
    });

    wss.on('connection', (ws) => {
        wsClients.add(ws);
        console.log(`[WS] Client connected (${wsClients.size} total)`);

        // Send current connection state
        ws.send(JSON.stringify({ type: 'connected', value: ablesetConnected }));

        // Request current values from AbleSet
        sendOsc('/getValues', [{ type: 'i', value: UDP_PORT }]);

        ws.on('close', () => {
            wsClients.delete(ws);
            console.log(`[WS] Client disconnected (${wsClients.size} total)`);
        });
    });

    // --- OSC Helpers ---
    function sendOsc(address, oscArgs) {
        const packet = osc.writePacket({
            address,
            args: oscArgs || []
        });
        udpSocket.send(packet, 0, packet.length, ABLESET_PORT, ABLESET_HOST);
    }

    function subscribe() {
        console.log(`[OSC] Subscribing to AbleSet at ${ABLESET_HOST}:${ABLESET_PORT}`);
        sendOsc('/subscribe', [
            { type: 's', value: 'auto' },
            { type: 'i', value: UDP_PORT },
            { type: 's', value: 'UltraphonicsWeb' },
            { type: 's', value: 'fine' },
            { type: 's', value: '/setlist/activeSongName' },
            { type: 's', value: '/setlist/activeSongProgress' },
            { type: 's', value: '/global/isPlaying' },
        ]);
    }

    // --- OSC Message Handling ---
    function handleOscMessage(msg) {
        if (msg.packets) {
            // OSC bundle — recurse
            msg.packets.forEach(handleOscMessage);
            return;
        }

        const { address, args } = msg;
        const values = (args || []).map(a => a.value !== undefined ? a.value : a);

        switch (address) {
            case '/heartbeat':
                lastHeartbeat = Date.now();
                if (!ablesetConnected) {
                    ablesetConnected = true;
                    broadcast({ type: 'connected', value: true });
                    console.log('[OSC] AbleSet connected');
                }
                break;

            case '/setlist/activeSongName':
                broadcast({ type: 'songName', value: values[0] || '' });
                console.log(`[OSC] Song: ${values[0]}`);
                break;

            case '/setlist/activeSongProgress':
                broadcast({ type: 'progress', value: values[0] || 0 });
                break;

            case '/global/isPlaying':
                broadcast({ type: 'playing', value: values[0] === 1 || values[0] === true });
                console.log(`[OSC] Playing: ${values[0]}`);
                break;

            default:
                // Log unhandled for debugging
                if (!address.startsWith('/heartbeat')) {
                    console.log(`[OSC] ${address}`, values);
                }
        }
    }

    function broadcast(data) {
        const json = JSON.stringify(data);
        for (const ws of wsClients) {
            if (ws.readyState === 1) ws.send(json);
        }
    }

    // --- Heartbeat Monitor ---
    const heartbeatInterval = setInterval(() => {
        if (ablesetConnected && Date.now() - lastHeartbeat > HEARTBEAT_TIMEOUT_MS) {
            ablesetConnected = false;
            broadcast({ type: 'connected', value: false });
            console.log('[OSC] AbleSet disconnected (heartbeat timeout), resubscribing...');
            subscribe();
        }
    }, 3000);

    // --- Graceful Shutdown ---
    function shutdown() {
        console.log('\n[Bridge] Shutting down...');
        clearInterval(heartbeatInterval);
        sendOsc('/unsubscribe');
        setTimeout(() => {
            udpSocket.close();
            wss.close();
        }, 200);
    }

    console.log(`[Bridge] AbleSet OSC Bridge started`);
    console.log(`[Bridge] AbleSet target: ${ABLESET_HOST}:${ABLESET_PORT}`);
    console.log(`[Bridge] UDP listen: ${UDP_PORT}, WebSocket: ${WS_PORT}`);

    return { shutdown };
}

// --- CLI Mode: Run directly if invoked from command line ---
if (require.main === module) {
    const args = process.argv.slice(2);
    function getArg(name, fallback) {
        const i = args.indexOf(`--${name}`);
        return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
    }

    const bridge = startBridge({
        ablesetHost: getArg('ableset-host', '127.0.0.1'),
        ablesetPort: parseInt(getArg('ableset-port', '39051')),
        udpPort: parseInt(getArg('udp-port', '39052')),
        wsPort: parseInt(getArg('ws-port', '8080'))
    });

    process.on('SIGINT', () => {
        bridge.shutdown();
        process.exit(0);
    });
    process.on('SIGTERM', () => {
        bridge.shutdown();
        process.exit(0);
    });
}

module.exports = { startBridge };
