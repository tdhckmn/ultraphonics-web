// ============= SONG MANAGER =============
// Song Library with lyric rendering, chord transposition, and Stage Mode

// ---- State ----
let songs = [];
let selectedSongId = null;
let hasUnsavedChanges = false;
let isAuthenticated = false;
let isGuitarMode = false;

// ---- Constants ----
const SECTION_KEYWORDS = [
    'intro', 'verse', 'chorus', 'bridge', 'outro',
    'pre-chorus', 'prechorus', 'hook', 'interlude', 'solo',
    'coda', 'tag', 'breakdown', 'instrumental', 'vamp', 'outro/vamp'
];

const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_TO_SHARP = { 'Db': 'C#', 'Eb': 'D#', 'Fb': 'E', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#', 'Cb': 'B' };
const SHARP_TO_FLAT = { 'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb' };

const KEY_OPTIONS = [
    'C', 'Cm', 'C#', 'C#m', 'Db', 'Dbm',
    'D', 'Dm', 'D#', 'D#m', 'Eb', 'Ebm',
    'E', 'Em', 'F', 'Fm', 'F#', 'F#m',
    'Gb', 'Gbm', 'G', 'Gm', 'G#', 'G#m',
    'Ab', 'Abm', 'A', 'Am', 'A#', 'A#m',
    'Bb', 'Bbm', 'B', 'Bm'
];

// Musical key heuristic — matches keys like "Eb", "F#m", "Bbm", "G"
const MUSICAL_KEYS = [
    'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
    'Cm', 'C#m', 'Dbm', 'Dm', 'D#m', 'Ebm', 'Em', 'Fm', 'F#m', 'Gbm', 'Gm', 'G#m', 'Abm', 'Am', 'A#m', 'Bbm', 'Bm'
];

// ---- Ableset Import: Name Parser ----

function isMusicalKey(token) {
    return MUSICAL_KEYS.includes(token.trim());
}

function parseSongName(nameString) {
    const tokens = nameString.split(' - ').map(t => t.trim());

    const result = {
        title: tokens[0] || nameString,
        artist: '',
        key: '',
        tags: [],
        meta: { isDrop: false, capo: 0, isEflat: false } // Added isEflat here
    };

    if (tokens.length <= 1) return result;

    // Check last token for musical key
    const lastToken = tokens[tokens.length - 1];
    if (isMusicalKey(lastToken)) {
        result.key = lastToken;
        tokens.pop();
    }

    // Process remaining tokens (skip first which is the title)
    const middleTokens = tokens.slice(1);
    const artistTokens = [];

    for (const token of middleTokens) {
        const lower = token.toLowerCase();
        if (lower.includes('drop')) {
            result.meta.isDrop = true;
            result.tags.push('Drop');
        } else if (lower.includes('capo')) {
            const capoMatch = token.match(/capo\s*(\d+)/i);
            result.meta.capo = capoMatch ? parseInt(capoMatch[1]) : 0;
            result.tags.push('Capo');
        } else if (lower.includes('eb')) { // Added check for eflat
            result.meta.isEflat = true;
            result.tags.push('Eb');
        } else {
            artistTokens.push(token);
        }
    }

    result.artist = artistTokens.join(', ');
    if (result.key) result.tags.unshift(result.key);

    return result;
}

// ---- Ableset Import: Diff Engine ----

function compareSongLists(importList, dbSongs) {
    const dbMap = new Map(dbSongs.map(s => [s.id, s]));
    const importMap = new Map(importList.map(s => [s.id, s]));

    const toCreate = [];
    const toUpdate = [];
    const toArchive = [];

    // Check imported songs against DB
    for (const imported of importList) {
        const existing = dbMap.get(imported.id);
        if (!existing) {
            toCreate.push(imported);
        } else {
            // Compare Ableset-sourced metadata
            const nameChanged = existing.originalName !== imported.lastKnownName;
            const timeChanged = existing.duration !== imported.time;
            if (nameChanged || timeChanged) {
                toUpdate.push({ existing, imported });
            }
        }
    }

    // Only archive songs that were previously imported from Ableset (have originalName)
    for (const dbSong of dbSongs) {
        if (!importMap.has(dbSong.id) && dbSong.active !== false && dbSong.originalName) {
            toArchive.push(dbSong);
        }
    }

    return { toCreate, toUpdate, toArchive };
}

// ---- Ableset Import: Pending diff state ----
let pendingDiff = null;

// ---- Chord Transposition Engine ----

function normalizeRoot(root) {
    if (FLAT_TO_SHARP[root]) return FLAT_TO_SHARP[root];
    return root;
}

function parseChord(chord) {
    const match = chord.match(/^([A-G][#b]?)(.*)/);
    if (!match) return null;
    return { root: match[1], suffix: match[2] };
}

function transposeChord(chord, semitones) {
    const parsed = parseChord(chord);
    if (!parsed) return chord;

    const normalizedRoot = normalizeRoot(parsed.root);
    const index = CHROMATIC.indexOf(normalizedRoot);
    if (index === -1) return chord;

    const newIndex = ((index + semitones) % 12 + 12) % 12;
    const newRoot = CHROMATIC[newIndex];

    // Prefer flats if the original chord used a flat
    const usedFlat = parsed.root.includes('b');
    const displayRoot = usedFlat && SHARP_TO_FLAT[newRoot] ? SHARP_TO_FLAT[newRoot] : newRoot;

    return displayRoot + parsed.suffix;
}

function getSongCapo(song) {
    return song.capo ?? song.settings?.capo ?? 0;
}

function getSongEflat(song) {
    return song.eflat ?? false;
}

function getSongDropD(song) { // Added for Drop D
    return song.dropD ?? false;
}

function getCapoOffset(song) {
    const capo = getSongCapo(song);
    if (isGuitarMode && capo !== 0) return -capo;
    return 0;
}

// ---- Lyric Parser ----

function isSectionKeyword(text) {
    // Match "Intro", "Verse 1", "Chorus 2", "Pre-Chorus", etc.
    const normalized = text.trim().toLowerCase();
    return SECTION_KEYWORDS.some(kw => {
        if (normalized === kw) return true;
        // Handle numbered sections like "Verse 1", "Chorus 2"
        if (normalized.startsWith(kw) && /^\s*\d*$/.test(normalized.slice(kw.length))) return true;
        return false;
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function parseLyrics(rawText, capoOffset) {
    if (!rawText) return { html: '<p class="text-stone-500 italic">No lyrics added yet.</p>', sections: [], footnotes: [] };

    const sections = [];
    const footnotes = [];

    // Process line by line to preserve structure
    const lines = rawText.split('\n');
    const htmlLines = lines.map(line => {
        let processed = escapeHtml(line);

        // 1. Extract [[Footnotes]] → superscript markers
        processed = processed.replace(/\[\[(.*?)\]\]/g, (match, content) => {
            footnotes.push(content);
            const index = footnotes.length;
            return `<sup class="footnote-marker" data-index="${index}" onclick="scrollToFootnotes()" title="${content}">${index}</sup>`;
        });

        // 2. Convert **Harmonies** → clickable spans
        processed = processed.replace(/\*\*(.*?)\*\*/g, (match, content) => {
            return `<span class="harmony-section" onclick="openChartPDF()">#${content}</span>`;
        });

        // 3. Parse [Brackets] — section anchors vs chords (above text)
        const segments = processed.split(/(\[[^\]]+\])/g);
        let result = '';
        for (let i = 0; i < segments.length; i++) {
            const seg = segments[i];
            const bracketMatch = seg.match(/^\[([^\]]+)\]$/);
            if (bracketMatch) {
                const content = bracketMatch[1];
                if (isSectionKeyword(content)) {
                    const sectionId = 'section-' + content.toLowerCase().replace(/\s+/g, '-');
                    sections.push({ name: content, id: sectionId });
                    result += `</div><div class="section-anchor" id="${sectionId}">${content}</div><div class="lyric-line">`;
                } else {
                    // Chord — pair with following text segment
                    const transposed = capoOffset !== 0 ? transposeChord(content, capoOffset) : content;
                    const next = i + 1 < segments.length ? segments[i + 1] : '';
                    const isBracket = next.match(/^\[/);
                    const followingText = (!isBracket && next) ? next : '';
                    if (followingText) i++; // consume the text segment
                    result += `<span class="cw"><span class="cn">${transposed}</span>${followingText}</span>`;
                }
            } else {
                // Plain text (no chord above)
                result += seg;
            }
        }
        processed = result;

        return processed;
    });

    // Wrap in lyric-line divs and clean up empty wrappers
    let html = '<div class="lyric-line">' + htmlLines.join('\n') + '</div>';
    // Clean up empty lyric-line wrappers created by section anchor insertion
    html = html.replace(/<div class="lyric-line"><\/div>/g, '');
    html = html.replace(/\n/g, '<br>');

    return { html, sections, footnotes };
}

// ---- UUID ----
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// ---- Data Loading ----

async function loadSongs() {
    try {
        songs = await FirestoreService.getSongs();
        renderSongsList();

        // Check for song parameter in URL
        const urlParams = new URLSearchParams(window.location.search);
        const songId = urlParams.get('song');
        if (songId) {
            selectSong(songId);
            if (urlParams.get('stage') === 'true') {
                setTimeout(() => enterStageMode(), 100);
            }
        }
    } catch (error) {
        console.error('Error loading songs:', error);
        songs = [];
        renderSongsList();
    }
}

// ---- Song List Rendering ----

function renderSongsList(filter = '') {
    const container = document.getElementById('songs-list-container');

    const filtered = songs.filter(song => {
        const title = song.title || song.name || '';
        const artist = song.artist || '';
        const genre = song.genre || '';
        const searchText = `${title} ${artist} ${genre}`.toLowerCase();
        return searchText.includes(filter.toLowerCase());
    });

    // Sort: active first, then archived, alphabetical within each group
    filtered.sort((a, b) => {
        const aArchived = a.active === false;
        const bArchived = b.active === false;
        if (aArchived !== bArchived) return aArchived ? 1 : -1;
        const titleA = (a.title || a.name || '').toLowerCase();
        const titleB = (b.title || b.name || '').toLowerCase();
        return titleA.localeCompare(titleB);
    });

    container.innerHTML = filtered.map(song => {
        const title = song.title || song.name || 'Untitled';
        const artist = song.artist || '';
        const isSelected = selectedSongId === song.id;
        const isArchived = song.active === false;
        const key = song.settings?.originalKey || song.key;
        const capo = getSongCapo(song);
        const eflat = getSongEflat(song);
        const dropD = getSongDropD(song); // Get Drop D status

        const keyBadge = key
            ? `<span class="text-xs bg-green-900/50 text-green-400 px-2 py-0.5 rounded font-mono">${key}</span>`
            : '';
        const tuningBadges = `
            ${eflat ? '<span class="tuning-badge eb-tuning">Eb</span>' : ''}
            ${dropD ? '<span class="tuning-badge drop-d">Drop D</span>' : ''}
        `;
        const capoBadge = capo > 0
            ? `<span class="text-xs bg-amber-900/50 text-amber-400 px-2 py-0.5 rounded">Capo ${capo}</span>`
            : '';
        const archivedBadge = isArchived
            ? '<span class="text-xs bg-red-900/50 text-red-400 px-2 py-0.5 rounded">Archived</span>'
            : '';

        return `
            <div class="song-item p-4 border-b border-stone-800 ${isSelected ? 'selected' : ''} ${isArchived ? 'opacity-50' : ''}" data-song-id="${song.id}">
                <div class="flex items-center justify-between gap-2">
                    <div class="flex-1 min-w-0">
                        <div class="font-bold text-white truncate">${escapeHtml(title)}</div>
                        ${artist ? `<div class="text-sm text-stone-400 truncate">${escapeHtml(artist)}</div>` : ''}
                    </div>
                    <div class="flex items-center gap-1 flex-shrink-0">
                        ${archivedBadge}
                        ${tuningBadges}
                        ${capoBadge}
                        ${keyBadge}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('songs-counter').textContent = `${filtered.length} song${filtered.length !== 1 ? 's' : ''}`;

    document.querySelectorAll('.song-item').forEach(item => {
        item.addEventListener('click', () => selectSong(item.dataset.songId));
    });
}

// ---- Song Selection ----

function selectSong(songId) {
    if (hasUnsavedChanges && selectedSongId !== songId) {
        if (!confirm('You have unsaved changes. Discard and select a different song?')) return;
        hasUnavedChanges = false;
    }

    selectedSongId = songId;

    const url = new URL(window.location);
    url.searchParams.set('song', songId);
    window.history.pushState({}, '', url);

    renderSongsList(document.getElementById('search-songs').value);
    showViewMode();

    if (window.innerWidth < 1024) {
        document.getElementById('songs-list').classList.add('hidden-mobile');
        document.getElementById('song-panel').classList.add('active-mobile');
    }
}

// ---- View Mode ----

function showViewMode() {
    const song = songs.find(s => s.id === selectedSongId);
    if (!song) return;

    document.getElementById('empty-state').classList.add('hidden');
    document.getElementById('song-view').classList.remove('hidden');
    document.getElementById('song-edit').classList.add('hidden');

    const title = song.title || song.name || 'Untitled';
    const artist = song.artist || '';
    const capo = getSongCapo(song);
    const eflat = getSongEflat(song);
    const dropD = getSongDropD(song); // Get Drop D status
    const originalKey = song.settings?.originalKey || song.key || '';
    const genre = song.genre || '';

    // If no capo, force concert mode
    if (capo === 0) isGuitarMode = false;

    document.getElementById('song-title-area').innerHTML = `
        <h2 class="text-xl md:text-2xl font-bold text-white truncate">${escapeHtml(title)}</h2>
        ${artist ? `<p class="text-sm text-stone-400">${escapeHtml(artist)}</p>` : ''}
    `;

    // Show/hide chart PDF button
    const chartBtn = document.getElementById('chart-pdf-btn');
    if (song.chartUrl) {
        chartBtn.classList.remove('hidden');
    } else {
        chartBtn.classList.add('hidden');
    }

    // Update pitch toggle label and disabled state
    const pitchBtn = document.getElementById('pitch-toggle-btn');
    const pitchLabel = document.getElementById('pitch-label');
    if (capo === 0) {
        pitchLabel.textContent = 'Concert';
        pitchBtn.classList.add('opacity-50', 'cursor-not-allowed');
        pitchBtn.disabled = true;
    } else {
        pitchLabel.textContent = isGuitarMode ? `Capo (Fret ${capo})` : 'Concert';
        pitchBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        pitchBtn.disabled = false;
    }

    const capoOffset = getCapoOffset(song);
    const { html, sections, footnotes } = parseLyrics(song.lyrics || '', capoOffset);

    const displayKey = isGuitarMode && capo ? transposeChord(originalKey, -capo) : originalKey;
    const tuningLabel = [];
    if (eflat) tuningLabel.push('Eb (Half-step down)');
    if (dropD) tuningLabel.push('Drop D');
    if (tuningLabel.length === 0) tuningLabel.push('Standard');

    const tuningColor = (eflat || dropD) ? 'text-green-400' : 'text-white';
    const modeLabel = capo > 0 ? (isGuitarMode ? `Capo (Fret ${capo})` : 'Concert') : 'Concert';

    document.getElementById('song-details').innerHTML = `
        <!-- Metadata -->
        <div class="bg-stone-800/50 rounded-lg p-4 mb-4">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                    <label class="text-xs text-stone-500 uppercase tracking-wide">Key</label>
                    <div class="text-white font-semibold mt-0.5">${displayKey || 'N/A'}</div>
                </div>
                <div>
                    <label class="text-xs text-stone-500 uppercase tracking-wide">Capo</label>
                    <div class="text-white font-semibold mt-0.5">${capo || 'None'}</div>
                </div>
                <div>
                    <label class="text-xs text-stone-500 uppercase tracking-wide">Tuning</label>
                    <div class="${tuningColor} font-semibold mt-0.5">${tuningLabel.join(', ')}</div>
                </div>
                <div>
                    <label class="text-xs text-stone-500 uppercase tracking-wide">Mode</label>
                    <div class="text-accent-green font-semibold mt-0.5">${modeLabel}</div>
                </div>
            </div>
        </div>

        <!-- Rendered Lyrics -->
        <div class="bg-stone-800/50 rounded-lg p-4 md:p-6 mb-4">
            <div style="line-height: 2.2; font-size: 1rem;">
                ${html}
            </div>
        </div>

        <!-- Footnotes -->
        ${footnotes.length > 0 ? `
        <div id="footnotes-section" class="bg-stone-800/50 rounded-lg p-4 mb-4">
            <h3 class="text-xs text-stone-500 uppercase tracking-wide font-bold mb-2">Performance Notes</h3>
            <ol class="list-decimal list-inside space-y-1">
                ${footnotes.map((note, i) => `<li class="text-stone-300 text-sm"><span class="text-accent-green font-semibold">${i + 1}.</span> ${escapeHtml(note)}</li>`).join('')}
            </ol>
        </div>
        ` : ''}

        <!-- Song Notes -->
        ${song.notes ? `
        <div class="bg-stone-800/50 rounded-lg p-4">
            <h3 class="text-xs text-stone-500 uppercase tracking-wide font-bold mb-2">Notes</h3>
            <div class="text-stone-300 text-sm whitespace-pre-wrap">${escapeHtml(typeof song.notes === 'string' ? song.notes : song.notes.join('\n'))}</div>
        </div>
        ` : ''}
    `;
}

// ---- Edit Mode ----

function showEditMode() {
    const song = songs.find(s => s.id === selectedSongId);
    if (!song) return;

    document.getElementById('song-view').classList.add('hidden');
    document.getElementById('song-edit').classList.remove('hidden');

    const title = song.title || song.name || '';
    const capo = getSongCapo(song);
    const eflat = getSongEflat(song);
    const dropD = getSongDropD(song); // Get Drop D status
    const originalKey = song.settings?.originalKey || song.key || '';
    const displayKey = capo ? transposeChord(originalKey, -capo) : originalKey;
    const notes = song.notes ? (typeof song.notes === 'string' ? song.notes : song.notes.join('\n')) : '';

    document.getElementById('song-form').innerHTML = `
        <div class="space-y-4 max-w-2xl">
            <div>
                <label class="block text-sm font-semibold text-stone-300 mb-2">Title</label>
                <input type="text" id="edit-title" value="${escapeHtml(title)}" class="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-lg text-white focus:outline-none focus:border-accent-green">
            </div>
            <div>
                <label class="block text-sm font-semibold text-stone-300 mb-2">Artist / Original By</label>
                <input type="text" id="edit-artist" value="${escapeHtml(song.artist || '')}" class="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-lg text-white focus:outline-none focus:border-accent-green">
            </div>
            <div>
                <label class="block text-sm font-semibold text-stone-300 mb-2">Genre</label>
                <input type="text" id="edit-genre" value="${escapeHtml(song.genre || '')}" class="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-lg text-white focus:outline-none focus:border-accent-green">
            </div>
            <div class="grid grid-cols-3 gap-4">
                <div>
                    <label class="block text-sm font-semibold text-stone-300 mb-2">Original Key</label>
                    <select id="edit-original-key" class="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-lg text-white focus:outline-none focus:border-accent-green">
                        <option value="">None</option>
                        ${KEY_OPTIONS.map(k => `<option value="${k}" ${originalKey === k ? 'selected' : ''}>${k}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-semibold text-stone-300 mb-2">Capo</label>
                    <input type="number" id="edit-capo" value="${capo}" min="0" max="12" class="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-lg text-white focus:outline-none focus:border-accent-green">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-stone-300 mb-2">Display Key</label>
                    <input type="text" id="edit-display-key" value="${displayKey}" readonly class="w-full px-4 py-3 bg-stone-700 border border-stone-600 rounded-lg text-stone-400 cursor-not-allowed">
                </div>
            </div>
            <div>
                <label class="flex items-center gap-3 cursor-pointer mt-2">
                    <input type="checkbox" id="edit-eflat" ${eflat ? 'checked' : ''} class="w-5 h-5 text-accent-green bg-stone-800 border-stone-700 rounded focus:ring-green-500 focus:ring-2 cursor-pointer">
                    <span class="text-sm font-semibold text-stone-300">Eb Tuning <span class="text-stone-500 font-normal">(Half-step down / Drop tuner pedal)</span></span>
                </label>
            </div>
            <div>
                <label class="flex items-center gap-3 cursor-pointer mt-2">
                    <input type="checkbox" id="edit-dropd" ${dropD ? 'checked' : ''} class="w-5 h-5 text-indigo-500 bg-stone-800 border-stone-700 rounded focus:ring-indigo-500 focus:ring-2 cursor-pointer">
                    <span class="text-sm font-semibold text-stone-300">Drop D Tuning</span>
                </label>
            </div>
            <div>
                <label class="block text-sm font-semibold text-stone-300 mb-2">Chart URL (PDF link)</label>
                <input type="url" id="edit-chart-url" value="${escapeHtml(song.chartUrl || '')}" class="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-lg text-white focus:outline-none focus:border-accent-green" placeholder="https://...">
            </div>
            <div>
                <label class="block text-sm font-semibold text-stone-300 mb-2">Lyrics</label>
                <p class="text-xs text-stone-500 mb-2">Use <code class="bg-stone-700 px-1 rounded">[Chord]</code> for chords, <code class="bg-stone-700 px-1 rounded">[Intro]</code>/<code class="bg-stone-700 px-1 rounded">[Verse]</code>/<code class="bg-stone-700 px-1 rounded">[Chorus]</code> for sections, <code class="bg-stone-700 px-1 rounded">**Bold**</code> for harmonies, <code class="bg-stone-700 px-1 rounded">[[Note]]</code> for footnotes.</p>
                <textarea id="edit-lyrics" rows="20" class="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-lg text-white focus:outline-none focus:border-accent-green font-mono text-sm resize-y" placeholder="[Intro]&#10;[G]I found a [Em]love for me...">${escapeHtml(song.lyrics || '')}</textarea>
            </div>
            <div>
                <label class="block text-sm font-semibold text-stone-300 mb-2">Performance Notes</label>
                <textarea id="edit-notes" rows="4" class="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-lg text-white focus:outline-none focus:border-accent-green resize-y" placeholder="General notes for the band...">${escapeHtml(notes)}</textarea>
            </div>
            <div>
                <label class="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" id="edit-show-on-website" ${song.showOnWebsite ? 'checked' : ''} class="w-5 h-5 text-accent-green bg-stone-800 border-stone-700 rounded focus:ring-green-500 focus:ring-2 cursor-pointer">
                    <span class="text-sm font-semibold text-stone-300">Show on Public Website</span>
                </label>
            </div>
        </div>
    `;

    // Auto-calculate display key
    const keySelect = document.getElementById('edit-original-key');
    const capoInput = document.getElementById('edit-capo');
    const displayKeyInput = document.getElementById('edit-display-key');

    function updateDisplayKey() {
        const key = keySelect.value;
        const c = parseInt(capoInput.value) || 0;
        displayKeyInput.value = key && c ? transposeChord(key, -c) : key || '';
    }

    keySelect.addEventListener('change', updateDisplayKey);
    capoInput.addEventListener('input', updateDisplayKey);

    // Track unsaved changes
    document.getElementById('song-form').querySelectorAll('input, select, textarea').forEach(el => {
        el.addEventListener('input', () => { hasUnsavedChanges = true; });
        el.addEventListener('change', () => { hasUnsavedChanges = true; });
    });
}

// ---- Save Song ----

async function saveSong() {
    if (!isAuthenticated) {
        alert('Please sign in to save changes.');
        return;
    }

    const isNew = !songs.find(s => s.id === selectedSongId);
    const capo = parseInt(document.getElementById('edit-capo').value) || 0;
    const originalKey = document.getElementById('edit-original-key').value;
    const title = document.getElementById('edit-title').value.trim();

    if (!title) {
        alert('Title is required.');
        return;
    }

    const eflat = document.getElementById('edit-eflat').checked;
    const dropD = document.getElementById('edit-dropd').checked; // Get Drop D value

    const songData = {
        id: selectedSongId,
        title: title,
        artist: document.getElementById('edit-artist').value.trim(),
        genre: document.getElementById('edit-genre').value.trim(),
        lyrics: document.getElementById('edit-lyrics').value,
        chartUrl: document.getElementById('edit-chart-url').value.trim(),
        notes: document.getElementById('edit-notes').value.trim(),
        showOnWebsite: document.getElementById('edit-show-on-website').checked,
        capo: capo,
        eflat: eflat,
        dropD: dropD, // Save Drop D status
        settings: {
            capo: capo,
            originalKey: originalKey,
            displayKey: capo && originalKey ? transposeChord(originalKey, -capo) : originalKey
        }
    };

    // Clean empty optional fields
    if (!songData.artist) delete songData.artist;
    if (!songData.genre) delete songData.genre;
    if (!songData.chartUrl) delete songData.chartUrl;
    if (!songData.notes) delete songData.notes;
    if (!songData.lyrics) delete songData.lyrics;

    const saveBtn = document.getElementById('save-edit-btn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

    try {
        await FirestoreService.saveSong(songData);
        hasUnsavedChanges = false;

        // Refresh song list
        songs = await FirestoreService.getSongs();
        renderSongsList(document.getElementById('search-songs').value);

        saveBtn.innerHTML = '<i class="fa-solid fa-check"></i> Saved!';
        setTimeout(() => {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fa-solid fa-check text-sm"></i><span class="hidden md:inline text-sm font-semibold">Save</span>';
        }, 1500);

        showViewMode();
    } catch (error) {
        console.error('Error saving song:', error);
        alert(`Failed to save: ${error.message}`);
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fa-solid fa-check text-sm"></i><span class="hidden md:inline text-sm font-semibold">Save</span>';
    }
}

// ---- Delete Song ----

async function deleteSong() {
    if (!confirm('Are you sure you want to delete this song?')) return;

    if (!isAuthenticated) {
        alert('Please sign in to delete songs.');
        return;
    }

    try {
        await FirestoreService.deleteSong(selectedSongId);
        songs = songs.filter(s => s.id !== selectedSongId);
        selectedSongId = null;

        const url = new URL(window.location);
        url.searchParams.delete('song');
        window.history.pushState({}, '', url);

        renderSongsList();

        document.getElementById('song-view').classList.add('hidden');
        document.getElementById('song-edit').classList.add('hidden');
        document.getElementById('empty-state').classList.remove('hidden');

        backToList();
    } catch (error) {
        console.error('Error deleting song:', error);
        alert(`Failed to delete: ${error.message}`);
    }
}

// ---- Add New Song ----

function addNewSong() {
    const newId = generateUUID();
    const newSong = {
        id: newId,
        title: 'New Song',
        lyrics: '',
        capo: 0,
        eflat: false,
        dropD: false, // Default for new songs
        settings: { capo: 0, originalKey: '', displayKey: '' }
    };

    songs.unshift(newSong);
    selectedSongId = newId;
    renderSongsList();
    showEditMode();
    hasUnsavedChanges = true;

    if (window.innerWidth < 1024) {
        document.getElementById('songs-list').classList.add('hidden-mobile');
        document.getElementById('song-panel').classList.add('active-mobile');
    }
}

// ---- PDF ----

function openChartPDF() {
    const song = songs.find(s => s.id === selectedSongId);
    if (!song || !song.chartUrl) {
        alert('No chart PDF link available for this song.');
        return;
    }
    window.open(song.chartUrl, '_blank', 'noopener,noreferrer');
}
window.openChartPDF = openChartPDF;

// ---- Footnotes ----

function scrollToFootnotes() {
    const el = document.getElementById('footnotes-section');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
window.scrollToFootnotes = scrollToFootnotes;

// ---- Stage Mode ----

let stageState = {
    fontSize: 20,
    isGuitarMode: false,
    theme: 'dark'
};

function enterStageMode() {
    const song = songs.find(s => s.id === selectedSongId);
    if (!song) return;

    const capo = getSongCapo(song);
    // If no capo, force concert mode
    if (capo === 0) {
        stageState.isGuitarMode = false;
        isGuitarMode = false;
    } else {
        stageState.isGuitarMode = isGuitarMode;
    }

    // Disable/enable stage pitch toggle based on capo
    const stagePitchBtn = document.getElementById('stage-pitch-toggle');
    if (capo === 0) {
        stagePitchBtn.classList.add('opacity-50', 'cursor-not-allowed');
        stagePitchBtn.disabled = true;
    } else {
        stagePitchBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        stagePitchBtn.disabled = false;
    }

    renderStageLyrics(song);

    const stageEl = document.getElementById('stage-mode');
    stageEl.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Apply current state
    document.getElementById('font-size-slider').value = stageState.fontSize;
    document.getElementById('stage-lyrics').style.fontSize = stageState.fontSize + 'px';
    updateStagePitchLabel();
    updateStageThemeLabel();
}

function exitStageMode() {
    document.getElementById('stage-mode').classList.add('hidden');
    document.getElementById('stage-mode').classList.remove('stage-light');
    document.body.style.overflow = '';
}

function renderStageLyrics(song) {
    const capo = getSongCapo(song);
    const offset = stageState.isGuitarMode && capo ? -capo : 0;
    const { html, sections, footnotes } = parseLyrics(song.lyrics || '', offset);

    document.getElementById('stage-lyrics').innerHTML = html;

    // Build section nav
    const nav = document.getElementById('stage-section-nav');
    if (sections.length > 0) {
        nav.classList.remove('hidden');
        nav.innerHTML = sections.map(s =>
            `<button class="stage-section-btn px-3 py-1.5 bg-stone-800 text-stone-300 rounded-lg text-sm font-semibold hover:bg-green-900 hover:text-green-400 transition-colors whitespace-nowrap flex-shrink-0" onclick="window.scrollToSection('${s.id}')">${s.name}</button>`
        ).join('');
    } else {
        nav.classList.add('hidden');
        nav.innerHTML = '';
    }
}

function updateStagePitchLabel() {
    const song = songs.find(s => s.id === selectedSongId);
    const capo = song ? getSongCapo(song) : 0;
    const label = stageState.isGuitarMode && capo > 0 ? `Capo (${capo})` : 'Concert';
    document.getElementById('stage-pitch-label').textContent = label;
}

function updateStageThemeLabel() {
    const stageEl = document.getElementById('stage-mode');
    const icon = document.getElementById('stage-theme-icon');
    const label = document.getElementById('stage-theme-label');

    if (stageState.theme === 'light') {
        stageEl.classList.add('stage-light');
        icon.className = 'fa-solid fa-sun';
        label.textContent = 'Light';
    } else {
        stageEl.classList.remove('stage-light');
        icon.className = 'fa-solid fa-moon';
        label.textContent = 'Dark';
    }
}

// Exposed globally for future Ableset WebSocket integration
window.scrollToSection = function(sectionId) {
    const el = document.getElementById(sectionId);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

// Expose for future external control
window.enterStageMode = enterStageMode;
window.exitStageMode = exitStageMode;

// ---- Ableset Import: File Handling ----

function handleFileImport(file) {
    if (!file) return;

    const validExts = ['.json', '.ableset'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!validExts.includes(ext)) {
        alert('Invalid file type. Please upload a .json or .ableset file.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            let parsed = JSON.parse(e.target.result);

            // Handle wrapped format (e.g., { songs: [...] })
            let importedSongs = parsed;
            if (!Array.isArray(parsed)) {
                if (parsed.songs && Array.isArray(parsed.songs)) {
                    importedSongs = parsed.songs;
                } else {
                    alert('Invalid file format. Expected a JSON array of songs.');
                    return;
                }
            }

            // Validate minimum fields
            const valid = importedSongs.every(s => s.id && s.lastKnownName !== undefined);
            if (!valid) {
                alert('Invalid Ableset format. Each song must have "id" and "lastKnownName" fields.');
                return;
            }

            // Run diff engine against current songs
            const diff = compareSongLists(importedSongs, songs);
            showImportModal(diff);
        } catch (err) {
            console.error('Failed to parse import file:', err);
            alert('Failed to parse file. Ensure it is valid JSON.');
        }
    };
    reader.readAsText(file);
}

function buildSongDocument(imported) {
    const parsed = parseSongName(imported.lastKnownName);
    return {
        id: imported.id,
        title: parsed.title,
        originalName: imported.lastKnownName,
        artist: parsed.artist,
        key: parsed.key,
        bpm: 0,
        duration: imported.time || 0,
        tags: parsed.tags,
        meta: parsed.meta,
        active: true,
        capo: parsed.meta.capo,
        eflat: parsed.meta.isEflat, // Set eflat from parsed meta
        dropD: parsed.meta.isDrop, // Set dropD from parsed meta
        // Populate settings for existing UI compatibility
        settings: {
            originalKey: parsed.key,
            capo: parsed.meta.capo,
            displayKey: parsed.meta.capo && parsed.key ? transposeChord(parsed.key, -parsed.meta.capo) : parsed.key
        }
    };
}

function showImportModal(diff) {
    pendingDiff = diff;
    const modal = document.getElementById('import-modal');
    const summary = document.getElementById('import-summary');

    const createDocs = diff.toCreate.map(s => buildSongDocument(s));
    const updateDocs = diff.toUpdate.map(u => {
        const parsed = parseSongName(u.imported.lastKnownName);
        return {
            id: u.imported.id,
            title: parsed.title,
            originalTitle: u.existing.title || u.existing.originalName,
            originalName: u.imported.lastKnownName,
            artist: parsed.artist,
            key: parsed.key,
            duration: u.imported.time || 0,
            tags: parsed.tags,
            meta: parsed.meta,
            capo: parsed.meta.capo,
            eflat: parsed.meta.isEflat, // Set eflat from parsed meta
            dropD: parsed.meta.isDrop, // Set dropD from parsed meta
            settings: {
                originalKey: parsed.key,
                capo: parsed.meta.capo,
                displayKey: parsed.meta.capo && parsed.key ? transposeChord(parsed.key, -parsed.meta.capo) : parsed.key
            }
        };
    });

    // Store processed data for executeSync
    pendingDiff.createDocs = createDocs;
    pendingDiff.updateDocs = updateDocs;

    const totalOps = diff.toCreate.length + diff.toUpdate.length + diff.toArchive.length;

    summary.innerHTML = `
        <!-- Stats -->
        <div class="grid grid-cols-3 gap-3 mb-5">
            <div class="bg-green-900/30 border border-green-700/50 rounded-lg p-3 text-center">
                <div class="text-2xl font-bold text-green-400">${diff.toCreate.length}</div>
                <div class="text-xs text-green-300 font-semibold uppercase mt-1">To Add</div>
            </div>
            <div class="bg-blue-900/30 border border-blue-700/50 rounded-lg p-3 text-center">
                <div class="text-2xl font-bold text-blue-400">${diff.toUpdate.length}</div>
                <div class="text-xs text-blue-300 font-semibold uppercase mt-1">To Update</div>
            </div>
            <div class="bg-red-900/30 border border-red-700/50 rounded-lg p-3 text-center">
                <div class="text-2xl font-bold text-red-400">${diff.toArchive.length}</div>
                <div class="text-xs text-red-300 font-semibold uppercase mt-1">To Archive</div>
            </div>
        </div>

        ${totalOps === 0 ? '<p class="text-stone-400 text-center py-4">Everything is already in sync. No changes needed.</p>' : ''}

        <!-- Create List -->
        ${diff.toCreate.length > 0 ? `
        <div class="mb-4">
            <h4 class="text-sm font-bold text-green-400 mb-2 flex items-center gap-2">
                <i class="fa-solid fa-plus-circle"></i> New Songs
            </h4>
            <div class="space-y-1 max-h-40 overflow-y-auto">
                ${createDocs.map(s => `
                    <div class="flex items-center justify-between px-3 py-2 bg-stone-800 rounded text-sm">
                        <span class="text-white truncate flex-1">${escapeHtml(s.title)}</span>
                        ${s.artist ? `<span class="text-stone-400 text-xs ml-2 truncate">${escapeHtml(s.artist)}</span>` : ''}
                        ${s.key ? `<span class="text-xs bg-green-900/50 text-green-400 px-2 py-0.5 rounded font-mono ml-2">${s.key}</span>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>` : ''}

        <!-- Update List -->
        ${diff.toUpdate.length > 0 ? `
        <div class="mb-4">
            <h4 class="text-sm font-bold text-blue-400 mb-2 flex items-center gap-2">
                <i class="fa-solid fa-pen-to-square"></i> Modified Songs
            </h4>
            <div class="space-y-1 max-h-40 overflow-y-auto">
                ${updateDocs.map(s => `
                    <div class="flex items-center justify-between px-3 py-2 bg-stone-800 rounded text-sm">
                        <span class="text-white truncate flex-1">${escapeHtml(s.title)}</span>
                        <span class="text-stone-500 text-xs ml-2">metadata changed</span>
                    </div>
                `).join('')}
            </div>
        </div>` : ''}

        <!-- Archive List -->
        ${diff.toArchive.length > 0 ? `
        <div class="mb-4">
            <h4 class="text-sm font-bold text-red-400 mb-2 flex items-center gap-2">
                <i class="fa-solid fa-box-archive"></i> Songs to Archive
            </h4>
            <div class="space-y-1 max-h-40 overflow-y-auto">
                ${diff.toArchive.map(s => `
                    <div class="flex items-center justify-between px-3 py-2 bg-stone-800 rounded text-sm">
                        <span class="text-white truncate flex-1">${escapeHtml(s.title || s.originalName || 'Untitled')}</span>
                        <span class="text-red-400 text-xs ml-2">will be archived</span>
                    </div>
                `).join('')}
            </div>
        </div>` : ''}

        <p class="text-stone-500 text-xs mt-3">
            <i class="fa-solid fa-info-circle mr-1"></i>
            Archived songs are not deleted — they are marked inactive and can be restored. Manually created songs are never archived.
        </p>
    `;

    // Disable confirm if nothing to do
    const confirmBtn = document.getElementById('confirm-sync-btn');
    confirmBtn.disabled = totalOps === 0;
    confirmBtn.classList.toggle('opacity-50', totalOps === 0);
    confirmBtn.classList.toggle('cursor-not-allowed', totalOps === 0);

    modal.classList.remove('hidden');
}

function closeImportModal() {
    document.getElementById('import-modal').classList.add('hidden');
    pendingDiff = null;
}

async function executeSync() {
    if (!pendingDiff || !isAuthenticated) return;

    const confirmBtn = document.getElementById('confirm-sync-btn');
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Syncing...';

    try {
        const creates = pendingDiff.createDocs || [];
        const updates = (pendingDiff.updateDocs || []).map(u => ({
            id: u.id,
            data: {
                title: u.title,
                originalName: u.originalName,
                artist: u.artist,
                key: u.key,
                duration: u.duration,
                tags: u.tags,
                meta: u.meta,
                capo: u.capo,
                eflat: u.eflat, // Include eflat in update
                dropD: u.dropD, // Include dropD in update
                settings: u.settings
            }
        }));
        const archives = (pendingDiff.toArchive || []).map(s => s.id);

        const count = await FirestoreService.syncSongsBatch(creates, updates, archives);

        // Refresh song list
        songs = await FirestoreService.getSongs();
        renderSongsList(document.getElementById('search-songs').value);

        closeImportModal();
        alert(`Sync complete. ${count} operation(s) executed.`);
    } catch (error) {
        console.error('Sync failed:', error);
        alert(`Sync failed: ${error.message}`);
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="fa-solid fa-sync"></i> Confirm Sync';
    }
}

// ---- Ableset Import: Drag & Drop ----

let dragCounter = 0;

function setupDragAndDrop() {
    const songsList = document.getElementById('songs-list');
    const dropOverlay = document.getElementById('drop-overlay');

    songsList.addEventListener('dragenter', (e) => {
        e.preventDefault();
        dragCounter++;
        if (dragCounter === 1) {
            dropOverlay.classList.remove('hidden');
        }
    });

    songsList.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    });

    songsList.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dragCounter--;
        if (dragCounter === 0) {
            dropOverlay.classList.add('hidden');
        }
    });

    songsList.addEventListener('drop', (e) => {
        e.preventDefault();
        dragCounter = 0;
        dropOverlay.classList.add('hidden');

        const file = e.dataTransfer.files[0];
        if (file) handleFileImport(file);
    });
}

// ---- Product Navigation ----
function setupProductNavigation() {
    const ablesetLaunchLink = document.getElementById('ableset-launch-link');
    if (ablesetLaunchLink) {
        // Retrieve AbleSet URL from local storage or use a default
        const storedAblesetUrl = localStorage.getItem('ableset_url') || 'http://192.168.1.243';
        ablesetLaunchLink.href = storedAblesetUrl;
        ablesetLaunchLink.target = '_blank';
        ablesetLaunchLink.rel = 'noopener noreferrer';
        // Add click event for analytics if needed
        ablesetLaunchLink.addEventListener('click', () => {
            console.log('Launching AbleSet:', storedAblesetUrl);
            // trackEvent('ableset_launch', { url: storedAblesetUrl });
        });
    }
}


// ---- Navigation ----

function backToList() {
    if (window.innerWidth < 1024) {
        document.getElementById('songs-list').classList.remove('hidden-mobile');
        document.getElementById('song-panel').classList.remove('active-mobile');
    }
}

function handleBackNavigation(e) {
    if (hasUnsavedChanges) {
        if (!confirm('You have unsaved changes. Are you sure you want to leave?')) {
            e.preventDefault();
            return false;
        }
    }
    return true;
}
window.handleBackNavigation = handleBackNavigation;

// ---- Settings Modal ----

function openSettingsModal() {
    const user = FirebaseAuth.getCurrentUser();
    if (user) document.getElementById('user-email').textContent = user.email;
    document.getElementById('settings-modal').classList.remove('hidden');
}

function closeSettingsModal() {
    document.getElementById('settings-modal').classList.add('hidden');
}

// ---- Auth ----

function showLoginForm() {
    const authLoading = document.getElementById('auth-loading');
    authLoading.classList.add('fade-out');
    setTimeout(() => { authLoading.style.display = 'none'; document.getElementById('login-modal').classList.remove('hidden'); }, 300);
}

function hideLoginModal() {
    const authLoading = document.getElementById('auth-loading');
    authLoading.classList.add('fade-out');
    setTimeout(() => { authLoading.style.display = 'none'; }, 300);
    document.getElementById('login-modal').classList.add('hidden');
}

// ---- Event Listeners ----

// Initial product navigation setup
setupProductNavigation();


// Search
document.getElementById('search-songs').addEventListener('input', (e) => {
    renderSongsList(e.target.value);
});

// Add song
document.getElementById('add-song-btn').addEventListener('click', addNewSong);

// Edit / Save / Cancel
document.getElementById('edit-btn').addEventListener('click', showEditMode);
document.getElementById('save-edit-btn').addEventListener('click', saveSong);
document.getElementById('cancel-edit-btn').addEventListener('click', () => {
    if (hasUnsavedChanges) {
        if (!confirm('You have unsaved changes. Discard?')) return;
        hasUnsavedChanges = false;
    }
    // If this was a new unsaved song, remove it
    const song = songs.find(s => s.id === selectedSongId);
    if (song && !song.updatedAt && song.title === 'New Song') {
        songs = songs.filter(s => s.id !== selectedSongId);
        selectedSongId = null;
        renderSongsList();
        document.getElementById('song-edit').classList.add('hidden');
        document.getElementById('empty-state').classList.remove('hidden');
        backToList();
        return;
    }
    showViewMode();
});

// Delete
document.getElementById('delete-btn').addEventListener('click', deleteSong);

// Pitch toggle (view mode)
document.getElementById('pitch-toggle-btn').addEventListener('click', () => {
    const song = songs.find(s => s.id === selectedSongId);
    if (!song || getSongCapo(song) === 0) return;
    isGuitarMode = !isGuitarMode;
    showViewMode();
});

// Chart PDF
document.getElementById('chart-pdf-btn').addEventListener('click', openChartPDF);

// Stage mode
document.getElementById('stage-mode-btn').addEventListener('click', enterStageMode);
document.getElementById('exit-stage-btn').addEventListener('click', exitStageMode);

// Stage font size
document.getElementById('font-size-slider').addEventListener('input', (e) => {
    stageState.fontSize = parseInt(e.target.value);
    document.getElementById('stage-lyrics').style.fontSize = stageState.fontSize + 'px';
});

// Stage pitch toggle
document.getElementById('stage-pitch-toggle').addEventListener('click', () => {
    const song = songs.find(s => s.id === selectedSongId);
    if (!song || getSongCapo(song) === 0) return;
    stageState.isGuitarMode = !stageState.isGuitarMode;
    isGuitarMode = stageState.isGuitarMode;
    updateStagePitchLabel();
    if (song) renderStageLyrics(song);
});

// Stage theme toggle
document.getElementById('stage-theme-toggle').addEventListener('click', () => {
    stageState.theme = stageState.theme === 'dark' ? 'light' : 'dark';
    updateStageThemeLabel();
});

// Back to list (mobile)
document.getElementById('back-to-list-btn').addEventListener('click', backToList);
document.getElementById('back-to-list-btn-edit').addEventListener('click', backToList);

// Settings
document.getElementById('settings-btn').addEventListener('click', openSettingsModal);
document.getElementById('close-settings').addEventListener('click', closeSettingsModal);
document.getElementById('close-settings-btn').addEventListener('click', closeSettingsModal);
document.getElementById('settings-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('settings-modal')) closeSettingsModal();
});

// Sign out
document.getElementById('sign-out-btn').addEventListener('click', async () => {
    try {
        await FirebaseAuth.logout();
        closeSettingsModal();
    } catch (error) {
        console.error('Sign out error:', error);
    }
});

// Cache buster
document.getElementById('clear-cache-btn').addEventListener('click', () => {
    const url = new URL(window.location);
    url.searchParams.set('cachebust', Date.now());
    window.location.href = url.toString();
});

// Google sign in
document.getElementById('google-sign-in-btn').addEventListener('click', async () => {
    const btn = document.getElementById('google-sign-in-btn');
    const loginError = document.getElementById('login-error');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing in...';
    loginError.classList.add('hidden');

    try {
        await FirebaseAuth.loginWithGoogle();
        hideLoginModal();
    } catch (error) {
        console.error('Login error:', error);
        loginError.textContent = error.message || 'Sign in failed';
        loginError.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.innerHTML = `
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

// Import modal
document.getElementById('close-import').addEventListener('click', closeImportModal);
document.getElementById('cancel-import-btn').addEventListener('click', closeImportModal);
document.getElementById('confirm-sync-btn').addEventListener('click', executeSync);
document.getElementById('import-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('import-modal')) closeImportModal();
});

// Import from Ableset button (settings menu)
document.getElementById('import-ableset-btn').addEventListener('click', () => {
    closeSettingsModal();
    document.getElementById('import-file-input').click();
});

// File input change
document.getElementById('import-file-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFileImport(file);
    e.target.value = ''; // Reset so same file can be re-selected
});

// Initialize drag and drop
setupDragAndDrop();

// Escape key handler
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        // Exit stage mode first if active
        if (!document.getElementById('stage-mode').classList.contains('hidden')) {
            exitStageMode();
            return;
        }
        if (!document.getElementById('import-modal').classList.contains('hidden')) {
            closeImportModal();
            return;
        }
        if (!document.getElementById('settings-modal').classList.contains('hidden')) {
            closeSettingsModal();
        }
    }
});

// Warn before leaving with unsaved changes
window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
    }
});

// ---- Auth State Listener ----
FirebaseAuth.onAuthChange((user) => {
    isAuthenticated = !!user;
    if (user) {
        hideLoginModal();
        loadSongs();
    } else {
        showLoginForm();
    }
});
