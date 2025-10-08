/// <reference types="node" />

const fs = require('fs');
const path = require('path');
const https = require('https');

// --- Configuration ---
const API_KEY = process.env.TRELLO_API_KEY;
const API_TOKEN = process.env.TRELLO_API_TOKEN;
const BOARD_ID = 'oatz1C1E'; // Board for Setlists
const SHOWS_LIST_ID = '68e6806e872f2fbfb6fa7f56'; // List for Upcoming Shows

// --- Helper function to make HTTPS requests ---
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(body));
        } else {
          reject(`Trello API error: ${res.statusCode}`);
        }
      });
    }).on('error', (e) => reject(`Fetch error: ${e.message}`));
  });
}

// Extracts a clean URL from Trello's markdown link format
function parseLink(text) {
    if (!text) return '';
    // This regex specifically looks for the URL inside the parentheses
    const match = text.match(/\((.*?)\s*(".*")?\)/);
    return match ? match[1] : text;
}

// --- Main function to fetch and process all data ---
async function fetchAllData() {
  if (!API_KEY || !API_TOKEN) {
    console.error('Error: TRELLO_API_KEY and TRELLO_API_TOKEN environment variables are required.');
    process.exit(1);
  }

  try {
    // 1. Fetch Setlist Data
    const setlistUrl = `https://api.trello.com/1/boards/${BOARD_ID}?key=${API_KEY}&token=${API_TOKEN}&lists=open&cards=open&members=all`;
    const setlistData = await httpsGet(setlistUrl);
    const setlistOutputPath = path.join(__dirname, '..', 'api', 'setlist.json');
    fs.mkdirSync(path.dirname(setlistOutputPath), { recursive: true });
    fs.writeFileSync(setlistOutputPath, JSON.stringify(setlistData, null, 2));
    console.log('✅ Successfully fetched and saved Setlist data.');

    // 2. Fetch and Process Shows Data
    const showsUrl = `https://api.trello.com/1/lists/${SHOWS_LIST_ID}/cards?key=${API_KEY}&token=${API_TOKEN}&fields=name,due,desc`;
    const showsCards = await httpsGet(showsUrl);

    const shows = showsCards.map(card => {
      const details = {};
      const lines = (card.desc || '').split('\n');
      for (const line of lines) {
        const parts = line.split(':');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const value = parts.slice(1).join(':').trim();
          if (key === 'City') details.city = value;
          if (key === 'State') details.state = value;
          if (key === 'End Time') details.endTime = value;
          if (key === 'Is Private') details.isPrivate = value.toLowerCase() === 'true';
          if (key === 'Event Link') details.eventLink = parseLink(value);
        }
      }
      
      const showDate = new Date(card.due);
      // Use UTC methods to read the date components to avoid timezone shifts
      const date = `${showDate.getUTCMonth() + 1}/${showDate.getUTCDate()}/${showDate.getUTCFullYear()}`;
      const startTime = showDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'UTC' // Interpret the time as UTC to match how the server sees it
      });

      return {
        date: date,
        venue: card.name,
        city: details.city || '',
        state: details.state || '',
        startTime: startTime,
        endTime: details.endTime || '',
        isPrivate: details.isPrivate || false,
        eventLink: details.eventLink || '',
      };
    });
    
    const showsOutputPath = path.join(__dirname, '..', 'api', 'shows.json');
    fs.writeFileSync(showsOutputPath, JSON.stringify(shows, null, 2));
    console.log('✅ Successfully fetched and saved Shows data.');

  } catch (error) {
    console.error(`❌ An error occurred: ${error}`);
    process.exit(1);
  }
}

fetchAllData();