"use strict";

document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURATION ---
    
    // Define the list of public Trello boards
    const boards = [
        { id: 'ge3DeazJ', name: '🎤 Rehearsal' },
        { id: 'GWX8TAdj', name: '🎆 NYE Setlist' },
        { id: 'cIqzpNi6', name: '🪩 Three-hour Gig' },
        { id: 'y3V9lSxZ', name: '🎸 Open Mic / Acoustic' },
        { id: 'MLsNdpwb', name: '💍 Wedding Setlist' },
        { id: 'fuOnZPRs', name: '📋 Main Song List' }
    ];

    // UPDATED: Using CodeTabs proxy for better stability
    const CORS_PROXY = 'https://api.codetabs.com/v1/proxy?quest=';
    const TRELLO_BASE_URL = 'https://trello.com/b/';

    // --- DOM Elements ---
    const boardsContainer = document.getElementById('boards-container');
    const statusMessage = document.getElementById('status-message');
    
    // --- Manual File Upload Elements ---
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');

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
                throw new Error(`Proxy returned status: ${response.status} ${response.statusText}`);
            }

            // FIX: Read text first to prevent "Body is disturbed" error
            const text = await response.text();

            try {
                return JSON.parse(text);
            } catch (jsonError) {
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
     * Generates and triggers the download of the .json file.
     */
    function generateAndDownloadFile(boardData, boardName) {
        if (!boardData) {
            showStatus("Error: No data to generate file.", true);
            return;
        }

        const setlistName = boardName;
        let combinedSetlist = [];

        // 1. Filter lists: Include any list that does NOT contain "exclude" (case-insensitive)
        const filteredLists = (boardData.lists || [])
            .filter(list => {
                if (list.closed) return false;
                const normalizedName = list.name.toLowerCase();                
                return !normalizedName.includes('exclude');
            })
            .sort((a, b) => a.pos - b.pos);

        if (filteredLists.length === 0) {
            showStatus(`No valid lists found on board "${boardName}". Ensure lists do not contain "exclude".`, true);
            return;
        }

        // 2. Create a map of cards by list for efficient lookup
        const cardsByList = {};
        if (boardData.cards) {
            for (const card of boardData.cards) {
                if (card.closed) continue;
                if (!cardsByList[card.idList]) {
                    cardsByList[card.idList] = [];
                }
                cardsByList[card.idList].push(card);
            }
        }

        // 3. Process each list in order
        for (const list of filteredLists) {
            const cards = (cardsByList[list.id] || []).sort((a, b) => a.pos - b.pos);
            
            for (const card of cards) {
                let item;
                
                // Parse Description for basic AbleSet props (id, time, name)
                try {
                    const parsedDesc = JSON.parse(card.desc);
                    
                    if (parsedDesc && typeof parsedDesc.lastKnownName === 'string' && typeof parsedDesc.time === 'number') {
                        item = parsedDesc;
                    } else {
                        // Valid JSON but not our format, default to card name
                        item = {
                            id: null,
                            lastKnownName: card.name,
                            time: 0,
                        };
                    }
                } catch (e) {
                    // Not valid JSON (normal text description), default to card name
                    item = {
                        id: null,
                        lastKnownName: card.name,
                        time: 0,
                    };
                }

                // Check Labels for "Segue" and "Skipped" (case-insensitive)
                const labels = card.labels || [];
                const hasSegueLabel = labels.some(l => l.name && l.name.toLowerCase() === 'segue');
                const hasSkippedLabel = labels.some(l => l.name && l.name.toLowerCase() === 'skipped');

                // Apply label overrides
                // If "segue" is present, we do NOT stop (stop = false).
                // If "segue" is missing, we DO stop (stop = true).
                item.stop = !hasSegueLabel; 

                if (hasSkippedLabel) {
                    item.skipped = true;
                }
                
                combinedSetlist.push(item);
            }
        }

        if (combinedSetlist.length === 0) {
            showStatus(`No cards found in valid lists on board "${boardName}".`, true);
            return;
        }

        // 4. Create the final .json file content
        const dataStr = JSON.stringify(combinedSetlist, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const downloadAnchor = document.createElement('a');
        const safeFilename = setlistName.toLowerCase().replace(/[^a-z0-9]/gi, '_');
        downloadAnchor.href = URL.createObjectURL(dataBlob);
        downloadAnchor.download = `${safeFilename}.json`;

        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        document.body.removeChild(downloadAnchor);
        URL.revokeObjectURL(downloadAnchor.href);
    }

    // --- Manual File Upload Logic ---

    if (dropZone && fileInput) {
        // Click to open file dialog
        dropZone.addEventListener('click', () => fileInput.click());

        // Drag over effect
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        // Drag leave effect
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });

        // Drop event
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            
            if (e.dataTransfer.files.length > 0) {
                handleUploadedFile(e.dataTransfer.files[0]);
            }
        });

        // File input change event
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleUploadedFile(e.target.files[0]);
            }
        });
    }

    function handleUploadedFile(file) {
        if (file.type !== 'application/json' && !file.name.toLowerCase().endsWith('.json')) {
            showStatus('Error: Please select a valid .json file.', true);
            return;
        }

        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const jsonContent = JSON.parse(e.target.result);
                // Clean up the filename to use as the board name
                const boardName = file.name.replace(/\.json$/i, '');
                
                showStatus(`Processing "${boardName}"...`);
                generateAndDownloadFile(jsonContent, boardName);
                showStatus(`Success! Converted "${boardName}".`);
                
            } catch (error) {
                console.error('File parsing error:', error);
                showStatus(`Error parsing JSON: ${error.message}`, true);
            }
        };

        reader.onerror = () => {
            showStatus('Error reading file.', true);
        };

        reader.readAsText(file);
    }

    // --- Helper Functions ---

    function showStatus(message, isError = false) {
        if (!statusMessage) return;
        statusMessage.textContent = message;
        statusMessage.className = isError ? 'status-error' : 'status-success';
        
        // Clear message after 5 seconds if it's a success message
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
        button.textContent = isLoading ? 'Downloading...' : 'Download .json';
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
                showStatus(`笨 Success! Download for "${boardName}" started.`);
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
                        Download .json
                    </button>
                    <a href="${TRELLO_BASE_URL}${board.id}" target="_blank" class="btn btn-primary">
                        Launch Trello
                    </a>
                </div>
            `;
            boardsContainer.appendChild(boardEl);
        });
    }

    initializeBoardList();
});