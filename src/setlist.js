// FILE: setlist.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Element References ---
    const jsonUploadInput = document.getElementById('json-upload-input');
    const setlistOutput = document.getElementById('setlist-output');
    const setlistOutputContainer = document.getElementById('setlist-output-container');
    const printBtn = document.getElementById('print-btn');

    // --- Event Listeners ---
    jsonUploadInput.addEventListener('change', handleFileUpload);
    printBtn.addEventListener('click', () => window.print());

    // --- Core Logic ---
    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => generateSetlistFromJSON(e.target.result);
        reader.readAsText(file);
    }

    function generateSetlistFromJSON(jsonContent) {
        const output = document.getElementById('setlist-output');
        const outputContainer = document.getElementById('setlist-output-container');
        const emojiRegex = /^\p{Emoji}/u;

        try {
            const data = JSON.parse(jsonContent);
            const desiredSetlists = ["set_1", "set_2", "set_3", "set_4"]; // match exactly

            // Build lookup for lists
            const listsById = Object.fromEntries(data.lists.map(l => [l.id, l]));

            // Only open/active lists (not archived)
            const openLists = data.lists.filter(l => !l.closed);

            // Only active cards that belong to active lists
            const validCards = data.cards.filter(card => {
                // Card must not be archived/closed
                if (card.closed) return false;

                // Card must belong to an active list
                const parentList = listsById[card.idList];
                if (!parentList || parentList.closed) return false;

                return true;
            });

            output.innerHTML = '';

            // Create top row: Set 1 and Set 2 side by side
            const topRow = document.createElement('div');
            topRow.className = 'setlist-row setlist-row-top';
            topRow.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;';

            // Create bottom row: Set 3 and Set 4 side by side
            const bottomRow = document.createElement('div');
            bottomRow.className = 'setlist-row setlist-row-bottom';
            bottomRow.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;';

            desiredSetlists.forEach((setNameLower, index) => {
                // Find matching list by name (exact match, ignoring case + whitespace)
                const list = openLists.find(
                    l => l.name.trim().toLowerCase() === setNameLower
                );

                const column = document.createElement('div');
                column.className = 'setlist-column';
                column.style.cssText = 'border: 1px solid #000; padding: 1rem; min-height: 200px;';

                const title = document.createElement('h3');
                title.textContent = setNameLower.replace('set_', 'Set ');
                title.style.cssText = 'margin: 0 0 1rem 0; text-align: center; color: var(--color-spotify-green); border-bottom: 1px solid rgba(255,255,255,.2); padding-bottom: 0.5rem;';
                column.appendChild(title);

                const songList = document.createElement('ul');
                songList.style.cssText = 'list-style: none; padding: 0; margin: 0;';

                if (list) {
                    // Only valid cards from THIS specific list
                    const songs = validCards.filter(card => card.idList === list.id);

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

                    // Add empty list item if no songs
                    if (songs.length === 0) {
                        const emptyLi = document.createElement('li');
                        emptyLi.textContent = 'No songs in this set';
                        emptyLi.style.cssText = 'padding: 0.25rem 0; color: rgba(255,255,255,.5); font-style: italic;';
                        songList.appendChild(emptyLi);
                    }
                } else {
                    // Add empty list item if list not found
                    const emptyLi = document.createElement('li');
                    emptyLi.textContent = 'No songs in this set';
                    emptyLi.style.cssText = 'padding: 0.25rem 0; color: rgba(255,255,255,.5); font-style: italic;';
                    songList.appendChild(emptyLi);
                }

                // Remove border from last list item
                const lastLi = songList.querySelector('li:last-child');
                if (lastLi) {
                    lastLi.style.borderBottom = 'none';
                }

                column.appendChild(songList);

                // Add to appropriate row
                if (index < 2) {
                    topRow.appendChild(column);
                } else {
                    bottomRow.appendChild(column);
                }
            });

            // Add rows to output
            output.appendChild(topRow);
            output.appendChild(bottomRow);

            outputContainer.style.display = 'block';
        } catch (error) {
            alert(`Failed to process JSON file.\nError: ${error.message}`);
            console.error('Error processing Trello JSON:', error);
        }
    }
});
