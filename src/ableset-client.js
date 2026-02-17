// AbleSet WebSocket Client (Browser)
// Connects to the ableset-bridge WebSocket server and exposes song/progress events.
// Usage: loaded via <script src="/src/ableset-client.js"> — exposes window.AbleSetClient

(function () {
    'use strict';

    const DEFAULT_WS_URL = 'ws://localhost:8080';
    const RECONNECT_BASE_MS = 1000;
    const RECONNECT_MAX_MS = 10000;
    const SONG_CHANGE_DEBOUNCE_MS = 300;

    // --- State ---
    let ws = null;
    let enabled = true;
    let connected = false;
    let reconnectDelay = RECONNECT_BASE_MS;
    let reconnectTimer = null;
    let wsUrl = DEFAULT_WS_URL;
    let lastSongName = null;
    let songChangeTimer = null;

    // --- Callbacks ---
    const callbacks = {
        songChange: [],
        progress: [],
        playback: [],
        connection: [],
    };

    function fire(type, value) {
        for (const cb of callbacks[type]) {
            try { cb(value); } catch (e) { console.error(`[AbleSet] Callback error (${type}):`, e); }
        }
    }

    // --- WebSocket ---
    function connect(url) {
        if (url) wsUrl = url;
        disconnect();

        try {
            ws = new WebSocket(wsUrl);
        } catch (e) {
            console.error('[AbleSet] WebSocket creation failed:', e);
            scheduleReconnect();
            return;
        }

        ws.onopen = function () {
            connected = true;
            reconnectDelay = RECONNECT_BASE_MS;
            console.log('[AbleSet] Connected to bridge');
            fire('connection', { connected: true, bridgeConnected: true });
        };

        ws.onclose = function () {
            const wasConnected = connected;
            connected = false;
            ws = null;
            if (wasConnected) {
                console.log('[AbleSet] Disconnected from bridge');
                fire('connection', { connected: false, bridgeConnected: false });
            }
            scheduleReconnect();
        };

        ws.onerror = function () {
            // onclose will fire after this
        };

        ws.onmessage = function (event) {
            if (!enabled) return;

            let data;
            try { data = JSON.parse(event.data); } catch { return; }

            switch (data.type) {
                case 'songName':
                    handleSongChange(data.value);
                    break;
                case 'progress':
                    fire('progress', data.value);
                    break;
                case 'playing':
                    fire('playback', data.value);
                    break;
                case 'connected':
                    fire('connection', { connected: connected, bridgeConnected: data.value });
                    break;
            }
        };
    }

    function disconnect() {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
        if (ws) {
            ws.onclose = null; // prevent reconnect
            ws.close();
            ws = null;
        }
        connected = false;
    }

    function scheduleReconnect() {
        if (reconnectTimer) return;
        reconnectTimer = setTimeout(function () {
            reconnectTimer = null;
            if (!connected) {
                console.log(`[AbleSet] Reconnecting (${reconnectDelay}ms)...`);
                connect();
            }
        }, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_MAX_MS);
    }

    // --- Song Change (debounced) ---
    function handleSongChange(songName) {
        if (songName === lastSongName) return;
        clearTimeout(songChangeTimer);
        songChangeTimer = setTimeout(function () {
            lastSongName = songName;
            fire('songChange', songName);
        }, SONG_CHANGE_DEBOUNCE_MS);
    }

    // --- Public API ---
    window.AbleSetClient = {
        connect: connect,
        disconnect: disconnect,

        get isConnected() { return connected; },

        get isEnabled() { return enabled; },
        set isEnabled(val) {
            enabled = !!val;
            if (enabled && !connected) connect();
        },

        onSongChange: function (cb) { callbacks.songChange.push(cb); },
        onProgress: function (cb) { callbacks.progress.push(cb); },
        onPlaybackChange: function (cb) { callbacks.playback.push(cb); },
        onConnectionChange: function (cb) { callbacks.connection.push(cb); },

        // Reset last known song (forces re-fire on next message)
        resetSongState: function () { lastSongName = null; },
    };
})();
