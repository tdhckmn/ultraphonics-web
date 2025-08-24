// This event listener ensures that the DOM is fully loaded before any of the scripts run.
document.addEventListener('DOMContentLoaded', () => {

  // --- Configuration Object ---
  // Central place for settings and data sources to make future updates easier.
  const config = {
    googleSheetURLs: {
      2025: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQhcvl6yAQFWffllShR5GUJzRJ6CsYPxUaj3b844y7G_3SgE2wHnapcTtZFJsL9S-CqzyNs_2vVS2U_/pub?gid=0&single=true&output=csv",
      2026: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQhcvl6yAQFWffllShR5GUJzRJ6CsYPxUaj3b844y7G_3SgE2wHnapcTtZFJsL9S-CqzyNs_2vVS2U_/pub?gid=1480597074&single=true&output=csv"
    },
    venmo: {
      username: 'Ultraphonics',
      tipAmount: 10,
      note: '🤘'
    },
    selectors: {
      contactButton: '#contact-button',
      venmoButton: '#venmo-button',
      header: 'header',
      showsContainer: '#shows'
    }
  };

  // --- Main Application Logic ---

  /**
   * Initializes all the primary functions for the website.
   */
  function initialize() {
    setupEventListeners();
    setupVenmoLink();
    setupParallaxEffect();
    loadShowSchedule();
  }

  /**
   * Sets up all general event listeners for analytics and UI.
   */
  function setupEventListeners() {
    // Email source tracking
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('src') === 'email' && typeof gtag !== 'undefined') {
      gtag('event', 'page_view', { custom_parameter: 'email_traffic', source: 'email' });
      console.log('Email traffic detected and logged to Google Analytics');
    }

    // Analytics for button clicks
    const contactButton = document.querySelector(config.selectors.contactButton);
    if (contactButton) {
      contactButton.addEventListener('click', () => trackEvent('Contact CTA Pressed'));
    }

    const venmoButton = document.querySelector(config.selectors.venmoButton);
    if (venmoButton) {
      venmoButton.addEventListener('click', () => trackEvent('Venmo CTA Pressed'));
    }
  }

  /**
   * Configures the Venmo button with a deep link for mobile devices.
   */
  function setupVenmoLink() {
    const venmoButton = document.querySelector(config.selectors.venmoButton);
    if (!venmoButton) return;

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      const { username, tipAmount, note } = config.venmo;
      const encodedNote = encodeURIComponent(note);
      venmoButton.href = `venmo://paycharge?txn=pay&recipients=${username}&amount=${tipAmount}&note=${encodedNote}`;
    }
  }

  /**
   * Initializes the parallax scrolling effect on the header.
   */
  function setupParallaxEffect() {
    const header = document.querySelector(config.selectors.header);
    if (!header) return;

    const updateParallax = () => {
      const scrollY = window.scrollY;
      header.style.backgroundPositionY = `${scrollY * 0.33}px`;
    };

    window.addEventListener('scroll', updateParallax, { passive: true });
    updateParallax(); // Set initial position
  }

  /**
   * Fetches, parses, and renders the show schedule from Google Sheets.
   */
  function loadShowSchedule() {
    const showsContainer = document.querySelector(config.selectors.showsContainer);
    if (!showsContainer) return;

    const sortedYears = Object.keys(config.googleSheetURLs).sort((a, b) => a - b);

    Promise.all(
      sortedYears.map(year =>
        fetch(config.googleSheetURLs[year])
          .then(res => res.text())
          .then(csv => ({ year, data: parseCSV(csv) }))
          .catch(err => {
            console.error(`Error loading ${year} shows:`, err);
            return { year, data: [] }; // Gracefully handle fetch errors
          })
      )
    ).then(results => {
      showsContainer.innerHTML = ""; // Clear loading spinner
      results.forEach(({ year, data }) => {
        renderShows(year, data, showsContainer);
      });
    });
  }

  // --- Helper Functions ---

  /**
   * A utility function to send events to Google Analytics.
   * @param {string} eventName - The name of the event to track.
   */
  function trackEvent(eventName) {
    if (typeof gtag !== 'undefined') {
      gtag('event', eventName);
      console.log(`Event sent to GA: ${eventName}`);
    } else {
      console.log('gtag not available - GA not loaded');
    }
  }

  /**
   * Parses CSV text into an array of objects.
   * @param {string} text - The CSV content.
   * @returns {Array<Object>}
   */
  function parseCSV(text) {
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",").map(h => h.trim());
    return lines.slice(1).map(line => {
      const values = line.split(",").map(v => v.trim());
      return headers.reduce((obj, key, i) => {
        obj[key] = values[i];
        return obj;
      }, {});
    });
  }

  /**
   * Renders the show data into the specified container.
   * @param {string} year - The year of the events.
   * @param {Array<Object>} data - The show data.
   * @param {HTMLElement} container - The DOM element to render into.
   */
  function renderShows(year, data, container) {
    const heading = document.createElement("h2");
    heading.textContent = `${year} EVENTS`;
    container.appendChild(heading);

    data.forEach((row) => {
      const date = new Date(row.date);
      const formattedDate = !isNaN(date)
        ? `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
        : "Date TBD";

      const div = document.createElement("div");

      if (row.isPrivate?.toLowerCase() === "true") {
        div.textContent = `${formattedDate} • Private Event`;
      } else {
        const venueText = row.venue?.trim() || "Venue TBD";
        const city = row.city || "";
        const state = row.state || "";
        const time = row.startTime?.replace(":00 PM", " PM") || "";
        const linkText = `${venueText}, ${city}${state ? ", " + state : ""}`;

        const venueNode = row.eventLink
          ? createVenueLink(row, linkText)
          : document.createTextNode(linkText);

        div.append(`${formattedDate} • `, venueNode, time ? ` • ${time}` : "");
      }
      container.appendChild(div);
    });
  }

  /**
   * Creates a venue link with analytics tracking.
   * @param {Object} row - The event data row.
   * @param {string} linkText - The text for the link.
   * @returns {HTMLAnchorElement}
   */
  function createVenueLink(row, linkText) {
    const a = document.createElement("a");
    a.href = row.eventLink;
    a.textContent = linkText;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.className = "venue-link";
    a.addEventListener('click', () => trackEvent(`${row.date}_${row.venue?.trim()}`));
    return a;
  }

  // --- Start the application ---
  initialize();
});
