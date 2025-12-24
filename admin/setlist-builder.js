/**
 * Shared logic for Setlist Builder and Viewer
 */

const SHARED_CONFIG = {
    masterUrl: '../content/Ultraphonics_V3.json',
    defaultOwner: 'tdhckmn',
    defaultRepo: 'ultraphonics-web',
    defaultFolder: 'content/setlists'
};

// Global State wrapper
window.AppState = {
    config: {
        owner: '',
        repo: '',
        token: '',
        folder: ''
    }
};

// --- CONFIGURATION ---

function loadConfig() {
    const saved = localStorage.getItem('up_gh_config');
    if (saved) {
        window.AppState.config = JSON.parse(saved);
        updateConnectionStatus(true);
        return true;
    } else {
        window.AppState.config.owner = SHARED_CONFIG.defaultOwner;
        window.AppState.config.repo = SHARED_CONFIG.defaultRepo;
        window.AppState.config.folder = SHARED_CONFIG.defaultFolder;
        // Return true to allow Viewer to load with defaults (Public Mode)
        updateConnectionStatus(false);
        return true; 
    }
}

function saveSettingsFromUI(ownerId, repoId, tokenId, pathId, modalId) {
    const owner = document.getElementById(ownerId).value.trim();
    const repo = document.getElementById(repoId).value.trim();
    const token = document.getElementById(tokenId).value.trim();
    const folder = document.getElementById(pathId).value.trim();

    window.AppState.config = { owner, repo, token, folder };
    localStorage.setItem('up_gh_config', JSON.stringify(window.AppState.config));
    
    if (modalId) {
        document.getElementById(modalId).classList.remove('active');
    }
    
    updateConnectionStatus(true);
    return true; 
}

function updateConnectionStatus(hasSavedConfig) {
    const el = document.getElementById('connection-status');
    if (!el) return;
    
    const { token, owner, repo } = window.AppState.config;

    if (token) {
        el.innerHTML = `<span class="text-green-500"><i class="fas fa-check-circle"></i> Connected</span>`;
    } else if (owner && repo) {
        // Public / Read-Only Mode
        el.innerHTML = `<span class="text-yellow-500"><i class="fas fa-eye"></i> Public View</span>`;
    } else {
        el.innerHTML = `<span class="text-red-500"><i class="fas fa-times-circle"></i> Config Required</span>`;
    }
}

// --- GITHUB API HELPERS ---

async function fetchGithubFiles() {
    const { owner, repo, token, folder } = window.AppState.config;
    // Removed strict token check to allow public repo access

    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${folder}`;
    
    const headers = {};
    if (token) {
        headers['Authorization'] = `token ${token}`;
    }

    // Add timestamp to prevent caching
    const res = await fetch(`${url}?t=${Date.now()}`, { headers });

    if (res.status === 404) throw new Error("Folder not found");
    if (res.status === 403 && !token) throw new Error("API Rate Limit. Add Token in Settings.");
    if (!res.ok) throw new Error(`GitHub Error: ${res.status}`);

    const files = await res.json();
    // Filter for JSON files and sort by name
    return files
        .filter(f => f.name.endsWith('.json'))
        .sort((a, b) => a.name.localeCompare(b.name));
}

async function fetchGithubFileContent(url) {
    // Add timestamp to prevent caching
    // Note: If url is raw.githubusercontent.com, it works without token for public repos
    const res = await fetch(`${url}?t=${Date.now()}`);
    if (!res.ok) throw new Error("Failed to download file");
    return await res.json();
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
                 report.push(`${bufferName} (${bufferCount})`);
             } else if (bufferCount > 0) {
                 report.push(`Intro (${bufferCount})`);
             }
             bufferName = name;
             bufferCount = 0;
         } else {
             bufferCount++;
         }
     });

     if (bufferName !== null) {
         report.push(`${bufferName} (${bufferCount})`);
     } else if (bufferCount > 0) {
         report.push(`Total (${bufferCount})`);
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