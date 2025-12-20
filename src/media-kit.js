import { config } from '../content/config.js';
import { setupCommonElements } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
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

    // 4. Render Gallery
    const galleryContainer = document.getElementById('gallery-list');
    if (galleryContainer && mediaConfig.gallery) {
        mediaConfig.gallery.forEach(image => {
            const div = document.createElement('div');
            div.className = 'gallery-item';
            
            const img = document.createElement('img');
            img.src = image.src;
            img.alt = image.alt;
            img.loading = "lazy";
            
            div.appendChild(img);
            galleryContainer.appendChild(div);
        });
    }
});

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