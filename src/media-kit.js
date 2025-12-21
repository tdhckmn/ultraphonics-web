import { config } from '../content/config.js';
import { setupCommonElements } from './utils.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Setup Navigation, Footer, etc.
    setupCommonElements('mediaKit');

    const mediaConfig = config.mediaKit || {};

    // 2. Render Downloads
    const downloadsContainer = document.getElementById('downloads-list');
    if (downloadsContainer && mediaConfig.downloads) {
        // Stack links vertically and center them
        downloadsContainer.style.flexDirection = 'column';
        downloadsContainer.style.alignItems = 'center';

        mediaConfig.downloads.forEach(link => {
            const a = document.createElement('a');
            
            // Determine URL: either direct 'url' or lookup in config.links via 'useLink'
            let href = link.url;
            if (link.useLink && config.links && config.links[link.useLink]) {
                href = config.links[link.useLink];
            }

            a.href = href || '#';
            a.textContent = link.label;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            
            // Make all buttons secondary (outline) style
            a.className = 'button button-outline';
            
            // Stack styling: consistent width, centered text
            a.style.width = '100%';
            a.style.maxWidth = '350px';
            a.style.textAlign = 'center';
            a.style.margin = "0"; // CSS gap handles spacing

            downloadsContainer.appendChild(a);
        });
    }

    // 3. Render Audio Players
    const audioContainer = document.getElementById('audio-list');
    if (audioContainer && mediaConfig.audio) {
        mediaConfig.audio.forEach((track, index) => {
            const player = createAudioPlayer(track, index);
            audioContainer.appendChild(player);
        });
    }

    // 4. Song Selection Logic
    const songListContainer = document.getElementById('song-list');
    const genreFilter = document.getElementById('genre-filter');
    
    if (songListContainer) {
        let allSongs = [];

        try {
            // Fetch songs from the separate JSON file
            const response = await fetch(`content/songs.json?v=${new Date().getTime()}`);
            if (response.ok) {
                allSongs = await response.json();
                renderSongs(allSongs);
            } else {
                songListContainer.innerHTML = '<p class="error-text">Unable to load song list.</p>';
            }
        } catch (error) {
            console.error("Error loading songs:", error);
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

    // 5. Render Gallery
    const galleryContainer = document.getElementById('gallery-list');
    if (galleryContainer && mediaConfig.gallery) {
        mediaConfig.gallery.forEach(image => {
            const div = document.createElement('div');
            div.className = 'gallery-item';
            
            const img = document.createElement('img');
            img.src = image.src;
            img.alt = image.alt;
            img.loading = "lazy";

            // Create Download Button
            const downloadBtn = document.createElement('a');
            downloadBtn.href = image.src;
            downloadBtn.download = ''; // Triggers download behavior
            downloadBtn.className = 'gallery-download-btn';
            downloadBtn.innerHTML = '⇩'; 
            downloadBtn.setAttribute('aria-label', 'Download image');
            downloadBtn.title = 'Download';
            
            div.appendChild(img);
            div.appendChild(downloadBtn);
            galleryContainer.appendChild(div);
        });
    }
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
        // Add genre tag for visual flair
        li.innerHTML = `
            <span class="song-title">${song.title}</span>
            <span class="song-genre-tag genre-${song.genre.toLowerCase()}">${song.genre}</span>
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