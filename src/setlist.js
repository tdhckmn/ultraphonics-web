// FILE: src/setlist.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Element References ---
    const setlistOutput = document.getElementById('setlist-output');
    const setlistOutputContainer = document.getElementById('setlist-output-container');
    const printBtn = document.getElementById('print-btn');
    const printButtonContainer = document.getElementById('print-button-container');

    // --- Event Listeners ---
    printBtn.addEventListener('click', () => window.print());

    // --- Core Logic ---
    async function loadSetlist() {
        // Fetch the local JSON file created by the GitHub Action
        const url = `../api/setlist.json`;

        try {
            // Add a cache-busting parameter to ensure we get the latest version
            const response = await fetch(`${url}?v=${new Date().getTime()}`);
            if (!response.ok) {
                throw new Error('Setlist data file not found. It may not have been generated yet.');
            }
            const data = await response.json();
            generateSetlistFromData(data);
        } catch (error) {
            setlistOutput.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
            console.error('Error loading setlist data:', error);
        }
    }

    function generateSetlistFromData(data) {
        const emojiRegex = /^\p{Emoji}/u;
        const setlistIdentifier = '📋';

        // Find all open lists that start with the clipboard emoji
        const desiredSetlists = data.lists.filter(list => 
            !list.closed && list.name.trim().startsWith(setlistIdentifier)
        );

        setlistOutput.innerHTML = ''; // Clear "Loading..." message

        if (desiredSetlists.length === 0) {
            setlistOutput.innerHTML = `<p>No setlists found. Make sure your Trello list titles start with the 📋 emoji.</p>`;
            return;
        }

        const topRow = document.createElement('div');
        topRow.className = 'setlist-row setlist-row-top';
        topRow.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;';

        const bottomRow = document.createElement('div');
        bottomRow.className = 'setlist-row setlist-row-bottom';
        bottomRow.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;';

        // Display up to the first 4 setlists found
        desiredSetlists.slice(0, 4).forEach((list, index) => {
            const column = document.createElement('div');
            column.className = 'setlist-column';
            column.style.cssText = 'border: 1px solid #000; padding: 1rem; min-height: 200px;';

            const title = document.createElement('h3');
            // --- NEW LOGIC ---
            // Clean the title by removing the identifier emoji and trimming whitespace
            title.textContent = list.name.replace(setlistIdentifier, '').trim();
            // --- END NEW LOGIC ---
            title.style.cssText = 'margin: 0 0 1rem 0; text-align: center; color: var(--color-spotify-green); border-bottom: 1px solid rgba(255,255,255,.2); padding-bottom: 0.5rem;';
            column.appendChild(title);

            const songList = document.createElement('ul');
            songList.style.cssText = 'list-style: none; padding: 0; margin: 0;';

            const songs = data.cards.filter(card => card.idList === list.id && !card.closed);

            let counter = 1;
            songs.forEach(song => {
                const li = document.createElement('li');
                li.style.cssText = 'padding: 0.25rem 0; border-bottom: 1px solid rgba(255,255,255,.08);';
                if (emojiRegex.test(song.name)) {
                    li.className = 'setlist-note';
                    li.textContent = song.name;
                } else {
                    li.textContent = `${counter}. ${song.name}`;
                    counter++;
                }
                songList.appendChild(li);
            });

            if (songs.length === 0) {
                const emptyLi = document.createElement('li');
                emptyLi.textContent = 'No songs in this set';
                emptyLi.style.cssText = 'padding: 0.25rem 0; color: rgba(255,255,255,.5); font-style: italic;';
                songList.appendChild(emptyLi);
            }

            const lastLi = songList.querySelector('li:last-child');
            if (lastLi) { lastLi.style.borderBottom = 'none'; }
            column.appendChild(songList);

            if (index < 2) { topRow.appendChild(column); } 
            else { bottomRow.appendChild(column); }
        });

        setlistOutput.appendChild(topRow);
        setlistOutput.appendChild(bottomRow);
        printButtonContainer.style.display = 'block'; // Show the print button
    }

    // Load the setlist when the page is opened
    loadSetlist();
});