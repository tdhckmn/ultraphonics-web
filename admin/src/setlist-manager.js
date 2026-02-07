/**
 * Setlist Manager
 * Uses Firebase Firestore for songs and setlists storage
 */

// --- GLOBAL STATE ---
const state = {
    library: [],
    setlist: [],
    songsMap: new Map(), // Map of song ID to song data (global properties)
    vocalAssignments: {}, // { songId: vocalist } - per-setlist vocalist assignments
    segues: {}, // { songId: true } - per-setlist segue flags
    currentFile: null,   // Firebase document ID (GUID)
    currentSetlistName: null, // Display name
    fileList: [],
    mobileTab: 'library',
    viewMode: true,
    hasUnsavedChanges: false,
    originalSetlist: []
};

// Generate a random GUID
function generateGuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// DOM element references (initialized after DOMContentLoaded)
let els = {};

// Sortable instances
let librarySortable = null;
let setlistSortable = null;

// --- CONFIGURATION ---
window.AppState = {
    isAuthenticated: false
};

function loadConfig() {
    if (window.FirebaseAuth) {
        const user = window.FirebaseAuth.getCurrentUser();
        window.AppState.isAuthenticated = !!user;
    }
    return true;
}

// --- FIRESTORE HELPERS ---

async function fetchSongs() {
    if (!window.FirestoreService) {
        throw new Error("Firebase not loaded");
    }
    try {
        const songs = await window.FirestoreService.getSongs();
        return songs;
    } catch (error) {
        console.error('Error fetching songs:', error);
        throw new Error("Failed to load songs");
    }
}

// Cache of full setlist data from getSetlists() to avoid redundant fetches
let setlistCache = new Map();

async function fetchSetlistFiles() {
    if (!window.FirestoreService) {
        throw new Error("Firebase not loaded");
    }
    try {
        const setlists = await window.FirestoreService.getSetlists();
        setlistCache.clear();

        const files = setlists.map(item => {
            const id = item.id;
            const name = item.name || id;

            // Cache the full setlist data for later use
            setlistCache.set(id, item);

            return { name, id };
        }).filter(item => item.id);

        return files;
    } catch (error) {
        console.error('Error fetching setlists:', error);
        throw new Error("Failed to load setlists");
    }
}

async function fetchSetlistContent(setlistId) {
    if (!setlistId) {
        throw new Error("Invalid Setlist ID");
    }

    // Try cache first (populated by fetchSetlistFiles)
    let setlist = setlistCache.get(setlistId);

    // Fallback to direct fetch if not in cache
    if (!setlist && window.FirestoreService) {
        setlist = await window.FirestoreService.getSetlist(setlistId);
    }

    if (!setlist) {
        throw new Error("Setlist not found");
    }

    return {
        songs: setlist.songs || [],
        vocalAssignments: setlist.vocalAssignments || {},
        segues: setlist.segues || {},
        name: setlist.name
    };
}

async function saveSetlistToFirebase(id, name, songs, options = {}) {
    if (!window.FirestoreService) {
        throw new Error("Firebase not loaded");
    }
    if (!window.FirebaseAuth?.isAuthenticated()) {
        throw new Error("Please sign in to save setlists");
    }
    try {
        await window.FirestoreService.saveSetlist(id, name, songs, options);
    } catch (error) {
        console.error('Error saving setlist:', error);
        throw new Error("Failed to save setlist: " + error.message);
    }
}

async function deleteSetlist(setlistId) {
    if (!window.FirestoreService) {
        throw new Error("Firebase not loaded");
    }
    if (!window.FirebaseAuth?.isAuthenticated()) {
        throw new Error("Please sign in to delete setlists");
    }
    try {
        await window.FirestoreService.deleteSetlist(setlistId);
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
        const setNumber = bufferName.toLowerCase().replace('set', '').trim();
        report.push(`${setNumber}(${bufferCount})`);
    } else if (bufferCount > 0) {
        report.push(`Total(${bufferCount})`);
    }

    return report.join(" \u2022 ");
}

/**
 * Parses tags array from imported setlist into individual properties
 */
function parseSetlistFromImport(setlist) {
    return setlist.map(song => {
        const songCopy = { ...song };

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
            delete songCopy.tags;
        }

        return songCopy;
    });
}

/**
 * Prepares setlist data for export by converting properties to tags array
 */
function prepareSetlistForExport(setlist) {
    return setlist.map(song => {
        const songCopy = { ...song };
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

        if (tags.length > 0) {
            songCopy.tags = tags;
        }

        delete songCopy.vocals;
        delete songCopy.eflat;
        delete songCopy.drop;
        delete songCopy.capo;

        return songCopy;
    });
}

// --- UNSAVED CHANGES TRACKING ---

function markAsChanged() {
    if (state.viewMode) return;
    state.hasUnsavedChanges = true;
    updateSaveButton();
}

function markAsSaved() {
    state.hasUnsavedChanges = false;
    state.originalSetlist = JSON.parse(JSON.stringify(state.setlist));
    updateSaveButton();
}

function updateSaveButton() {
    const saveBtn = document.getElementById('header-save-btn');
    if (!saveBtn) return;

    const connected = window.FirebaseAuth?.isAuthenticated();
    if (state.hasUnsavedChanges && connected && !state.viewMode) {
        saveBtn.classList.remove('hidden');
    } else {
        saveBtn.classList.add('hidden');
    }
}

// --- VIEW MODE ---

window.toggleViewMode = () => {
    state.viewMode = !state.viewMode;
    document.body.classList.toggle('view-mode', state.viewMode);

    const btn = document.getElementById('btn-view-mode');
    const icon = document.getElementById('view-mode-icon');
    const text = document.getElementById('view-mode-text');
    const headerTitle = document.getElementById('header-mode-title');

    if (state.viewMode) {
        icon.className = 'fas fa-edit';
        text.textContent = 'Edit';
        btn.className = 'btn btn-secondary text-xs px-3 bg-[#422006] border border-[#fbbf24] text-[#fcd34d] hover:bg-[#3f3f46]';
        headerTitle.textContent = 'Setlists';
        document.title = 'Setlists - Ultraphonics';
    } else {
        icon.className = 'fas fa-eye';
        text.textContent = 'View';
        btn.className = 'btn btn-secondary text-xs px-3 bg-[#1e3a8a] border border-blue-500 text-blue-200 hover:bg-[#1e40af]';
        headerTitle.textContent = 'Setlists';
        document.title = 'Setlists - Ultraphonics';
    }

    if (librarySortable) librarySortable.option('disabled', state.viewMode);
    if (setlistSortable) setlistSortable.option('disabled', state.viewMode);

    renderSetlist();
    renderLibrary();
    updateUI();

    const currentSidebarTab = els.sidebarViews.files.classList.contains('hidden') ? 'library' : 'files';
    switchSidebarTab(currentSidebarTab);
    switchMobileTab(state.mobileTab);
};

// --- SIDEBAR TABS ---

window.switchSidebarTab = (tab) => {
    if (tab === 'files') {
        els.sidebarViews.files.classList.remove('hidden');
        els.sidebarViews.files.classList.add('flex');
        els.sidebarViews.library.classList.add('hidden');

        els.sidebarTabs.files.classList.add('bg-[#333]', 'shadow-sm', 'sidebar-tab-active');
        els.sidebarTabs.files.classList.remove('text-gray-400', 'hover:text-white');
        els.sidebarTabs.library.classList.remove('bg-[#333]', 'shadow-sm', 'sidebar-tab-active');
        els.sidebarTabs.library.classList.add('text-gray-400', 'hover:text-white');
    } else {
        els.sidebarViews.files.classList.add('hidden');
        els.sidebarViews.files.classList.remove('flex');
        els.sidebarViews.library.classList.remove('hidden');

        els.sidebarTabs.library.classList.add('bg-[#333]', 'shadow-sm', 'sidebar-tab-active');
        els.sidebarTabs.library.classList.remove('text-gray-400', 'hover:text-white');
        els.sidebarTabs.files.classList.remove('bg-[#333]', 'shadow-sm', 'sidebar-tab-active');
        els.sidebarTabs.files.classList.add('text-gray-400', 'hover:text-white');
    }
};

// --- MOBILE TABS ---

window.switchMobileTab = (tab) => {
    state.mobileTab = tab;

    if (tab === 'library') {
        els.panels.library.classList.remove('mobile-hidden');
        els.panels.setlist.classList.add('mobile-hidden');

        els.tabs.library.classList.remove('text-gray-500', 'border-transparent');
        els.tabs.library.classList.add('mobile-tab-active');
        els.tabs.library.style.color = '';
        els.tabs.library.style.borderColor = '';

        els.tabs.setlist.classList.remove('mobile-tab-active');
        els.tabs.setlist.classList.add('text-gray-500', 'border-transparent');
        els.tabs.setlist.style.color = '';
        els.tabs.setlist.style.borderColor = '';
    } else {
        els.panels.library.classList.add('mobile-hidden');
        els.panels.setlist.classList.remove('mobile-hidden');

        els.tabs.setlist.classList.remove('text-gray-500', 'border-transparent');
        els.tabs.setlist.classList.add('mobile-tab-active');
        els.tabs.setlist.style.color = '';
        els.tabs.setlist.style.borderColor = '';

        els.tabs.library.classList.remove('mobile-tab-active');
        els.tabs.library.classList.add('text-gray-500', 'border-transparent');
        els.tabs.library.style.color = '';
        els.tabs.library.style.borderColor = '';
    }
};

// --- TOOLBAR MENU ---

window.toggleToolbarMenu = (e) => {
    if (e) e.stopPropagation();
    const menu = document.getElementById('toolbar-menu');
    if (menu) menu.classList.toggle('hidden');
};

// --- SHARE ---

window.shareSetlist = async () => {
    // Build a clean share URL with just the setlist ID
    const shareUrl = new URL(window.location.origin + window.location.pathname);
    if (state.currentFile) {
        shareUrl.searchParams.set('setlist', state.currentFile);
    }
    if (state.viewMode) {
        shareUrl.searchParams.set('view', 'true');
    }
    const url = shareUrl.toString();

    try {
        if (navigator.share) {
            const title = state.currentSetlistName
                ? `Ultraphonics - ${state.currentSetlistName}`
                : 'Ultraphonics Setlist';
            await navigator.share({ title, url });
        } else {
            await navigator.clipboard.writeText(url);
            alert('Link copied to clipboard!');
        }
        const menu = document.getElementById('toolbar-menu');
        if (menu) menu.classList.add('hidden');
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error('Share failed:', err);
        }
    }
};

// --- ABLESET ---

function updateAbleSetLink() {
    const DEFAULT_ABLESET_URL = 'http://192.168.1.243';
    const storedUrl = localStorage.getItem('ableset_url');
    const url = storedUrl || DEFAULT_ABLESET_URL;
    const link = document.getElementById('headerAblesetLink');
    if (link) link.href = url;
}

window.handleAblesetClick = (e) => {
    if (state.hasUnsavedChanges) {
        if (!confirm('You have unsaved changes. Are you sure you want to leave?')) {
            e.preventDefault();
            return false;
        }
    }
    return true;
};

// --- SETTINGS ---

window.openSettings = () => {
    const DEFAULT_ABLESET_URL = 'http://192.168.1.243';
    const storedUrl = localStorage.getItem('ableset_url');
    document.getElementById('ableset-url').value = storedUrl || DEFAULT_ABLESET_URL;

    const user = window.FirebaseAuth?.getCurrentUser();
    const userInfo = document.getElementById('user-info');
    const userEmail = document.getElementById('user-email');
    const signOutBtn = document.getElementById('sign-out-btn');

    if (user) {
        userEmail.textContent = user.email;
        userInfo.classList.remove('hidden');
        signOutBtn.classList.remove('hidden');
    } else {
        userInfo.classList.add('hidden');
        signOutBtn.classList.add('hidden');
    }

    document.getElementById('settings-modal').classList.add('active');
};

window.clearCacheAndReload = () => {
    const url = new URL(window.location);
    url.searchParams.set('cachebust', Date.now());
    window.location.href = url.toString();
};

// --- DATA LOADING ---

async function loadSongsFromFirebase() {
    try {
        const songs = await fetchSongs();
        state.songsMap.clear();

        songs.forEach(song => {
            // Normalize song data - Firebase may use 'title' or 'name' instead of 'lastKnownName'
            const normalized = {
                ...song,
                lastKnownName: song.lastKnownName || song.title || song.name || 'Untitled'
            };
            // Parse tags into properties if present
            const processed = parseSetlistFromImport([normalized])[0];
            state.songsMap.set(song.id, processed);
        });

        // Build library from songs (excluding hidden)
        refreshLibrary();
        return true;
    } catch (e) {
        console.error('Failed to load songs from Firebase:', e);
        return false;
    }
}

function refreshLibrary() {
    const setlistIds = new Set(state.setlist.map(s => s.id));
    const setlistNames = new Set(state.setlist.map(s => s.lastKnownName));

    state.library = Array.from(state.songsMap.values())
        .filter(song => {
            if (song.id && setlistIds.has(song.id)) return false;
            if (setlistNames.has(song.lastKnownName)) return false;
            if (song.lastKnownName === "-hide-") return false;
            return true;
        })
        .sort((a, b) => (a.lastKnownName || '').localeCompare(b.lastKnownName || ''));

    renderLibrary();
}

function renderLibrary() {
    if (!els.library) return;
    els.library.innerHTML = '';
    const term = document.getElementById('search')?.value.toLowerCase() || '';

    state.library.forEach(song => {
        if (term && !(song.lastKnownName || '').toLowerCase().includes(term)) return;
        els.library.appendChild(createSongElement(song, false));
    });

    const countEl = document.getElementById('library-count');
    if (countEl) countEl.textContent = state.library.length;
}

function renderSetlist() {
    if (!els.setlist) return;
    els.setlist.innerHTML = '';

    if (state.setlist.length === 0) {
        els.emptyState.style.display = 'flex';
    } else {
        els.emptyState.style.display = 'none';
        state.setlist.forEach(song => els.setlist.appendChild(createSongElement(song, true)));
    }

    if (els.stats) els.stats.textContent = generateStats(state.setlist);
    const mobileCount = document.getElementById('mobile-count');
    if (mobileCount) mobileCount.textContent = state.setlist.length;
}

function createSongElement(data, isSetlist) {
    const div = document.createElement('div');
    div.className = 'song-item group';
    div.dataset.json = JSON.stringify(data);
    div.dataset.id = data.id;
    div.dataset.name = data.lastKnownName || '';

    const isSetMarker = (data.lastKnownName || '').toLowerCase().startsWith('set');

    // Get setlist-specific properties from state
    const isSegue = isSetlist ? (state.segues[data.id] === true) : false;
    const vocals = isSetlist ? state.vocalAssignments[data.id] : null;

    // Get global properties from songsMap (fallback to data for backwards compatibility)
    const globalSong = state.songsMap.get(data.id) || data;

    if (isSetlist && isSegue && !isSetMarker) {
        div.classList.add('segue-active');
        div.style.borderLeft = '4px solid ' + (state.viewMode ? '#3b82f6' : '#fbbf24');
    }

    let indicatorsHtml = '';
    if (isSetlist && !isSetMarker) {
        // Global properties from song
        if (globalSong.eflat) indicatorsHtml += `<span class="prop-label eflat" title="Eb Tuning">Eb</span>`;
        if (globalSong.drop) indicatorsHtml += `<span class="prop-label drop" title="Drop Tuning">D</span>`;
        if (globalSong.capo && globalSong.capo > 0) indicatorsHtml += `<span class="prop-label capo" title="Capo ${globalSong.capo}">C${globalSong.capo}</span>`;
        // Local properties from state
        if (isSegue) indicatorsHtml += `<span class="prop-label segue" title="Segue">S</span>`;
        if (vocals) {
            const v = vocals.toLowerCase();
            const initial = vocals.charAt(0).toUpperCase();
            indicatorsHtml += `<span class="prop-bubble ${v}" title="${vocals}">${initial}</span>`;
        }
    }

    let controlsHtml;
    if (isSetlist) {
        if (state.viewMode) {
            controlsHtml = `<div class="flex items-center gap-3">
                <div class="flex items-center mr-2">${indicatorsHtml}</div>
            </div>`;
        } else {
            controlsHtml = `<div class="flex items-center gap-3">
                <div class="flex items-center mr-2">${indicatorsHtml}</div>
                ${!isSetMarker ? `<button onclick="editItemProps('${data.id}')" class="text-gray-500 hover:text-[#fbbf24] p-2" title="Edit Properties"><i class="fas fa-pencil-alt"></i></button>` : ''}
                <button onclick="removeItem('${data.id}')" class="text-gray-500 hover:text-red-500 p-2"><i class="fas fa-times"></i></button>
            </div>`;
        }
    } else {
        if (state.viewMode) {
            controlsHtml = '';
        } else {
            controlsHtml = `<div class="flex items-center"><button class="add-btn text-gray-500 hover:text-[#fbbf24] p-3 -mr-2"><i class="fas fa-plus"></i></button></div>`;
        }
    }

    div.innerHTML = `
        <div class="flex-1 overflow-hidden flex flex-col">
            <div class="song-name truncate text-sm font-medium ${isSetMarker ? 'text-lg text-[#fca5a5]' : 'text-gray-200'}">${data.lastKnownName || ''}</div>
        </div>
        ${controlsHtml}
    `;

    if (!isSetlist && !state.viewMode) {
        const btn = div.querySelector('.add-btn');
        if (btn) btn.onclick = (e) => { e.stopPropagation(); addToSetlist(data); };
    }
    return div;
}

function addToSetlist(data) {
    const item = JSON.parse(JSON.stringify(data));
    if (item.stop === undefined) item.stop = true;
    state.setlist.push(item);
    renderSetlist();
    refreshLibrary();
    markAsChanged();

    if (window.innerWidth < 768) {
        const badge = document.getElementById('mobile-count');
        if (badge) {
            badge.classList.add('animate-ping');
            setTimeout(() => badge.classList.remove('animate-ping'), 500);
        }
    }
}

// --- UI ---

function updateUI() {
    if (els.currentFilename) {
        // Use the explicit name if available, otherwise the ID, otherwise Unsaved
        const displayName = state.currentSetlistName || (state.currentFile ? state.currentFile : "(Unsaved)");
        els.currentFilename.textContent = displayName;
    }

    const connected = window.FirebaseAuth?.isAuthenticated();
    const menuSaveBtn = document.getElementById('menu-btn-save');
    const menuSaveAsBtn = document.getElementById('menu-btn-save-as');
    const menuDuplicateBtn = document.getElementById('menu-btn-duplicate');
    const toolbarMenuToggle = document.getElementById('toolbar-menu-toggle');

    if (state.viewMode) {
        if (toolbarMenuToggle) toolbarMenuToggle.style.display = 'none';
    } else {
        if (toolbarMenuToggle) toolbarMenuToggle.style.display = '';
        if (menuSaveBtn) menuSaveBtn.disabled = !connected;
        if (menuSaveAsBtn) menuSaveAsBtn.disabled = !connected;
        // Show duplicate button only when a setlist is loaded and user is authenticated
        if (menuDuplicateBtn) {
            if (connected && state.currentFile) {
                menuDuplicateBtn.classList.remove('hidden');
            } else {
                menuDuplicateBtn.classList.add('hidden');
            }
        }
    }
}

// --- FILE OPERATIONS ---

async function refreshFileList(silent = false) {
    if (!silent && els.files) {
        els.files.innerHTML = '<p class="text-center text-gray-500 mt-4"><i class="fas fa-circle-notch fa-spin"></i> Fetching...</p>';
    }
    if (els.folderPath) els.folderPath.textContent = 'Saved Setlists';

    try {
        const files = await fetchSetlistFiles();
        state.fileList = files;
        if (files.length === 0) {
            if (!silent && els.files) els.files.innerHTML = '<p class="text-center text-gray-500 mt-4">No setlists found.</p>';
            return;
        }
        if (!silent) renderFileListSidebar(files);
    } catch (err) {
        if (!silent && els.files) els.files.innerHTML = `<p class="text-center text-red-500 mt-4 text-xs px-2">${err.message}</p>`;
    }
}

function renderFileListSidebar(files) {
    if (!els.files) return;
    els.files.innerHTML = '';
    const hasAuth = window.FirebaseAuth?.isAuthenticated();

    files.forEach(file => {
        const div = document.createElement('div');
        div.className = 'file-item';
        if (state.currentFile === file.id) div.classList.add('active');

        let deleteBtn = '';
        if (hasAuth && !state.viewMode) {
            deleteBtn = `<button class="delete-file-btn text-gray-500 hover:text-red-500 p-2 ml-2" title="Delete"><i class="fas fa-trash-alt"></i></button>`;
        }

        div.innerHTML = `
            <span class="font-medium text-gray-200 truncate text-sm flex-1"><i class="fas fa-list mr-2 text-gray-500"></i> ${file.name}</span>
            ${deleteBtn}
        `;

        div.onclick = (e) => {
            if (e.target.closest('.delete-file-btn')) return;
            if (state.hasUnsavedChanges) {
                if (!confirm('You have unsaved changes. Discard and load a different setlist?')) {
                    return;
                }
            }
            loadRemoteFile(file);
            switchSidebarTab('library');
        };

        const btn = div.querySelector('.delete-file-btn');
        if (btn) {
            btn.onclick = async (e) => {
                e.stopPropagation();
                if (confirm(`Are you sure you want to delete "${file.name}"? This cannot be undone.`)) {
                    await deleteRemoteFile(file);
                }
            };
        }

        els.files.appendChild(div);
    });
}

async function deleteRemoteFile(fileObj) {
    const displayName = fileObj.name;
    showLoader('main-loader', 'loader-text', true, `Deleting ${displayName}...`);
    try {
        await deleteSetlist(fileObj.id);

        if (state.currentFile === fileObj.id) {
            state.currentFile = null;
            state.currentSetlistName = null;
            state.setlist = [];
            state.vocalAssignments = {};
            state.segues = {};

            // Clear URL params
            const url = new URL(window.location.origin + window.location.pathname);
            window.history.replaceState({}, '', url);

            renderSetlist();
            refreshLibrary();
            updateUI();
        }

        refreshFileList();
        alert(`Deleted "${displayName}"`);
    } catch (err) {
        alert(`Delete failed: ${err.message}`);
    } finally {
        showLoader('main-loader', null, false);
    }
}

async function loadRemoteFile(fileObj) {
    const displayName = fileObj.name;
    showLoader('main-loader', 'loader-text', true, `Loading ${displayName}...`);

    // UPDATE QUERY PARAM WITH ID
    const url = new URL(window.location);
    url.searchParams.set('setlist', fileObj.id);
    window.history.replaceState({}, '', url);

    try {
        const setlistId = fileObj.id;
        const setlistData = await fetchSetlistContent(setlistId);

        // Handle both old format (array) and new format (object with songs, vocalAssignments, segues)
        const songsArray = Array.isArray(setlistData) ? setlistData : (setlistData.songs || []);
        state.vocalAssignments = setlistData.vocalAssignments || {};
        state.segues = setlistData.segues || {};
        
        // Update display name from stored data if available, or fallback to list name
        state.currentSetlistName = setlistData.name || displayName;

        // Normalize song names
        const normalizedData = songsArray.map(song => {
            // Handle case where song might be a string (just an ID)
            if (typeof song === 'string') {
                const fullSong = state.songsMap.get(song);
                return fullSong ? { ...fullSong } : { id: song, lastKnownName: 'Unknown Song' };
            }
            return {
                ...song,
                lastKnownName: song.lastKnownName || song.title || song.name || 'Untitled'
            };
        });
        state.setlist = parseSetlistFromImport(normalizedData);
        state.currentFile = fileObj.id;
        markAsSaved();
        renderSetlist();
        refreshLibrary();
        updateUI();
        renderFileListSidebar(state.fileList); // Re-render to update active class based on ID
        if (window.innerWidth < 768) switchMobileTab('setlist');
    } catch (err) {
        alert("Error: " + err.message);
    } finally {
        showLoader('main-loader', null, false);
    }
}

// --- SAVING ---

window.saveCurrent = async () => {
    closeToolbarMenu();
    if (!state.currentFile) return saveAs();
    if (!confirm(`Save changes to "${state.currentSetlistName || state.currentFile}"?`)) return;
    await performSave(state.currentFile, state.currentSetlistName);
};

window.saveAs = async () => {
    closeToolbarMenu();
    const defaultName = state.currentSetlistName || "New Setlist";
    const name = prompt("Setlist name:", defaultName);
    if (!name) return;
    
    // Generate a new GUID for the setlist ID
    const newId = generateGuid();
    
    // Pass new ID and Name to performSave
    await performSave(newId, name);
};

async function performSave(setlistId, setlistName) {
    const displayName = setlistName || setlistId;
    showLoader('main-loader', 'loader-text', true, `Saving ${displayName}...`);
    try {
        const exportData = prepareSetlistForExport(state.setlist);

        // Save using GUID as key, name stored in document data
        await saveSetlistToFirebase(setlistId, setlistName, exportData, {
            vocalAssignments: state.vocalAssignments,
            segues: state.segues
        });

        state.currentFile = setlistId;
        state.currentSetlistName = setlistName;
        
        // Update URL to the new ID
        const url = new URL(window.location);
        url.searchParams.set('setlist', setlistId);
        window.history.replaceState({}, '', url);

        markAsSaved();
        updateUI();
        refreshFileList(true);
        alert(`Saved "${displayName}"`);
    } catch (err) {
        alert(`Save failed: ${err.message}`);
    } finally {
        showLoader('main-loader', null, false);
    }
}

window.duplicateSetlist = async () => {
    closeToolbarMenu();
    if (!state.currentFile) {
        alert("No setlist loaded to duplicate.");
        return;
    }
    const currentName = state.currentSetlistName || "Setlist";
    const newName = prompt("Name for duplicate:", currentName + " Copy");
    if (!newName) return;
    
    // Generate new GUID for the duplicate
    const newId = generateGuid();

    // Save as new setlist
    showLoader('main-loader', 'loader-text', true, `Creating copy...`);
    try {
        const exportData = prepareSetlistForExport(state.setlist);
        await saveSetlistToFirebase(newId, newName, exportData, {
            vocalAssignments: state.vocalAssignments,
            segues: state.segues
        });

        state.currentFile = newId;
        state.currentSetlistName = newName;
        
        // Update URL
        const url = new URL(window.location);
        url.searchParams.set('setlist', newId);
        window.history.replaceState({}, '', url);

        markAsSaved();
        updateUI();
        refreshFileList(true);
        alert(`Created "${newName}"`);
    } catch (err) {
        alert(`Duplicate failed: ${err.message}`);
    } finally {
        showLoader('main-loader', null, false);
    }
};

// --- ACTIONS ---

window.removeItem = (id) => {
    const idx = state.setlist.findIndex(s => s.id === id);
    if (idx > -1) {
        state.setlist.splice(idx, 1);
        renderSetlist();
        refreshLibrary();
        markAsChanged();
    }
};

window.filterLibrary = (type) => {
    const search = document.getElementById('search');
    if (search) search.value = type === 'sets' ? 'set' : '';
    renderLibrary();
};

window.resetToNew = () => {
    closeToolbarMenu();
    const msg = state.hasUnsavedChanges
        ? "You have unsaved changes. Discard and start new?"
        : "Start a new setlist?";
    if (confirm(msg)) {
        state.setlist = [];
        state.vocalAssignments = {};
        state.segues = {};
        state.currentFile = null;
        state.currentSetlistName = null;

        // Clear URL params
        const url = new URL(window.location.origin + window.location.pathname);
        window.history.replaceState({}, '', url);

        markAsSaved();
        renderSetlist();
        refreshLibrary();
        updateUI();
        renderFileListSidebar(state.fileList);
    }
};

function closeToolbarMenu() {
    const menu = document.getElementById('toolbar-menu');
    if (menu) menu.classList.add('hidden');
}

window.downloadSetlist = () => {
    if (state.setlist.length === 0) { alert("Setlist is empty."); return; }
    const exportData = prepareSetlistForExport(state.setlist);
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    // Use human readable name for filename
    const filename = (state.currentSetlistName || 'setlist').replace(/\s+/g, '-').toLowerCase() + '.json';
    a.download = filename;
    a.click();
};

// --- SONG PROPERTIES ---

window.editItemProps = (id) => {
    const song = state.setlist.find(s => s.id === id);
    if (!song) return;

    // Get global song data from songsMap for current values
    const globalSong = state.songsMap.get(id) || song;

    document.getElementById('props-song-name').textContent = song.lastKnownName;
    document.getElementById('props-song-id').value = song.id;

    // Local (per-setlist) properties
    document.getElementById('props-vocals').value = state.vocalAssignments[id] || "";
    document.getElementById('props-segue').checked = state.segues[id] === true;

    // Global (song-level) properties
    document.getElementById('props-capo').value = globalSong.capo || "";
    document.getElementById('props-drop').checked = globalSong.drop || false;
    document.getElementById('props-eflat').checked = globalSong.eflat || false;

    document.getElementById('props-modal').classList.add('active');
};

window.saveSongProps = async () => {
    const id = document.getElementById('props-song-id').value;
    const song = state.setlist.find(s => s.id === id);
    if (!song) {
        document.getElementById('props-modal').classList.remove('active');
        return;
    }

    // Get current global song data
    const globalSong = state.songsMap.get(id) || {};

    // Read form values
    const vocals = document.getElementById('props-vocals').value;
    const capoVal = document.getElementById('props-capo').value;
    const capo = capoVal ? parseInt(capoVal) : 0;
    const drop = document.getElementById('props-drop').checked;
    const eflat = document.getElementById('props-eflat').checked;
    const isSegue = document.getElementById('props-segue').checked;

    // Update LOCAL (per-setlist) properties
    if (vocals) {
        state.vocalAssignments[id] = vocals;
    } else {
        delete state.vocalAssignments[id];
    }

    if (isSegue) {
        state.segues[id] = true;
    } else {
        delete state.segues[id];
    }

    // Check if GLOBAL properties changed
    const globalChanged = (
        globalSong.capo !== capo ||
        globalSong.drop !== drop ||
        globalSong.eflat !== eflat
    );

    if (globalChanged) {
        // Update global song in Firebase
        const updatedSong = {
            ...globalSong,
            capo,
            drop,
            eflat
        };

        try {
            await window.FirestoreService.saveSong(updatedSong);
            // Update local songsMap
            state.songsMap.set(id, updatedSong);
            // Update the song in setlist to reflect new global props
            Object.assign(song, { capo, drop, eflat });
        } catch (err) {
            console.error('Failed to save song globally:', err);
            alert('Failed to save global song properties: ' + err.message);
        }
    }

    renderSetlist();
    markAsChanged();
    document.getElementById('props-modal').classList.remove('active');
};

// --- DRAG AND DROP ---

function setupDragAndDrop() {
    if (!els.library || !els.setlist) return;

    librarySortable = new Sortable(els.library, {
        group: { name: 'shared', pull: 'clone', put: false },
        sort: false,
        animation: 150,
        draggable: '.song-item',
        delay: 200,
        delayOnTouchOnly: true,
        forceFallback: true,
        fallbackClass: 'sortable-drag',
        disabled: state.viewMode
    });

    setlistSortable = new Sortable(els.setlist, {
        group: 'shared',
        animation: 150,
        draggable: '.song-item',
        delay: 200,
        delayOnTouchOnly: true,
        forceFallback: true,
        fallbackClass: 'sortable-drag',
        disabled: state.viewMode,
        onAdd: (evt) => {
            if (state.viewMode) return;
            const data = JSON.parse(evt.item.dataset.json);
            evt.item.replaceWith(createSongElement(data, true));
            setTimeout(() => {
                const items = els.setlist.querySelectorAll('.song-item');
                state.setlist = Array.from(items).map(el => JSON.parse(el.dataset.json));
                renderSetlist();
                refreshLibrary();
                markAsChanged();
            }, 10);
        },
        onUpdate: () => {
            if (state.viewMode) return;
            setTimeout(() => {
                const items = els.setlist.querySelectorAll('.song-item');
                state.setlist = Array.from(items).map(el => JSON.parse(el.dataset.json));
                renderSetlist();
                markAsChanged();
            }, 10);
        }
    });
}

// --- AUTH UI ---

function setupAuthUI() {
    const loginModal = document.getElementById('login-modal');
    const googleSignInBtn = document.getElementById('google-sign-in-btn');
    const loginError = document.getElementById('login-error');
    const userInfo = document.getElementById('user-info');
    const userEmail = document.getElementById('user-email');
    const signOutBtn = document.getElementById('sign-out-btn');

    if (googleSignInBtn) {
        googleSignInBtn.addEventListener('click', async () => {
            googleSignInBtn.disabled = true;
            googleSignInBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
            loginError.classList.add('hidden');

            try {
                await window.FirebaseAuth.loginWithGoogle();
                loginModal.classList.remove('active');
            } catch (error) {
                console.error('Login error:', error);
                loginError.textContent = error.message || 'Sign in failed';
                loginError.classList.remove('hidden');
            } finally {
                googleSignInBtn.disabled = false;
                googleSignInBtn.innerHTML = `
                    <svg class="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Sign in with Google
                `;
            }
        });
    }

    if (signOutBtn) {
        signOutBtn.addEventListener('click', async () => {
            try {
                await window.FirebaseAuth.logout();
                document.getElementById('settings-modal').classList.remove('active');
            } catch (error) {
                console.error('Sign out error:', error);
            }
        });
    }

    window.FirebaseAuth.onAuthChange((user) => {
        const authLoading = document.getElementById('auth-loading');
        if (authLoading) {
            authLoading.classList.add('fade-out');
            setTimeout(() => { authLoading.style.display = 'none'; }, 300);
        }

        if (!user) {
            setTimeout(() => { loginModal.classList.add('active'); }, 300);
            userInfo.classList.add('hidden');
            signOutBtn.classList.add('hidden');
        } else {
            loginModal.classList.remove('active');
            userInfo.classList.remove('hidden');
            signOutBtn.classList.remove('hidden');
            userEmail.textContent = user.email;
        }
        updateUI();
    });
}

// --- INITIALIZATION ---

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize DOM references
    els = {
        library: document.getElementById('library-list'),
        files: document.getElementById('file-list-sidebar'),
        setlist: document.getElementById('setlist-area'),
        emptyState: document.getElementById('empty-state'),
        currentFilename: document.getElementById('current-filename'),
        stats: document.getElementById('setlist-stats'),
        folderPath: document.getElementById('folder-path-display'),
        panels: {
            library: document.getElementById('panel-library'),
            setlist: document.getElementById('panel-setlist')
        },
        tabs: {
            library: document.getElementById('tab-library'),
            setlist: document.getElementById('tab-setlist')
        },
        sidebarTabs: {
            files: document.getElementById('tab-side-files'),
            library: document.getElementById('tab-side-library')
        },
        sidebarViews: {
            files: document.getElementById('view-files'),
            library: document.getElementById('view-library')
        }
    };

    loadConfig();
    setupAuthUI();

    // Load songs from Firebase
    await loadSongsFromFirebase();

    updateUI();
    updateAbleSetLink();
    setupDragAndDrop();

    // Search input handler
    const searchInput = document.getElementById('search');
    if (searchInput) {
        searchInput.addEventListener('input', () => renderLibrary());
    }

    // Close toolbar menu when clicking outside
    document.addEventListener('click', (e) => {
        const menu = document.getElementById('toolbar-menu');
        const toggle = document.getElementById('toolbar-menu-toggle');
        if (menu && toggle && !menu.contains(e.target) && !toggle.contains(e.target)) {
            menu.classList.add('hidden');
        }
    });

    // Warn before leaving with unsaved changes
    window.addEventListener('beforeunload', (e) => {
        if (state.hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            return e.returnValue;
        }
    });

    // Handle URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const setlistParam = urlParams.get('setlist') || urlParams.get('file'); // Support legacy 'file' param
    const editParam = urlParams.get('edit');

    if (editParam === 'true' || editParam === '1') {
        toggleViewMode();
    }

    if (setlistParam) {
        await refreshFileList(true);
        // Find file by ID now
        const fileObj = state.fileList.find(f => f.id === setlistParam);
        if (fileObj) {
            await loadRemoteFile(fileObj);
            switchSidebarTab('library');
        } else {
            alert(`Setlist not found.`);
            switchSidebarTab('files');
        }
    } else {
        await refreshFileList();
        switchSidebarTab('files');
    }
});