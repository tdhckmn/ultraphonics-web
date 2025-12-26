// ==UserScript==
// @name         Ultraphonics AbleSet Prop Badges
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Inject prop badges into AbleSet performance view
// @author       Ultraphonics
// @match        http://rhfds-macbook.local/performance*
// @match        http://rhfds-macbook.local:*/performance*
// @match        http://localhost:*/performance*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      raw.githubusercontent.com
// @connect      api.github.com
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // Configuration - update these if needed
    const CONFIG = {
        githubOwner: 'tdhckmn',
        githubRepo: 'ultraphonics-web',
        setlistFolder: 'content/setlists',
        // Set this to a specific setlist name or leave null to auto-detect
        setlistName: null,
        // Refresh interval in milliseconds
        refreshInterval: 1000
    };

    let currentSetlistData = null;

    // Inject CSS styles
    GM_addStyle(`
        /* Prop badges container */
        .up-props-container {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            margin-left: 8px;
            vertical-align: middle;
        }

        /* Vocal bubbles - circular colored badges with initials */
        .up-prop-bubble {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: bold;
            color: white;
            margin-left: 4px;
            text-transform: uppercase;
            flex-shrink: 0;
        }

        .up-prop-bubble.david {
            background-color: #9333ea;
        }

        .up-prop-bubble.kelsey {
            background-color: #3b82f6;
        }

        .up-prop-bubble.shelley {
            background-color: #f97316;
        }

        .up-prop-bubble.tom {
            background-color: #22c55e;
        }

        /* Property labels - for capo, drop, eflat */
        .up-prop-label {
            display: inline-flex;
            align-items: center;
            font-size: 11px;
            font-weight: bold;
            padding: 2px 6px;
            border-radius: 4px;
            margin-left: 4px;
            background: #333;
            color: #ccc;
            border: 1px solid #555;
            flex-shrink: 0;
        }

        .up-prop-label.capo {
            color: #fbbf24;
            border-color: #fbbf24;
        }

        .up-prop-label.drop {
            color: #f87171;
            border-color: #f87171;
        }

        .up-prop-label.eflat {
            color: #2dd4bf;
            border-color: #2dd4bf;
        }
    `);

    /**
     * Parse tags array and extract props
     */
    function parseTags(tags) {
        if (!tags || !Array.isArray(tags) || tags.length === 0) return null;

        const props = {};

        tags.forEach(tag => {
            const [key, value] = tag.split(':');
            const normalizedKey = key.toLowerCase();

            if (normalizedKey === 'vocals') {
                props.vocals = value;
            } else if (normalizedKey === 'eflat' && value === 'true') {
                props.eflat = true;
            } else if (normalizedKey === 'drop' && value === 'true') {
                props.drop = true;
            } else if (normalizedKey === 'capo') {
                props.capo = parseInt(value);
            }
        });

        return Object.keys(props).length > 0 ? props : null;
    }

    /**
     * Create HTML for prop badges
     */
    function createBadgesHTML(props) {
        if (!props) return '';

        let badges = [];

        // Eb tuning badge
        if (props.eflat === true) {
            badges.push('<span class="up-prop-label eflat" title="Eb Tuning">Eb</span>');
        }

        // Drop tuning badge
        if (props.drop === true) {
            badges.push('<span class="up-prop-label drop" title="Drop Tuning">D</span>');
        }

        // Capo badge
        if (props.capo && props.capo > 0) {
            badges.push(`<span class="up-prop-label capo" title="Capo ${props.capo}">C${props.capo}</span>`);
        }

        // Vocals badge (circular bubble)
        if (props.vocals) {
            const vocalist = props.vocals.toLowerCase();
            const initial = props.vocals.charAt(0).toUpperCase();
            badges.push(`<span class="up-prop-bubble ${vocalist}" title="${props.vocals}">${initial}</span>`);
        }

        if (badges.length === 0) return '';

        return `<span class="up-props-container">${badges.join('')}</span>`;
    }

    /**
     * Find song in setlist data by name
     */
    function findSongInSetlist(songName) {
        if (!currentSetlistData || !songName) return null;

        // Clean up the song name (remove extra whitespace, etc.)
        const cleanSearchName = songName.trim();

        for (const song of currentSetlistData) {
            if (!song.lastKnownName) continue;

            const cleanSongName = song.lastKnownName.trim();

            // Flexible matching
            if (cleanSongName.toLowerCase().includes(cleanSearchName.toLowerCase()) ||
                cleanSearchName.toLowerCase().includes(cleanSongName.toLowerCase())) {
                return song;
            }
        }

        return null;
    }

    /**
     * Update badges for visible songs
     */
    function updateSongBadges() {
        // Find all song title elements (adjust selectors based on AbleSet's DOM structure)
        const songElements = document.querySelectorAll('h1, h2, h3, [class*="song"], [class*="track"]');

        songElements.forEach(el => {
            // Skip if we already added badges
            if (el.querySelector('.up-props-container')) return;

            const songName = el.textContent.trim();
            if (!songName) return;

            // Find song data
            const songData = findSongInSetlist(songName);
            if (!songData) return;

            // Parse tags array
            const props = parseTags(songData.tags);
            if (!props) return;

            // Create and inject badges
            const badgesHTML = createBadgesHTML(props);
            if (badgesHTML) {
                el.insertAdjacentHTML('beforeend', badgesHTML);
                console.log('[UP] Added badges to:', songName, props);
            }
        });
    }

    /**
     * Fetch setlist data from GitHub
     */
    async function fetchSetlistData(setlistName) {
        return new Promise((resolve, reject) => {
            const url = `https://raw.githubusercontent.com/${CONFIG.githubOwner}/${CONFIG.githubRepo}/main/${CONFIG.setlistFolder}/${setlistName}`;

            console.log('[UP] Fetching setlist from:', url);

            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                onload: function(response) {
                    if (response.status === 200) {
                        try {
                            const data = JSON.parse(response.responseText);
                            console.log('[UP] Loaded setlist:', setlistName, data.length, 'songs');
                            resolve(data);
                        } catch (e) {
                            console.error('[UP] Failed to parse setlist JSON:', e);
                            reject(e);
                        }
                    } else {
                        console.error('[UP] Failed to fetch setlist:', response.status);
                        reject(new Error(`HTTP ${response.status}`));
                    }
                },
                onerror: function(error) {
                    console.error('[UP] Network error fetching setlist:', error);
                    reject(error);
                }
            });
        });
    }

    /**
     * List available setlists
     */
    async function listSetlists() {
        return new Promise((resolve, reject) => {
            const url = `https://api.github.com/repos/${CONFIG.githubOwner}/${CONFIG.githubRepo}/contents/${CONFIG.setlistFolder}`;

            console.log('[UP] Fetching setlist list from:', url);

            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                onload: function(response) {
                    if (response.status === 200) {
                        try {
                            const files = JSON.parse(response.responseText);
                            const jsonFiles = files
                                .filter(f => f.name.endsWith('.json'))
                                .map(f => f.name);
                            console.log('[UP] Available setlists:', jsonFiles);
                            resolve(jsonFiles);
                        } catch (e) {
                            console.error('[UP] Failed to parse file list:', e);
                            reject(e);
                        }
                    } else {
                        console.error('[UP] Failed to fetch file list:', response.status);
                        reject(new Error(`HTTP ${response.status}`));
                    }
                },
                onerror: function(error) {
                    console.error('[UP] Network error fetching file list:', error);
                    reject(error);
                }
            });
        });
    }

    /**
     * Initialize the userscript
     */
    async function init() {
        console.log('========================================');
        console.log('🎵 ULTRAPHONICS ABLESET BADGES 🎵');
        console.log('========================================');

        // Determine which setlist to load
        let setlistToLoad = CONFIG.setlistName;

        if (!setlistToLoad) {
            // Try to auto-detect from available setlists
            try {
                const setlists = await listSetlists();
                if (setlists.length > 0) {
                    // Use the first one, or implement smarter logic
                    setlistToLoad = setlists[0];
                    console.log('[UP] Auto-selected setlist:', setlistToLoad);
                }
            } catch (e) {
                console.error('[UP] Failed to list setlists:', e);
                return;
            }
        }

        if (!setlistToLoad) {
            console.error('[UP] No setlist specified or found');
            return;
        }

        // Load setlist data
        try {
            currentSetlistData = await fetchSetlistData(setlistToLoad);
        } catch (e) {
            console.error('[UP] Failed to load setlist:', e);
            return;
        }

        // Initial badge update
        updateSongBadges();

        // Watch for DOM changes
        const observer = new MutationObserver(() => {
            updateSongBadges();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Periodic refresh
        setInterval(updateSongBadges, CONFIG.refreshInterval);

        console.log('[UP] ✓ Initialization complete');
        console.log('========================================');

        // Expose functions for debugging
        window.ultraphonics = {
            refreshBadges: updateSongBadges,
            loadSetlist: async (name) => {
                currentSetlistData = await fetchSetlistData(name);
                updateSongBadges();
            },
            listSetlists: listSetlists,
            currentData: () => currentSetlistData
        };
    }

    // Wait for page to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
