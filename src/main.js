import { config } from '../../content/config.js';

document.addEventListener('DOMContentLoaded', async () => {
  // --- 1. Fetch Data First ---
  let shows = [];
  try {
    const response = await fetch('../api/shows.json');
    if (!response.ok) {
      throw new Error('Failed to load show data.');
    }
    shows = await response.json();
  } catch (error) {
    console.error(error);
  }
  
  const siteContent = {
    shows,
    ...config,
  };

  const { venmo, selectors, hero, services } = siteContent;

  // --- 2. Define All Functions ---

  function firstUrl(...candidates) {
    return candidates.find(u => typeof u === "string" && u.trim().length > 0);
  }
  
  function formatCityState(city, state) {
    const c = (city || "").trim();
    const s = (state || "").trim();
    if (c && s) return `${c}, ${s}`;
    return c || s || "";
  }
  
  function ensureMobileVideoAutoplay() {
    const mobileVideo = document.querySelector('.hero-video-mobile');
    const desktopVideo = document.querySelector('.hero-video-desktop');
    if (!mobileVideo || !desktopVideo) return;
    const playVideo = (video) => {
      if (video.paused) {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.log('Video autoplay failed:', error);
            document.addEventListener('touchstart', () => {
              video.play().catch(e => console.log('Still failed:', e));
            }, { once: true });
          });
        }
      }
    };
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      playVideo(mobileVideo);
      mobileVideo.load();
      setTimeout(() => playVideo(mobileVideo), 100);
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && mobileVideo.paused) {
          playVideo(mobileVideo);
        }
      });
    } else {
      playVideo(desktopVideo);
    }
  }

  function parseLocalDateOnly(dateStr) {
    if (!dateStr) return null;
    const iso = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) {
      const [, y, m, d] = iso.map(Number);
      return new Date(y, m - 1, d, 0, 0, 0, 0);
    }
    const us = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (us) {
      const [, m, d, y] = us.map(Number);
      return new Date(y, m - 1, d, 0, 0, 0, 0);
    }
    return new Date(dateStr);
  }

  function parseTimeToHM(timeStr) {
    if (!timeStr) return { hours: 0, minutes: 0, isAM: false, isPM: false };
    const parts = timeStr.trim().split(/\s+/);
    const [hStr, mStr = "00"] = parts[0].split(":");
    let h = parseInt(hStr, 10);
    const ampm = (parts[1] || "").toUpperCase();
    const isAM = ampm === "AM";
    const isPM = ampm === "PM";
    if (isPM && h !== 12) h += 12;
    if (isAM && h === 12) h = 0;
    return { hours: h, minutes: parseInt(mStr, 10), isAM, isPM };
  }

  function dateToIsoWithLocalTz(dLocal) {
    const pad = n => String(n).padStart(2, "0");
    const y = dLocal.getFullYear();
    const mo = pad(dLocal.getMonth() + 1);
    const da = pad(dLocal.getDate());
    const H = pad(dLocal.getHours());
    const M = pad(dLocal.getMinutes());
    const S = pad(dLocal.getSeconds());
    const tzMinutes = -dLocal.getTimezoneOffset();
    const sign = tzMinutes >= 0 ? "+" : "-";
    const offAbs = Math.abs(tzMinutes);
    const offH = pad(Math.floor(offAbs / 60));
    const offM = pad(offAbs % 60);
    return `${y}-${mo}-${da}T${H}:${M}:${S}${sign}${offH}:${offM}`;
  }

  function toIsoWithTz(dateStr, timeStr) {
    const base = parseLocalDateOnly(dateStr);
    if (!base || isNaN(base)) return null;
    const { hours, minutes } = parseTimeToHM(timeStr);
    base.setHours(hours, minutes, 0, 0);
    return dateToIsoWithLocalTz(base);
  }

  function injectStructuredData() {
    const SITE = "https://www.ultraphonicsmusic.com/";
    const DEFAULT_IMAGE = SITE + "assets/images/logo.jpg";
    const musicGroup = { "@id": SITE + "#musicgroup", "@type": "MusicGroup", name: "Ultraphonics", alternateName: "Ultraphonics Music", url: SITE, image: DEFAULT_IMAGE, logo: DEFAULT_IMAGE, genre: ["Rock", "Pop", "Country", "Soul"], description: "Ultraphonics is a high-energy variety band playing Rock, Pop, Country & Soul for weddings, events, and bars in Detroit, Ann Arbor, and Toledo.", sameAs: ["https://www.facebook.com/UltraphonicsMusic", "https://www.instagram.com/ultraphonicsmusic"], contactPoint: { "@type": "ContactPoint", email: "info@ultraphonicsmusic.com", contactType: "booking" } };
    const events = (siteContent.shows || []).filter(s => !s.isPrivate && s.startTime).map(s => { const startDateIso = toIsoWithTz(s.date, s.startTime); if (!startDateIso) return null; let endDateIso; if (s.endTime) { const startBase = parseLocalDateOnly(s.date); const { hours: sh, minutes: sm } = parseTimeToHM(s.startTime); const { hours: eh, minutes: em } = parseTimeToHM(s.endTime); const endBase = new Date(startBase.getTime()); endBase.setHours(eh, em, 0, 0); if (endBase <= new Date(startBase.getFullYear(), startBase.getMonth(), startBase.getDate(), sh, sm, 0, 0)) { endBase.setDate(endBase.getDate() + 1); } endDateIso = dateToIsoWithLocalTz(endBase); } const address = { "@type": "PostalAddress", addressCountry: "US" }; if (s.streetAddress) address.streetAddress = s.streetAddress; if (s.city) address.addressLocality = s.city; if (s.state) address.addressRegion = s.state; if (s.postalCode) address.postalCode = s.postalCode; const location = { "@type": "Place", name: s.venue?.trim() || "Venue TBD", address: address }; const cityState = formatCityState(s.city, s.state); const description = s.description || (cityState ? `Live performance by Ultraphonics at ${s.venue || "venue TBD"} in ${cityState}.` : `Live performance by Ultraphonics at ${s.venue || "venue TBD"}.`); let offers; const offerUrl = firstUrl(s.ticketUrl, s.eventLink); const hasPrice = typeof s.price === "number"; if (offerUrl || hasPrice) { offers = { "@type": "Offer", url: offerUrl || (SITE + "#shows"), ...(hasPrice ? { "price": s.price } : {}), priceCurrency: s.currency || "USD", availability: "https://schema.org/InStock" }; } const eventUrl = firstUrl(s.eventLink, s.ticketUrl, SITE + "#shows"); const eventObj = { "@type": "Event", name: `Ultraphonics at ${s.venue?.trim() || "TBD"}`, eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode", eventStatus: "https://schema.org/EventScheduled", startDate: startDateIso, ...(endDateIso ? { "endDate": endDateIso } : {}), location: location, image: s.image || DEFAULT_IMAGE, description: description, organizer: { "@type": "Organization", name: s.organizerName || s.venue || "Ultraphonics" }, performer: { "@id": SITE + "#musicgroup" }, ...(offers ? { "offers": offers } : {}), url: eventUrl }; return eventObj; }).filter(Boolean);
    const graph = { "@context": "https://schema.org", "@graph": [musicGroup, ...events] };
    const existing = document.getElementById("ld-json-ultraphonics");
    if (existing) existing.remove();
    const script = document.createElement("script");
    script.id = "ld-json-ultraphonics";
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(graph);
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
      listItem.textContent = itemText;
      servicesGrid.appendChild(listItem);
    });
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

  function loadShowSchedule() {
    const showsContainer = document.querySelector(selectors.showsContainer);
    if (!showsContainer) return;

    const currentYear = new Date().getFullYear();
    
    const showsForCurrentYear = siteContent.shows
      .filter(show => new Date(show.date).getFullYear() === currentYear)
      .sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort shows chronologically

    if (showsForCurrentYear.length === 0) {
      const noShowsMessage = document.createElement('p');
      noShowsMessage.textContent = "Check back soon for new show dates!";
      showsContainer.appendChild(noShowsMessage);
      return;
    }
    
    renderShows(currentYear, showsForCurrentYear, showsContainer);
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
      // Use UTC methods to avoid timezone issues when formatting the date string
      const formattedDate = !isNaN(date) ? `${String(date.getUTCMonth() + 1).padStart(2, '0')}/${String(date.getUTCDate()).padStart(2, '0')}` : 'Date TBD';
      const div = document.createElement('div');
      if (row.isPrivate) {
        div.textContent = `${formattedDate} • Private Event`;
      } else {
        const venueText = row.venue?.trim() || 'Venue TBD';
        const city = row.city || '';
        const state = row.state || '';
        const time = row.startTime?.replace(':00', '') || '';
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
    const code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
    let i = 0;
    document.addEventListener('keydown', (event) => {
      if (event.code === code[i]) {
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

  // --- 3. Run Initialization Functions ---
  injectStructuredData();
  populateTextContent();
  setupEventListeners();
  setupVenmoLink();
  loadShowSchedule();
  setupAdminCode();
  ensureMobileVideoAutoplay();
});