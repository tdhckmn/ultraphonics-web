// FILE: admin.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    const CORRECT_PASSWORD = 'DWS';
    const PREPOPULATED_MESSAGE = `We're currently looking to book the following dates:\n- [DATE 1]\n- [DATE 2]\n- [DATE 3]`;

    // --- Element References ---
    const loginSection = document.getElementById('login-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const generatorFormSection = document.getElementById('generator-form-section');
    const setlistSection = document.getElementById('setlist-section');
    const jsonUploadInput = document.getElementById('json-upload-input');

    // --- Event Listeners ---
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('email-generator-tile').addEventListener('click', showEmailGenerator);
    document.getElementById('setlist-generator-tile').addEventListener('click', showSetlistGenerator);
    document.getElementById('generator-form').addEventListener('submit', handleEmailGeneration);
    jsonUploadInput.addEventListener('change', handleFileUpload);

    // Back Buttons
    document.getElementById('back-to-dashboard-from-email-btn').addEventListener('click', showDashboard);
    document.getElementById('back-to-dashboard-from-setlist-btn-main').addEventListener('click', showDashboard);
    document.getElementById('back-to-dashboard-from-setlist-preview-btn').addEventListener('click', showDashboard);

    // Print Button
    document.getElementById('print-btn').addEventListener('click', () => window.print());

    // --- View Toggling Functions ---
    function handleLogin(e) {
        e.preventDefault();
        if (document.getElementById('password').value === CORRECT_PASSWORD) {
            loginSection.style.display = 'none';
            showDashboard();
        } else {
            alert('Incorrect password.');
        }
    }

    function showDashboard() {
        dashboardSection.style.display = 'block';
        generatorFormSection.style.display = 'none';
        setlistSection.style.display = 'none';
        document.getElementById('setlist-output-container').style.display = 'none';
        jsonUploadInput.value = '';
    }

    function showEmailGenerator() {
        dashboardSection.style.display = 'none';
        generatorFormSection.style.display = 'block';
        document.getElementById('message').value = PREPOPULATED_MESSAGE;
    }

    function showSetlistGenerator() {
        dashboardSection.style.display = 'none';
        setlistSection.style.display = 'block';
    }

    // --- Core Logic ---
    function handleEmailGeneration(e) {
        e.preventDefault();
        const params = new URLSearchParams();
        params.append('clientName', document.getElementById('client-name').value);
        params.append('casualName', document.getElementById('casual-name').value);
        params.append('signatureName', document.getElementById('signature-name').value);
        params.append('yourPhone', document.getElementById('your-phone').value);
        params.append('message', document.getElementById('message').value);
        // Ensure email opens in a new tab
        window.open(`generated-email.html?${params.toString()}`, '_blank');
    }

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

          // Only open lists
          const openLists = data.lists.filter(l => !l.closed);

          // Only open cards that ALSO belong to an open list
          const validCards = data.cards.filter(
            c => !c.closed && listsById[c.idList] && !listsById[c.idList].closed
          );

          output.innerHTML = '';
          let currentPage;

          desiredSetlists.forEach((setNameLower, index) => {
            if (index === 0 || index === 2) {
              currentPage = document.createElement('div');
              currentPage.className = 'print-page setlist-output-page';
              output.appendChild(currentPage);
            }

            // Find matching list by name (exact match, ignoring case + whitespace)
            const list = openLists.find(
              l => l.name.trim().toLowerCase() === setNameLower
            );

            const column = document.createElement('div');
            column.className = 'setlist-column';
            const title = document.createElement('h3');
            title.textContent = setNameLower.replace('set_', 'Set ');
            column.appendChild(title);

            const songList = document.createElement('ul');

            if (list) {
              // Only valid cards from THIS list
              const songs = validCards.filter(card => card.idList === list.id);

              let counter = 1;
              songs.forEach(song => {
                const li = document.createElement('li');
                if (emojiRegex.test(song.name)) {
                  li.className = 'setlist-note';
                  li.textContent = song.name;
                } else {
                  li.textContent = `${counter}. ${song.name}`;
                  counter++;
                }
                songList.appendChild(li);
              });
            }

            column.appendChild(songList);
            if (currentPage) currentPage.appendChild(column);
          });

          outputContainer.style.display = 'block';
        } catch (error) {
          alert(`Failed to process JSON file.\nError: ${error.message}`);
          console.error('Error processing Trello JSON:', error);
        }
      }
});
