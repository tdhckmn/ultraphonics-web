import { setupCommonElements } from './utils.js';
import { trackEvent } from './analytics.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Setup Navigation, Footer, etc.
    setupCommonElements('mediaKit');

    // 2. Song Selection Logic
    const songListContainer = document.getElementById('song-list');
    const genreFilter = document.getElementById('genre-filter');
    
    if (songListContainer) {
        let allSongs = [];

        try {
            let fetchedSongs = [];
            if (window.FirestoreService) {
                fetchedSongs = await window.FirestoreService.getSongs();
            } else {
                console.error('Firestore Service not available. Did the bundle load?');
                const response = await fetch(`content/songs.json?v=${new Date().getTime()}`);
                if (response.ok) {
                    fetchedSongs = await response.json();
                } else {
                    throw new Error('Could not load songs from fallback JSON.');
                }
            }
            // Only show songs marked for website display
            allSongs = fetchedSongs.filter(s => s.showOnWebsite === true);
            renderSongs(allSongs);
        } catch (error) {
            console.error("Error loading songs:", error);
            songListContainer.innerHTML = '<p class="error-text">Unable to load song list.</p>';
        }

        // Handle Filter Change
        if (genreFilter) {
            genreFilter.addEventListener('change', (e) => {
                const selectedGenre = e.target.value;
                if (selectedGenre === 'all') {
                    renderSongs(allSongs);
                } else {
                    const filtered = allSongs.filter(s => s.genre === selectedGenre);
                    renderSongs(filtered);
                }
            });
        }
    }

    // Setup analytics for genre filter
    setupMediaKitAnalytics();
});

function renderSongs(songs) {
    const container = document.getElementById('song-list');
    if (!container) return;

    container.innerHTML = ''; // Clear current

    if (songs.length === 0) {
        container.innerHTML = '<p class="empty-text">No songs found for this category.</p>';
        return;
    }

    // Grouping for display if "All" is selected could be cool, but a flat grid is cleaner for "Top X"
    const ul = document.createElement('ul');
    ul.className = 'song-grid';

    songs.forEach(song => {
        const li = document.createElement('li');
        li.className = 'song-item';
        // Use 'name' (clean display name) if available, fall back to 'title'
        const displayName = song.name || song.title || song.lastKnownName || 'Untitled';
        const genre = song.genre || 'Other';
        // Add genre tag for visual flair
        li.innerHTML = `
            <span class="song-title">${displayName}</span>
            <span class="song-genre-tag genre-${genre.toLowerCase()}">${genre}</span>
        `;
        ul.appendChild(li);
    });

    container.appendChild(ul);
}

/**
 * Creates a custom HTML structure for an audio player
 */
function createAudioPlayer(track, index) {
    const wrapper = document.createElement('div');
    wrapper.className = 'audio-track';

    // HTML Structure
    wrapper.innerHTML = `
        <div class="track-info">
            <span class="track-title">${track.title}</span>
        </div>
        <div class="player-controls">
            <button class="play-btn" aria-label="Play">▶</button>
            <div class="progress-container">
                <div class="progress-bar"></div>
            </div>
            <span class="time-display">0:00 / ${track.duration || '--:--'}</span>
        </div>
        <audio src="${track.src}" preload="none"></audio>
    `;

    // Logic
    const audio = wrapper.querySelector('audio');
    const playBtn = wrapper.querySelector('.play-btn');
    const progressBar = wrapper.querySelector('.progress-bar');
    const progressContainer = wrapper.querySelector('.progress-container');
    const timeDisplay = wrapper.querySelector('.time-display');

    // Toggle Play/Pause
    playBtn.addEventListener('click', () => {
        // Pause all other audios
        document.querySelectorAll('audio').forEach(a => {
            if (a !== audio) {
                a.pause();
                a.parentElement.querySelector('.play-btn').textContent = '▶';
                a.parentElement.classList.remove('playing');
            }
        });

        if (audio.paused) {
            audio.play();
            playBtn.textContent = '⏸';
            wrapper.classList.add('playing');
        } else {
            audio.pause();
            playBtn.textContent = '▶';
            wrapper.classList.remove('playing');
        }
    });

    // Update Progress
    audio.addEventListener('timeupdate', () => {
        const percent = (audio.currentTime / audio.duration) * 100;
        progressBar.style.width = `${percent}%`;
        
        const current = formatTime(audio.currentTime);
        const total = formatTime(audio.duration || 0);
        timeDisplay.textContent = `${current} / ${total}`;
    });

    // Seek
    progressContainer.addEventListener('click', (e) => {
        const width = progressContainer.clientWidth;
        const clickX = e.offsetX;
        const duration = audio.duration;
        audio.currentTime = (clickX / width) * duration;
    });

    // Reset on End
    audio.addEventListener('ended', () => {
        playBtn.textContent = '▶';
        wrapper.classList.remove('playing');
        progressBar.style.width = '0%';
    });

    return wrapper;
}

function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function setupMediaKitAnalytics() {
    // Track genre filter usage
    const genreFilter = document.getElementById('genre-filter');
    if (genreFilter) {
        genreFilter.addEventListener('change', (e) => {
            trackEvent('genre_filter_change', {
                selected_genre: e.target.value
            });
        });
    }
}