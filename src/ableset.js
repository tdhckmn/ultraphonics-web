"use strict";

document.addEventListener('DOMContentLoaded', () => {

    // --- Configuration ---
    // We must use a CORS proxy to bypass browser security
    const CORS_PROXY = 'https://api.allorigins.win/raw?url=';
    const TRELLO_BASE_URL = 'https://trello.com/b/';

    // --- DOM Elements ---
    const loadingMessage = document.getElementById('loading-message');
    const downloadBtn = document.getElementById('download-ableset-btn');
    const boardSelect = document.getElementById('board-select');

    // --- Core Functions ---

    /**
     * Fetches the Trello board data from the public JSON URL via a CORS proxy.
     */
    async function fetchTrelloData(boardId) {
        const trelloJsonUrl = `${TRELLO_BASE_URL}${boardId}.json`;
        const proxyUrl = `${CORS_PROXY}${encodeURIComponent(trelloJsonUrl)}`;

        try {
            const response = await fetch(proxyUrl);
            if (!response.ok) {
                // Try to get text from the failed response for more context
                const errorText = await response.text();
                console.error("Proxy/Trello Response Error:", errorText);
                throw new Error(`Failed to fetch from proxy. Status: ${response.status}.`);
            }
            return await response.json();
        } catch (error) {
            console.error('Fetch Error:', error);
            // More robust error message
            const errorMessage = error.message ? error.message : 'An unknown fetch error occurred.';
            loadingMessage.textContent = `Error: ${errorMessage}. Please check console and network tab.`;
            loadingMessage.style.color = 'red';
            return null; // Return null instead of re-throwing to prevent unhandled rejection
        }
    }

    /**
     * Generates and triggers the download of the .ableset file.
     */
    function generateAndDownloadFile(boardData) {
        if (!boardData) {
            alert("No setlist data provided to generator.");
            return;
        }

        const setlistName = boardData.name;
        const metaMap = [];
        let orderIndex = 0;

        // Get all lists (columns) in order
        const setLists = boardData.lists
            .filter(list => !list.closed)
            .sort((a, b) => a.pos - b.pos);
        
        // Create a single, flat list of all song names in the correct order
        for (const list of setLists) {
            const cards = boardData.cards
                .filter(card => card.idList === list.id && !card.closed && !isNoteCard(card.name))
                .sort((a, b) => a.pos - b.pos);
            
            for (const card of cards) {
                // This is the format AbleSet's import expects.
                metaMap.push({
                    "name": card.name.trim(),
                    "order": orderIndex,
                    "skipped": false,
                    "stop": false // 'stop: false' means it will play through to the next song
                });
                orderIndex++;
            }
        }

        // Create the final file content
        const fileContent = {
            "metaMap": metaMap,
            "setlistName": setlistName
        };

        const dataStr = JSON.stringify(fileContent, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        // Create a temporary link to trigger the download
        const downloadAnchor = document.createElement('a');
        downloadAnchor.href = URL.createObjectURL(dataBlob);
        
        // Create a clean filename
        const safeFilename = setlistName.toLowerCase().replace(/[^a-z0-9]/g, '-');
        downloadAnchor.download = `${safeFilename}.ableset`; // Use .ableset extension

        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        document.body.removeChild(downloadAnchor);
        URL.revokeObjectURL(downloadAnchor.href);
    }

    // --- Helper Functions ---

    /**
     * Checks if a Trello card is a "note" card to be skipped.
     * We'll filter out cards starting with ---, BREAK, or an emoji.
     */
    function isNoteCard(cardName) {
        const lowerName = cardName.trim().toLowerCase();
        const emojiRegex = /^\p{Emoji}/u; // Regex to detect a starting emoji
        
        return lowerName.startsWith('---') || 
               lowerName.startsWith('break') || 
               emojiRegex.test(cardName.trim());
    }

    // --- Event Listeners ---
    downloadBtn.addEventListener('click', async () => {
        const selectedBoardId = boardSelect.value;
        const selectedBoardName = boardSelect.options[boardSelect.selectedIndex].text;

        // 1. Set Loading State
        downloadBtn.disabled = true;
        downloadBtn.textContent = 'Fetching Trello Data...';
        loadingMessage.textContent = `Loading ${selectedBoardName}...`;
        loadingMessage.style.color = 'var(--color-text-secondary)';

        try {
            // 2. Fetch Data
            const boardData = await fetchTrelloData(selectedBoardId);
            
            if (boardData) {
                // Only proceed if fetch was successful (boardData is not null)
                loadingMessage.textContent = 'Data loaded. Generating file...';
                
                // 3. Generate File
                generateAndDownloadFile(boardData);
                
                loadingMessage.textContent = `✅ Success! Your file is downloading.`;
                loadingMessage.style.color = 'var(--color-accent)';
            } else {
                // Error message was already set by fetchTrelloData
                console.error("Download process failed: boardData is null.");
            }
        } catch (error) {
            // This will catch any unexpected synchronous errors
            console.error("Download process failed unexpectedly:", error);
            const errorMessage = error.message ? error.message : 'An unknown error occurred.';
            loadingMessage.textContent = `Error: ${errorMessage}`;
            loadingMessage.style.color = 'red';
        } finally {
            // 4. Reset Button
            downloadBtn.disabled = false;
            downloadBtn.textContent = 'Download AbleSet File';

            // Clear status message after 5 seconds
            setTimeout(() => {
                if (loadingMessage.textContent.startsWith('✅') || loadingMessage.textContent.startsWith('Error:')) {
                    loadingMessage.textContent = '';
                }
            }, 5000);
        }
    });

});

