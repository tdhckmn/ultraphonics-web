// Live Viewer - Stage display for band members
// Connects to AbleSet bridge via WebSocket and displays song charts/lyrics in real-time

(function () {
    'use strict';

    // --- Configuration ---
    const wsUrl = 'ws://' + window.location.hostname + ':8080';
    const RECONNECT_DELAY = 2000;

    // --- DOM Elements ---
    const songTitleEl = document.getElementById('song-title');
    const songTitleBarEl = document.getElementById('song-title-bar');
    const progressBarEl = document.getElementById('progress-bar');
    const progressFillEl = document.getElementById('progress-fill');
    const loadingStateEl = document.getElementById('loading-state');
    const songContentEl = document.getElementById('song-content');

    // --- State ---
    let ws = null;
    let currentSongName = null;
    let songCache = new Map(); // Cache fetched song data
    let reconnectTimer = null;
    let isConnected = false;

    // --- WebSocket Connection ---
    function connect() {
        if (ws) return;

        console.log('[Live Viewer] Connecting to bridge:', wsUrl);

        try {
            ws = new WebSocket(wsUrl);
        } catch (err) {
            console.error('[Live Viewer] WebSocket creation failed:', err);
            scheduleReconnect();
            return;
        }

        ws.onopen = function () {
            isConnected = true;
            console.log('[Live Viewer] Connected to bridge');
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        };

        ws.onclose = function () {
            const wasConnected = isConnected;
            isConnected = false;
            ws = null;
            if (wasConnected) {
                console.log('[Live Viewer] Disconnected from bridge');
            }
            scheduleReconnect();
        };

        ws.onerror = function () {
            console.error('[Live Viewer] WebSocket error');
        };

        ws.onmessage = function (event) {
            try {
                const data = JSON.parse(event.data);
                handleMessage(data);
            } catch (err) {
                console.error('[Live Viewer] Message parse error:', err);
            }
        };
    }

    function scheduleReconnect() {
        if (reconnectTimer) return;
        reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            console.log('[Live Viewer] Reconnecting...');
            connect();
        }, RECONNECT_DELAY);
    }

    // --- Message Handling ---
    function handleMessage(data) {
        switch (data.type) {
            case 'songName':
                handleSongChange(data.value);
                break;

            case 'progress':
                updateProgress(data.value);
                break;

            case 'playing':
                // Could use this to show/hide progress bar
                if (data.value) {
                    progressBarEl.classList.remove('hidden');
                } else {
                    progressBarEl.classList.add('hidden');
                }
                break;
        }
    }

    // --- Song Change Handler ---
    async function handleSongChange(songName) {
        if (!songName || songName === currentSongName) return;

        currentSongName = songName;
        console.log('[Live Viewer] Song changed:', songName);

        songTitleEl.textContent = songName;
        if (songTitleBarEl) songTitleBarEl.classList.remove('hidden');

        // Check cache first
        if (songCache.has(songName)) {
            console.log('[Live Viewer] Using cached song data');
            displaySong(songCache.get(songName));
            return;
        }

        // Fetch from Firestore
        await fetchAndDisplaySong(songName);
    }

    // --- Firestore Query ---
    async function fetchAndDisplaySong(songName) {
        try {
            // Use the global FirestoreService if available
            if (typeof window.FirestoreService === 'undefined') {
                console.error('[Live Viewer] FirestoreService not loaded');
                showError('Firebase not initialized');
                return;
            }

            loadingStateEl.innerHTML = `
                <i class="fas fa-spinner fa-spin text-6xl text-accent-green mb-4"></i>
                <p class="text-xl text-stone-400">Loading "${songName}"...</p>
            `;
            loadingStateEl.classList.remove('hidden');
            songContentEl.classList.add('hidden');

            // Query songs collection for matching name
            const songs = await window.FirestoreService.getSongs();

            // Try to find exact match first, then case-insensitive
            let song = songs.find(s => s.name === songName || s.title === songName);

            if (!song) {
                const lowerSongName = songName.toLowerCase();
                song = songs.find(s =>
                    (s.name && s.name.toLowerCase() === lowerSongName) ||
                    (s.title && s.title.toLowerCase() === lowerSongName) ||
                    (s.ablesetName && s.ablesetName.toLowerCase() === lowerSongName)
                );
            }

            if (!song) {
                console.warn('[Live Viewer] Song not found in database:', songName);
                showError(`Song "${songName}" not found in database`);
                return;
            }

            console.log('[Live Viewer] Song found:', song.id);

            // Cache the song data
            songCache.set(songName, song);

            // Display the song
            displaySong(song);

        } catch (err) {
            console.error('[Live Viewer] Error fetching song:', err);
            showError('Error loading song: ' + err.message);
        }
    }

    // --- Display Song ---
    function displaySong(song) {
        loadingStateEl.classList.add('hidden');
        songContentEl.classList.remove('hidden');

        // Build the HTML for the song
        let html = '';

        // Display key if available
        if (song.key) {
            html += `<div class="mb-4 text-stone-400 text-sm">Key: <span class="text-accent-green font-bold">${escapeHtml(song.key)}</span></div>`;
        }

        // Display lyrics/chart
        if (song.lyrics) {
            html += renderLyrics(song.lyrics);
        } else if (song.chart) {
            html += renderLyrics(song.chart);
        } else {
            html += '<p class="text-stone-500 text-center py-8">No lyrics or chart available for this song.</p>';
        }

        // Display chart PDF link if available
        if (song.chartUrl) {
            html += `
                <div class="mt-8 pt-8 border-t border-stone-800">
                    <a href="${escapeHtml(song.chartUrl)}" target="_blank" rel="noopener noreferrer"
                       class="inline-flex items-center gap-2 px-4 py-2 bg-accent-green text-white rounded-lg hover:bg-green-600 transition-colors">
                        <i class="fas fa-file-pdf"></i>
                        <span>View Full Chart PDF</span>
                    </a>
                </div>
            `;
        }

        songContentEl.innerHTML = html;
    }

    // --- Lyric Rendering (basic version) ---
    function renderLyrics(text) {
        if (!text) return '';

        const lines = text.split('\n');
        let html = '';
        let currentSection = null;

        for (let line of lines) {
            // Check if this is a section header
            const sectionMatch = line.match(/^\[([^\]]+)\]$/);
            if (sectionMatch) {
                const sectionName = sectionMatch[1].trim();
                html += `<div class="section-anchor">${escapeHtml(sectionName)}</div>`;
                currentSection = sectionName;
                continue;
            }

            // Process chords and lyrics
            const processedLine = processLine(line);
            html += `<div class="lyric-line">${processedLine}</div>`;
        }

        return html;
    }

    // --- Process a single line (handle chords) ---
    function processLine(line) {
        // Replace [Chord] with styled chord spans
        let processed = line.replace(/\[([A-G][#b]?(?:m|maj|min|sus|aug|dim|add|[0-9])*)\]/g,
            '<span class="chord">[$1]</span>');

        // Replace **harmony** markers
        processed = processed.replace(/\*\*([^*]+)\*\*/g,
            '<span class="harmony-section">$1</span>');

        // Replace [[Note]] footnote markers
        processed = processed.replace(/\[\[([^\]]+)\]\]/g,
            '<span class="footnote-marker" title="$1">[*]</span>');

        return processed || '&nbsp;'; // Empty lines get a space
    }

    // --- Progress Update ---
    function updateProgress(progress) {
        // progress is 0-1
        const percentage = Math.min(100, Math.max(0, progress * 100));
        progressFillEl.style.width = percentage + '%';

        if (percentage > 0) {
            progressBarEl.classList.remove('hidden');
        }
    }

    // --- Error Display ---
    function showError(message) {
        loadingStateEl.innerHTML = `
            <i class="fas fa-exclamation-triangle text-6xl text-red-500 mb-4"></i>
            <p class="text-xl text-red-400">${escapeHtml(message)}</p>
        `;
        loadingStateEl.classList.remove('hidden');
        songContentEl.classList.add('hidden');
    }

    // --- Utilities ---
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // --- Initialize ---
    console.log('[Live Viewer] Initializing...');
    connect();

})();
