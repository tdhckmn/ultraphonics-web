"use strict";

document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURATION ---
    
    // Define the list of public Trello boards
    // id: The ID from the board URL (trello.com/b/[BOARD_ID]/...)
    // name: The display name you want to see on the page
    // trelloUrl: The full URL to the board for the "Launch Trello" button
    const boards = [
        { id: 'ge3DeazJ', name: '🎤 Rehearsal Board', trelloUrl: 'https://trello.com/b/ge3DeazJ/rehearsal' },
        { id: 'GWX8TAdj', name: '🎆 NYE Setlist', trelloUrl: 'https://trello.com/b/GWX8TAdj/nye-action-detroit' },
        { id: 'cIqzpNi6', name: '🔥 Hell Setlist', trelloUrl: 'https://trello.com/b/cIqzpNi6/hell' },
        { id: 'y3V9lSxZ', name: '🎸 Open Mic / Acoustic', trelloUrl: 'https://trello.com/b/y3V9lSxZ/open-mic' },
        { id: 'MLsNdpwb', name: '💍 Wedding Setlist', trelloUrl: 'https://trello.com/b/MLsNdpwb/wedding' },
        { id: 'fuOnZPRs', name: '📋 Main Song List', trelloUrl: 'https://trello.com/b/fuOnZPRs/main-song-list' }
    ];

    // We must use a CORS proxy to bypass browser security for public JSON files
    const CORS_PROXY = 'https://api.allorigins.win/raw?url=';
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
        const proxyUrl = `${CORS_PROXY}${encodeURIComponent(trelloJsonUrl)}`;

        try {
            const response = await fetch(proxyUrl);
            if (!response.ok) {
                const errorText = await response.text();
                console.error("Proxy/Trello Response Error:", errorText);
                throw new Error(`Failed to fetch board. Status: ${response.status}. Is the board public?`);
            }
            return await response.json();
        } catch (error) {
            console.error('Fetch Error:', error);
            showStatus(`Error: ${error.message}. Check console.`, true);
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
            showStatus(`No valid lists found on board "${boardName}". (Note: "Ableton Live Library" is ignored)`, true);
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
                    
                    // Check if it's the expected JSON structure (has id, time, lastKnownName)
                    if (parsedDesc && typeof parsedDesc.lastKnownName === 'string' && typeof parsedDesc.time === 'number') {
                        item = parsedDesc; // Use the object from the description
                    } else {
                        // It's valid JSON, but not the format we want. Treat as a normal card.
                        console.warn(`Card "${card.name}" had JSON description, but not in expected format. Using card name.`);
                        item = {
                            id: null,
                            time: 0,
                            lastKnownName: card.name,
                            skipped: false
                        };
                    }
                } catch (e) {
                    // Not valid JSON (empty string, lyrics, notes), so create a default item
                    item = {
                        id: null, // No ableset ID
                        time: 0,  // No ableset time
                        lastKnownName: card.name,
                        skipped: false
                    };
                    // Log that we're using fallback
                    if (card.desc) {
                         console.log(`Card "${card.name}" has non-JSON description, using card name as fallback.`);
                    }
                }
                
                // Add the processed item to the list
                combinedSetlist.push(item);
            }
        }

        if (combinedSetlist.length === 0) {
            showStatus(`No cards found on board "${boardName}".`, true);
            return;
        }

        // 4. Create the final .ableset file content (as a raw array)
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
        setTimeout(() => {
            statusMessage.textContent = '';
            statusMessage.className = '';
        }, 5000);
    }

    function setButtonLoading(button, isLoading) {
        button.disabled = isLoading;
        button.classList.toggle('btn-disabled', isLoading);
        button.textContent = isLoading ? 'Downloading...' : 'Download .ableset';
    }

    // --- Global Download Function ---
    // Make it global so inline onclick can find it
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
                showStatus(`✅ Success! Download for "${boardName}" has started.`);
            }
            // If boardData is null, fetchTrelloData already showed an error
        } catch (error) {
            console.error("Download process failed unexpectedly:", error);
            showStatus(`Error: ${error.message}`, true);
        } finally {
            setButtonLoading(downloadButton, false);
        }
    };

    // --- Initialization ---
    function initializeBoardList() {
        if (!boardsContainer) return;

        if (boards.length === 0) {
            boardsContainer.innerHTML = '<p class="text-center text-gray-500">No boards configured in src/ableset.js.</p>';
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