"use strict";

document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURATION ---
    
    // Define the list of public Trello boards
    const boards = [
        { id: 'ge3DeazJ', name: '🎤 Rehearsal Board', trelloUrl: 'https://trello.com/b/ge3DeazJ/rehearsal' },
        { id: 'GWX8TAdj', name: '🎆 NYE Setlist', trelloUrl: 'https://trello.com/b/GWX8TAdj/nye-action-detroit' },
        { id: 'cIqzpNi6', name: '🔥 Hell Setlist', trelloUrl: 'https://trello.com/b/cIqzpNi6/hell' },
        { id: 'y3V9lSxZ', name: '🎸 Open Mic / Acoustic', trelloUrl: 'https://trello.com/b/y3V9lSxZ/open-mic' },
        { id: 'MLsNdpwb', name: '💍 Wedding Setlist', trelloUrl: 'https://trello.com/b/MLsNdpwb/wedding' },
        { id: 'fuOnZPRs', name: '📋 Main Song List', trelloUrl: 'https://trello.com/b/fuOnZPRs/main-song-list' }
    ];

    // UPDATED: Switched to corsproxy.io for better stability
    const CORS_PROXY = 'https://corsproxy.io/?';
    const TRELLO_BASE_URL = 'https://trello.com/b/';

    // --- DOM Elements ---
    const boardsContainer = document.getElementById('boards-container');
    const statusMessage = document.getElementById('status-message');

    // --- Core Functions ---

    /**
     * Fetches the Trello board's public JSON data via a CORS proxy.
     */
    async function fetchTrelloData(boardId) {
        const trelloJsonUrl = `${TRELLO_BASE_URL}${boardId}.json`;
        // corsproxy.io works best with the encoded URL
        const proxyUrl = `${CORS_PROXY}${encodeURIComponent(trelloJsonUrl)}`;

        try {
            const response = await fetch(proxyUrl);
            
            // Handle HTTP errors
            if (!response.ok) {
                throw new Error(`Proxy returned status: ${response.status} ${response.statusText}`);
            }

            // Attempt to parse JSON
            try {
                return await response.json();
            } catch (jsonError) {
                // If JSON parsing fails, the proxy might have returned an HTML error page
                const text = await response.text();
                console.error("Non-JSON response received:", text.substring(0, 100) + "...");
                throw new Error("Received invalid data (not JSON). The board might not be public.");
            }

        } catch (error) {
            console.error('Fetch Error:', error);
            showStatus(`Error loading board: ${error.message}`, true);
            return null;
        }
    }

    /**
     * Generates and triggers the download of the .ableset file.
     */
    function generateAndDownloadFile(boardData, boardName) {
        if (!boardData) {
            showStatus("Error: No data to generate file.", true);
            return;
        }

        const setlistName = boardName;
        let combinedSetlist = [];

        // 1. Filter out unwanted lists and sort them by position
        const filteredLists = boardData.lists
            .filter(list => !list.closed && !list.name.toLowerCase().includes("ableton live library"))
            .sort((a, b) => a.pos - b.pos);

        if (filteredLists.length === 0) {
            showStatus(`No valid lists found on board "${boardName}".`, true);
            return;
        }

        // 2. Create a map of cards by list for efficient lookup
        const cardsByList = {};
        for (const card of boardData.cards) {
            if (card.closed) continue;
            if (!cardsByList[card.idList]) {
                cardsByList[card.idList] = [];
            }
            cardsByList[card.idList].push(card);
        }

        // 3. Process each list in order
        for (const list of filteredLists) {
            const cards = (cardsByList[list.id] || []).sort((a, b) => a.pos - b.pos);
            
            for (const card of cards) {
                let item;
                try {
                    // Try to parse the description as JSON
                    const parsedDesc = JSON.parse(card.desc);
                    
                    if (parsedDesc && typeof parsedDesc.lastKnownName === 'string' && typeof parsedDesc.time === 'number') {
                        item = parsedDesc;
                    } else {
                        // Valid JSON but not our format
                        item = {
                            id: null,
                            time: 0,
                            lastKnownName: card.name,
                            skipped: false
                        };
                    }
                } catch (e) {
                    // Not valid JSON (normal text description)
                    item = {
                        id: null,
                        time: 0,
                        lastKnownName: card.name,
                        skipped: false
                    };
                }
                
                combinedSetlist.push(item);
            }
        }

        if (combinedSetlist.length === 0) {
            showStatus(`No cards found on board "${boardName}".`, true);
            return;
        }

        // 4. Create the final .ableset file content
        const dataStr = JSON.stringify(combinedSetlist, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const downloadAnchor = document.createElement('a');
        const safeFilename = setlistName.toLowerCase().replace(/[^a-z0-9]/gi, '_');
        downloadAnchor.href = URL.createObjectURL(dataBlob);
        downloadAnchor.download = `${safeFilename}.ableset`;

        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        document.body.removeChild(downloadAnchor);
        URL.revokeObjectURL(downloadAnchor.href);
    }

    // --- Helper Functions ---

    function showStatus(message, isError = false) {
        if (!statusMessage) return;
        statusMessage.textContent = message;
        statusMessage.className = isError ? 'status-error' : 'status-success';
        
        // Clear message after 5 seconds
        if (!isError) {
            setTimeout(() => {
                statusMessage.textContent = '';
                statusMessage.className = '';
            }, 5000);
        }
    }

    function setButtonLoading(button, isLoading) {
        button.disabled = isLoading;
        button.classList.toggle('btn-disabled', isLoading);
        button.textContent = isLoading ? 'Downloading...' : 'Download .ableset';
    }

    // --- Global Download Function ---
    window.downloadBoardAsAbleset = async (boardId, boardName, buttonId) => {
        const downloadButton = document.getElementById(buttonId);
        if (!downloadButton || downloadButton.disabled) return;

        setButtonLoading(downloadButton, true);
        showStatus(`Loading ${boardName}...`);

        try {
            const boardData = await fetchTrelloData(boardId);
            
            if (boardData) {
                showStatus('Data loaded. Generating file...');
                generateAndDownloadFile(boardData, boardName);
                showStatus(`✅ Success! Download for "${boardName}" started.`);
            }
        } catch (error) {
            console.error("Download process failed:", error);
            showStatus(`Error: ${error.message}`, true);
        } finally {
            setButtonLoading(downloadButton, false);
        }
    };

    // --- Initialization ---
    function initializeBoardList() {
        if (!boardsContainer) return;

        if (boards.length === 0) {
            boardsContainer.innerHTML = '<p class="text-center text-gray-500">No boards configured.</p>';
            return;
        }

        boards.forEach(board => {
            const buttonId = `download-btn-${board.id}`;
            const boardEl = document.createElement('div');
            boardEl.className = 'board-item';
            boardEl.innerHTML = `
                <span class="board-name">${board.name}</span>
                <div class="button-group">
                    <button id="${buttonId}" onclick="downloadBoardAsAbleset('${board.id}', '${board.name}', '${buttonId}')" class="btn btn-secondary">
                        Download .ableset
                    </button>
                    <a href="${board.trelloUrl}" target="_blank" class="btn btn-primary">
                        Launch Trello
                    </a>
                </div>
            `;
            boardsContainer.appendChild(boardEl);
        });
    }

    initializeBoardList();
});