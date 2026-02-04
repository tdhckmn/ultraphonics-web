/**
 * Shared logic for Setlist Builder and Viewer
 * Uses Firebase Firestore for data storage
 */

const SHARED_CONFIG = {
    masterUrl: '../content/Ultraphonics_V3.json'
};

// Global State wrapper
window.AppState = {
    isAuthenticated: false
};

// --- CONFIGURATION ---

function loadConfig() {
    // Check if Firebase is available and user is authenticated
    if (window.FirebaseAuth) {
        const user = window.FirebaseAuth.getCurrentUser();
        window.AppState.isAuthenticated = !!user;
    }
    return true;
}

// --- FIRESTORE HELPERS ---

async function fetchSetlistFiles() {
    // Get setlists from Firestore
    if (!window.FirestoreService) {
        throw new Error("Firebase not loaded");
    }

    try {
        const setlists = await window.FirestoreService.getSetlists();
        // Transform to match expected format
        return setlists.map(doc => ({
            name: doc.id + '.json',
            id: doc.id,
            download_url: null // Will fetch directly from Firestore
        }));
    } catch (error) {
        console.error('Error fetching setlists:', error);
        throw new Error("Failed to load setlists");
    }
}

async function fetchSetlistContent(setlistId) {
    // Get setlist content from Firestore
    if (!window.FirestoreService) {
        throw new Error("Firebase not loaded");
    }

    try {
        const setlist = await window.FirestoreService.getSetlist(setlistId);
        if (!setlist) {
            throw new Error("Setlist not found");
        }
        return setlist.songs || [];
    } catch (error) {
        console.error('Error fetching setlist content:', error);
        throw new Error("Failed to load setlist");
    }
}

async function saveSetlist(name, songs) {
    // Save setlist to Firestore
    if (!window.FirestoreService) {
        throw new Error("Firebase not loaded");
    }

    if (!window.FirebaseAuth?.isAuthenticated()) {
        throw new Error("Please sign in to save setlists");
    }

    try {
        await window.FirestoreService.saveSetlist(name, songs);
    } catch (error) {
        console.error('Error saving setlist:', error);
        throw new Error("Failed to save setlist: " + error.message);
    }
}

async function deleteSetlist(setlistName) {
    // Delete setlist from Firestore
    if (!window.FirestoreService) {
        throw new Error("Firebase not loaded");
    }

    if (!window.FirebaseAuth?.isAuthenticated()) {
        throw new Error("Please sign in to delete setlists");
    }

    try {
        await window.FirestoreService.deleteSetlist(setlistName);
    } catch (error) {
        console.error('Error deleting setlist:', error);
        throw new Error("Failed to delete setlist: " + error.message);
    }
}

// --- UTILS ---

function showLoader(elId, textId, show, msg) {
    const el = document.getElementById(elId);
    const txt = document.getElementById(textId);
    if (!el) return;

    el.classList.toggle('active', show);
    if (msg && txt) txt.innerHTML = `<i class="fas fa-sync fa-spin mr-2"></i> ${msg}`;
}

function generateStats(setlistData) {
     if (!setlistData || setlistData.length === 0) return "0 items";

     let report = [];
     let bufferCount = 0;
     let bufferName = null;

     setlistData.forEach(item => {
         const name = item.lastKnownName || "";
         const isSet = name.toLowerCase().startsWith('set');

         if (isSet) {
             if (bufferName !== null) {
                 // Extract just the number from "Set 1", "Set 2", etc.
                 const setNumber = bufferName.toLowerCase().replace('set', '').trim();
                 report.push(`${setNumber}(${bufferCount})`);
             } else if (bufferCount > 0) {
                 report.push(`Intro(${bufferCount})`);
             }
             bufferName = name;
             bufferCount = 0;
         } else {
             bufferCount++;
         }
     });

     if (bufferName !== null) {
         // Extract just the number from "Set 1", "Set 2", etc.
         const setNumber = bufferName.toLowerCase().replace('set', '').trim();
         report.push(`${setNumber}(${bufferCount})`);
     } else if (bufferCount > 0) {
         report.push(`Total(${bufferCount})`);
     }

     return report.join(" • ");
}

function getFallbackData() {
    return [
        { "id": "1", "lastKnownName": "24K Magic", "stop": true },
        { "id": "2", "lastKnownName": "Set 1", "stop": true },
        { "id": "3", "lastKnownName": "Uptown Funk", "stop": true }
    ];
}

/**
 * Parses tags array from imported setlist into individual properties
 * @param {Array} setlist - The setlist array to process
 * @returns {Array} - A deep copy of the setlist with tags parsed into properties
 */
function parseSetlistFromImport(setlist) {
    return setlist.map(song => {
        const songCopy = { ...song };

        // Parse tags array if it exists
        if (Array.isArray(songCopy.tags) && songCopy.tags.length > 0) {
            songCopy.tags.forEach(tag => {
                const [key, value] = tag.split(':');

                if (key === 'vocals') {
                    songCopy.vocals = value;
                } else if (key === 'eflat' && value === 'true') {
                    songCopy.eflat = true;
                } else if (key === 'drop' && value === 'true') {
                    songCopy.drop = true;
                } else if (key === 'capo') {
                    songCopy.capo = parseInt(value);
                }
            });

            // Remove tags array after parsing
            delete songCopy.tags;
        }

        return songCopy;
    });
}

/**
 * Prepares setlist data for export by converting properties to tags array
 * @param {Array} setlist - The setlist array to process
 * @returns {Array} - A deep copy of the setlist with props converted to tags array
 */
function prepareSetlistForExport(setlist) {
    return setlist.map(song => {
        const songCopy = { ...song };

        // Build tags array
        const tags = [];

        if (songCopy.vocals !== undefined && songCopy.vocals !== '') {
            tags.push(`vocals:${songCopy.vocals}`);
        }

        if (songCopy.eflat === true) {
            tags.push('eflat:true');
        }

        if (songCopy.drop === true) {
            tags.push('drop:true');
        }

        if (songCopy.capo !== undefined && songCopy.capo > 0) {
            tags.push(`capo:${songCopy.capo}`);
        }

        // Add tags array if any exist
        if (tags.length > 0) {
            songCopy.tags = tags;
        }

        // Remove the individual properties (they're now in tags)
        delete songCopy.vocals;
        delete songCopy.eflat;
        delete songCopy.drop;
        delete songCopy.capo;

        return songCopy;
    });
}
