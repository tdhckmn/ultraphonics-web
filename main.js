import { siteContent } from './content/index.js';

document.addEventListener('DOMContentLoaded', () => {
  const { shows, venmo, selectors, hero, services } = siteContent;

  /**
   * Populates the website's text content from the config file.
   */
  function populateTextContent() {
    // Hero Section
    document.querySelector(selectors.bandName).textContent = hero.bandName;
    document.querySelector(selectors.tagline).textContent = hero.tagline;
    document.querySelector(selectors.genres).textContent = hero.genres;

    // Services Section
    document.querySelector(selectors.servicesHeading).textContent = services.heading;
    document.querySelector(selectors.servicesLeadText).textContent = services.leadText;
    document.querySelector(selectors.equipmentNote).textContent = services.equipmentNote;

    // Services Grid
    const servicesGrid = document.querySelector(selectors.servicesGrid);
    services.gridItems.forEach(itemText => {
      const listItem = document.createElement('li');
      listItem.className = 'service-card';
      listItem.textContent = itemText;
      servicesGrid.appendChild(listItem);
    });
  }

  function initialize() {
    populateTextContent(); // Populate text first
    setupEventListeners();
    setupVenmoLink();
    setupParallaxEffect();
    loadShowSchedule();
  }

  function setupEventListeners() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('src') === 'email' && typeof gtag !== 'undefined') {
      gtag('event', 'page_view', { custom_parameter: 'email_traffic', source: 'email' });
    }
    const contactButton = document.querySelector(selectors.contactButton);
    if (contactButton) {
      contactButton.addEventListener('click', () => trackEvent('Contact CTA Pressed'));
    }
    const venmoButton = document.querySelector(selectors.venmoButton);
    if (venmoButton) {
      venmoButton.addEventListener('click', () => trackEvent('Venmo CTA Pressed'));
    }
  }

  function setupVenmoLink() {
    const venmoButton = document.querySelector(selectors.venmoButton);
    if (!venmoButton) return;

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      const { username, tipAmount, note } = venmo;
      const encodedNote = encodeURIComponent(note);
      venmoButton.href = `venmo://paycharge?txn=pay&recipient=${username}&amount=${tipAmount}&note=${encodedNote}`;
    }
  }

  function setupParallaxEffect() {
    const header = document.querySelector(selectors.header);
    if (!header) return;

    const updateParallax = () => {
      const scrollY = window.scrollY;
      header.style.backgroundPositionY = `${scrollY * 0.33}px`;
    };
    window.addEventListener('scroll', updateParallax, { passive: true });
    updateParallax();
  }

  function loadShowSchedule() {
    const showsContainer = document.querySelector(selectors.showsContainer);
    if (!showsContainer) return;

    const eventsByYear = shows.reduce((acc, event) => {
      const year = new Date(event.date).getFullYear();
      if (!acc[year]) acc[year] = [];
      acc[year].push(event);
      return acc;
    }, {});

    for (const year in eventsByYear) {
      renderShows(year, eventsByYear[year], showsContainer);
    }
  }

  function trackEvent(eventName) {
    if (typeof gtag !== 'undefined') {
      gtag('event', eventName);
    } else {
      console.log('gtag not available - GA not loaded');
    }
  }

  function renderShows(year, data, container) {
    const heading = document.createElement('h2');
    heading.textContent = `${year} EVENTS`;
    container.appendChild(heading);

    data.forEach((row) => {
      const date = new Date(row.date);
      const formattedDate = !isNaN(date)
        ? `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
        : 'Date TBD';
      const div = document.createElement('div');
      if (row.isPrivate) {
        div.textContent = `${formattedDate} • Private Event`;
      } else {
        const venueText = row.venue?.trim() || 'Venue TBD';
        const city = row.city || '';
        const state = row.state || '';
        const time = row.startTime?.replace(':00 PM', ' PM') || '';
        const linkText = `${venueText}, ${city}${state ? ', ' + state : ''}`;
        const venueNode = row.eventLink ? createVenueLink(row, linkText) : document.createTextNode(linkText);
        div.append(`${formattedDate} • `, venueNode, time ? ` • ${time}` : '');
      }
      container.appendChild(div);
    });
  }

  function createVenueLink(row, linkText) {
    const a = document.createElement('a');
    a.href = row.eventLink;
    a.textContent = linkText;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.className = 'venue-link';
    a.addEventListener('click', () => trackEvent(`${row.date}_${row.venue?.trim()}`));
    return a;
  }

  initialize();
});