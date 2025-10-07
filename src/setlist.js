document.addEventListener('DOMContentLoaded', () => {
    const setlistOutput = document.getElementById('setlist-output');
    const printBtn = document.getElementById('print-btn');
    const printButtonContainer = document.getElementById('print-button-container');

    printBtn.addEventListener('click', () => window.print());

    function getColorForUser(username) {
        const initial = username.charAt(0).toUpperCase();
        switch (initial) {
            case 'D': return '#673ab7'; // Purple
            case 'T': return '#4caf50'; // Green
            case 'K': return '#03a9f4'; // Blue
            case 'S': return '#ff9800'; // Orange
            default:  return '#9e9e9e'; // Gray
        }
    }

    async function loadSetlist() {
        const url = `../api/setlist.json`;

        try {
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

        if (!data.members) {
            console.error("Member data is missing from 'api/setlist.json'. Please re-run the 'Fetch Trello Setlist Data' action in your GitHub repository.");
        }
        const memberMap = new Map((data.members || []).map(m => [m.id, m]));

        const desiredSetlists = data.lists.filter(list => 
            !list.closed && list.name.trim().startsWith(setlistIdentifier)
        );

        setlistOutput.innerHTML = '';

        if (desiredSetlists.length === 0) {
            setlistOutput.innerHTML = `<p>No setlists found. Make sure your Trello list titles start with the 📋 emoji.</p>`;
            return;
        }

        const topRow = document.createElement('div');
        topRow.className = 'setlist-row setlist-row-top';

        const bottomRow = document.createElement('div');
        bottomRow.className = 'setlist-row setlist-row-bottom';

        desiredSetlists.slice(0, 4).forEach((list, index) => {
            const column = document.createElement('div');
            column.className = 'setlist-column';

            const title = document.createElement('h3');
            title.textContent = list.name.replace(setlistIdentifier, '').trim();
            title.style.cssText = 'margin: 0 0 1rem 0; text-align: center; color: var(--color-spotify-green); border-bottom: 1px solid rgba(255,255,255,.2); padding-bottom: 0.5rem;';
            column.appendChild(title);

            const songList = document.createElement('ul');
            songList.style.cssText = 'list-style: none; padding: 0; margin: 0;';

            const songs = data.cards.filter(card => card.idList === list.id && !card.closed);

            let counter = 1;
            songs.forEach(song => {
                const li = document.createElement('li');
                li.style.cssText = 'padding: 0.25rem 0; border-bottom: 1px solid rgba(255,255,255,.08);';
                
                const songTitle = document.createElement('span');
                songTitle.className = 'song-title';

                if (emojiRegex.test(song.name)) {
                    li.className = 'setlist-note';
                    songTitle.textContent = song.name;
                } else {
                    songTitle.textContent = `${counter}. ${song.name}`;
                    counter++;
                }
                
                li.appendChild(songTitle);

                if (song.idMembers && song.idMembers.length > 0) {
                    const avatarContainer = document.createElement('div');
                    avatarContainer.className = 'avatar-container';

                    song.idMembers.forEach(memberId => {
                        const member = memberMap.get(memberId);
                        if (member) {
                            const avatar = document.createElement('span');
                            avatar.className = 'avatar';
                            avatar.textContent = member.username.charAt(0).toUpperCase();
                            avatar.style.backgroundColor = getColorForUser(member.username);
                            avatarContainer.appendChild(avatar);
                        }
                    });
                    li.appendChild(avatarContainer);
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
        printButtonContainer.style.display = 'block';
    }

    loadSetlist();
});