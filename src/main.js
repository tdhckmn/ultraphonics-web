import { siteContent } from '../../content/index.js';

document.addEventListener('DOMContentLoaded', () => {
  const { shows, venmo, selectors, hero, services } = siteContent;

  /**
   * Ensures mobile videos autoplay by handling mobile browser restrictions
   */
  function ensureMobileVideoAutoplay() {
    const mobileVideo = document.querySelector('.hero-video-mobile');
    const desktopVideo = document.querySelector('.hero-video-desktop');

    if (!mobileVideo || !desktopVideo) return;

    // Force play on mobile devices
    const playVideo = (video) => {
      if (video.paused) {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.log('Video autoplay failed:', error);
            // Try again after user interaction
            document.addEventListener('touchstart', () => {
              video.play().catch(e => console.log('Still failed:', e));
            }, { once: true });
          });
        }
      }
    };

    // Check if we're on mobile
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
      // Ensure mobile video plays
      playVideo(mobileVideo);

      // Also try to preload and play
      mobileVideo.load();
      setTimeout(() => playVideo(mobileVideo), 100);

      // Listen for visibility changes to restart video if needed
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && mobileVideo.paused) {
          playVideo(mobileVideo);
        }
      });
    } else {
      // Ensure desktop video plays
      playVideo(desktopVideo);
    }
  }

  /**
   * Builds and injects a JSON-LD script tag for Structured Data (SEO).
   */
  function injectStructuredData() {
    const eventData = shows
      // Filter out private events and events without a start time
      .filter(show => !show.isPrivate && show.startTime)
      .map(show => {
        // Convert date and time to ISO 8601 format (e.g., 2025-04-05T20:00)
        const date = new Date(show.date);
        const [time, modifier] = show.startTime.split(' ');
        let [hours, minutes] = time.split(':');
        if (modifier === 'PM' && hours !== '12') {
          hours = parseInt(hours, 10) + 12;
        }
        date.setHours(hours, minutes || '00');
        const isoDate = date.toISOString().slice(0, 16);

        return {
          "@type": "Event",
          "name": `Ultraphonics at ${show.venue}`,
          "startDate": isoDate,
          "location": {
            "@type": "Place",
            "name": show.venue,
            "address": {
              "@type": "PostalAddress",
              "addressLocality": show.city,
              "addressRegion": show.state
            }
          },
          "url": show.eventLink || "https://www.ultraphonicsmusic.com/#shows"
        };
      });

    const schema = {
      "@context": "https://schema.org",
      "@type": "MusicGroup",
      "name": "Ultraphonics",
      "url": "https://www.ultraphonicsmusic.com/",
      "logo": "https://www.ultraphonicsmusic.com/img/logo.jpg",
      "description": "Ultraphonics is a high-energy variety band playing Rock, Pop, Country & Soul for weddings, events, and bars in Detroit, Ann Arbor, and Toledo.",
      "genre": ["Rock", "Pop", "Country", "Soul"],
      "sameAs": [
        "https://www.facebook.com/UltraphonicsMusic",
        "https://www.instagram.com/ultraphonicsmusic"
      ],
      "contactPoint": {
        "@type": "ContactPoint",
        "email": "info@ultraphonicsmusic.com",
        "contactType": "booking"
      },
      "event": eventData
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
  }

  function populateTextContent() {
    document.querySelector(selectors.bandName).textContent = hero.bandName;
    document.querySelector(selectors.tagline).textContent = hero.tagline;
    document.querySelector(selectors.genres).textContent = hero.genres;
    document.querySelector(selectors.servicesHeading).textContent = services.heading;
    document.querySelector(selectors.servicesLeadText).textContent = services.leadText;
    document.querySelector(selectors.equipmentNote).textContent = services.equipmentNote;
    const servicesGrid = document.querySelector(selectors.servicesGrid);
    services.gridItems.forEach(itemText => {
      const listItem = document.createElement('li');
      listItem.className = 'service-card';
      listItem.textContent = itemText;
      servicesGrid.appendChild(listItem);
    });
  }

  function initialize() {
    injectStructuredData(); // Add SEO data
    populateTextContent();
    setupEventListeners();
    setupVenmoLink();
    setupParallaxEffect();
    loadShowSchedule();
    setupAdminCode();
    ensureMobileVideoAutoplay(); // Ensure mobile videos autoplay
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
      const formattedDate = !isNaN(date) ? `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}` : 'Date TBD';
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

  function setupAdminCode() {
    const code = [
      'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
      'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
      'KeyB', 'KeyA'
    ];

    let i = 0;

    document.addEventListener('keydown', (event) => {
      const expectedKey = code[i];

      if (event.code === expectedKey) {
        i++;

        if (i === code.length) {
          window.location.href = '/admin/index.html';
          i = 0;
        }
      } else {
        i = 0;
      }
    });
  }

  initialize();
});
