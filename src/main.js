import { config } from '../content/config.js';
import { trackEvent } from './analytics.js';
import { initMailerLite } from './mailer-lite.js';
import { 
    setupCommonElements, 
    parseLocalDateOnly, 
    parseTimeToHM, 
    dateToIsoWithLocalTz, 
    toIsoWithTz, 
    firstUrl, 
    formatCityState 
} from './utils.js';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Setup Navigation, Analytics, Footer
  setupCommonElements('home'); 

  // 2. Setup MailerLite
  initMailerLite();

  // --- Home Page Specific Logic ---
  
  let shows = [];
  try {
    const response = await fetch(`content/shows.json?v=${new Date().getTime()}`);
    if (response.ok) {
      shows = await response.json();
    }
  } catch (error) {
    console.error(error);
  }

  const { tipping, selectors, hero, services, links } = config;

  // --- Helper Functions Specific to Home Page Logic ---

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

  function injectStructuredData() {
    const SITE = "https://www.ultraphonicsmusic.com/";
    const DEFAULT_IMAGE = SITE + "assets/images/logo-color.png";
    const musicGroup = { "@id": SITE + "#musicgroup", "@type": "MusicGroup", name: "Ultraphonics", alternateName: "Ultraphonics Music", url: SITE, image: DEFAULT_IMAGE, logo: DEFAULT_IMAGE, genre: ["Rock", "Pop", "Country", "Soul"], description: "Ultraphonics is a high-energy variety band playing Rock, Pop, Country & Soul for weddings, events, and bars in Detroit, Ann Arbor, and Toledo.", sameAs: ["https://www.facebook.com/UltraphonicsMusic", "https://www.instagram.com/ultraphonicsmusic"], contactPoint: { "@type": "ContactPoint", email: "info@ultraphonicsmusic.com", contactType: "booking" } };
    const events = (shows || []).filter(s => s.published && !s.isPrivate && s.startTime).map(s => { const startDateIso = toIsoWithTz(s.date, s.startTime); if (!startDateIso) return null; let endDateIso; if (s.endTime) { const startBase = parseLocalDateOnly(s.date); const { hours: sh, minutes: sm } = parseTimeToHM(s.startTime); const { hours: eh, minutes: em } = parseTimeToHM(s.endTime); const endBase = new Date(startBase.getTime()); endBase.setHours(eh, em, 0, 0); if (endBase <= new Date(startBase.getFullYear(), startBase.getMonth(), startBase.getDate(), sh, sm, 0, 0)) { endBase.setDate(endBase.getDate() + 1); } endDateIso = dateToIsoWithLocalTz(endBase); } const address = { "@type": "PostalAddress", addressCountry: "US" }; if (s.streetAddress) address.streetAddress = s.streetAddress; if (s.city) address.addressLocality = s.city; if (s.state) address.addressRegion = s.state; if (s.postalCode) address.postalCode = s.postalCode; const location = { "@type": "Place", name: s.venue?.trim() || "Venue TBD", address: address }; const cityState = formatCityState(s.city, s.state); const description = s.description || (cityState ? `Live performance by Ultraphonics at ${s.venue || "venue TBD"} in ${cityState}.` : `Live performance by Ultraphonics at ${s.venue || "venue TBD"}.`); let offers; const offerUrl = firstUrl(s.ticketUrl, s.eventLink); const hasPrice = typeof s.price === "number"; if (offerUrl || hasPrice) { offers = { "@type": "Offer", url: offerUrl || (SITE + "#shows"), ...(hasPrice ? { "price": s.price } : {}), priceCurrency: s.currency || "USD", availability: "https://schema.org/InStock" }; } const eventUrl = firstUrl(s.eventLink, s.ticketUrl, SITE + "#shows"); const eventObj = { "@type": "Event", name: `Ultraphonics at ${s.venue?.trim() || "TBD"}`, eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode", eventStatus: "https://schema.org/EventScheduled", startDate: startDateIso, ...(endDateIso ? { "endDate": endDateIso } : {}), location: location, image: s.image || DEFAULT_IMAGE, description: description, organizer: { "@type": "Organization", name: s.organizerName || s.venue || "Ultraphonics" }, performer: { "@id": SITE + "#musicgroup" }, ...(offers ? { "offers": offers } : {}), url: eventUrl }; return eventObj; }).filter(Boolean);
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
    if (document.querySelector(selectors.bandName)) document.querySelector(selectors.bandName).textContent = hero.bandName;
    if (document.querySelector(selectors.tagline)) document.querySelector(selectors.tagline).textContent = hero.tagline;
    if (document.querySelector(selectors.genres)) document.querySelector(selectors.genres).textContent = hero.genres;
  }

  function setupEventListeners() {
    const urlParams = new URLSearchParams(window.location.search);
    const source = urlParams.get('utm_source') || urlParams.get('src');
    const medium = urlParams.get('utm_medium');

    if (source === 'qr_code' || source === 'qr') {
      trackEvent('campaign_visit', { source: 'qr_code', medium: medium || 'offline' });
    } else if (source === 'email') {
      trackEvent('campaign_visit', { source: 'email', medium: medium || 'newsletter' });
    }

    const contactButton = document.querySelector(selectors.contactButton);
    if (contactButton) {
      contactButton.addEventListener('click', () => trackEvent('contact_click', { method: 'cta_button' }));
    }
  }

  function setupSocialButtons() {
    const fbButton = document.querySelector('.fb-link');
    const instaButton = document.querySelector('.insta-link');
    const ytButton = document.querySelector('.yt-link');
    const emailButton = document.querySelector('.email');

    if (fbButton) {
      fbButton.addEventListener('click', () => {
          trackEvent('social_click', { platform: 'Facebook' });
      });
    }
    if (instaButton) {
      instaButton.addEventListener('click', () => {
          trackEvent('social_click', { platform: 'Instagram' });
      });
    }
    if (ytButton) {
      ytButton.addEventListener('click', () => {
          trackEvent('social_click', { platform: 'YouTube' });
      });
    }
    if (emailButton) {
      emailButton.addEventListener('click', () => {
          trackEvent('contact_click', { method: 'footer_email' });
      });
    }
  }

  function setupSectionTracking() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.id;
          trackEvent('section_view', { section_name: sectionId });
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
  
    const showsSection = document.getElementById('shows');
    if (showsSection) observer.observe(showsSection);

    const servicesSection = document.getElementById('services');
    if (servicesSection) observer.observe(servicesSection);
  }

  function setupTippingModal() {
    const tipButton = document.querySelector(selectors.tipButton);
    const modal = document.getElementById('tip-modal');
    const closeModal = modal ? modal.querySelector('.close-modal') : null;

    if (!tipButton || !modal) return;

    const venmoLink = document.getElementById('venmo-link');
    const cashappLink = document.getElementById('cashapp-link');
    const paypalLink = document.getElementById('paypal-link');

    const { venmo, cashApp, payPal, tipAmount, note } = tipping;
    const encodedNote = encodeURIComponent(note);

    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isIOS) {
        venmoLink.href = `venmo://paycharge?txn=pay&recipients=${venmo}&amount=${tipAmount}&note=${encodedNote}`;
    } else {
        venmoLink.href = `https://account.venmo.com/u/${venmo}?txn=pay&amount=${tipAmount}&note=${encodedNote}`;
    }

    cashappLink.href = `https://cash.app/\$${cashApp}/${tipAmount}`;
    paypalLink.href = `https://paypal.me/${payPal}/${tipAmount}`;

    tipButton.addEventListener('click', () => {
      trackEvent('tip_modal_open');
      modal.style.display = 'flex';
      document.body.classList.add('modal-open');
    });

    const hideModal = () => {
      modal.style.display = 'none';
      document.body.classList.remove('modal-open');
    };

    if (closeModal) closeModal.addEventListener('click', hideModal);

    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        hideModal();
      }
    });

    venmoLink.addEventListener('click', () => trackEvent('tip_click', { method: 'Venmo' }));
    cashappLink.addEventListener('click', () => trackEvent('tip_click', { method: 'CashApp' }));
    paypalLink.addEventListener('click', () => trackEvent('tip_click', { method: 'PayPal' }));
  }

  function setupRequestModal() {
    const requestButton = document.querySelector(selectors.requestButton);
    const requestModal = document.getElementById('request-modal');
    const tipModal = document.getElementById('tip-modal'); 
    const closeModal = requestModal ? requestModal.querySelector('.close-modal') : null;

    if (!requestButton || !requestModal) return;

    const setlistLink = document.getElementById('setlist-request-link');
    const fbLink = document.getElementById('fb-message-link');

    requestButton.addEventListener('click', () => {
      trackEvent('request_modal_open');
      requestModal.style.display = 'flex';
      document.body.classList.add('modal-open');
    });

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('utm_campaign') === '2026_survey_post') {
        setTimeout(() => {
            requestModal.style.display = 'flex';
            document.body.classList.add('modal-open');
            trackEvent('request_modal_auto_open', { source: 'campaign_url' });
        }, 500);
    }

    const hideRequestModal = () => {
      requestModal.style.display = 'none';
      document.body.classList.remove('modal-open');
    };

    const switchToTipModal = () => {
      hideRequestModal(); 
      if (tipModal) {
        setTimeout(() => {
            tipModal.style.display = 'flex';
            document.body.classList.add('modal-open');
            trackEvent('tip_modal_open', { source: 'request_flow' });
        }, 300);
      }
    };

    if (closeModal) closeModal.addEventListener('click', hideRequestModal);

    requestModal.addEventListener('click', (event) => {
      if (event.target === requestModal) {
        hideRequestModal();
      }
    });

    if (setlistLink) {
        setlistLink.addEventListener('click', () => {
            trackEvent('request_click', { type: 'Setlist Form' });
            hideRequestModal(); 
        });
    }
    
    if (fbLink) {
        fbLink.addEventListener('click', () => {
            trackEvent('request_click', { type: 'Facebook Message' });
            switchToTipModal();
        });
    }
  }

  function loadShowSchedule() {
    const showsContainer = document.querySelector(selectors.showsContainer);
    if (!showsContainer) return;
    const currentYear = new Date().getFullYear();

    const showsForCurrentYear = shows
      .filter(show => show.published && new Date(show.date).getFullYear() === currentYear)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (showsForCurrentYear.length === 0) {
      const noShowsMessage = document.createElement('p');
      noShowsMessage.textContent = "Check back soon for new show dates!";
      showsContainer.appendChild(noShowsMessage);
      return;
    }

    renderShows(currentYear, showsForCurrentYear, showsContainer);
  }

  function renderShows(year, data, container) {
    const heading = document.createElement('h2');
    heading.textContent = `${year} Events`;
    heading.classList.add('section-heading');
    container.appendChild(heading);

    data.forEach((row) => {
      const date = new Date(row.date);
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
    a.addEventListener('click', () => {
        trackEvent('view_show_details', {
            event_category: 'Schedule',
            event_label: row.venue?.trim(),
            show_date: row.date
        });
    });
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

  function setupWeddingsPromoTracking() {
    const weddingsPromoButton = document.getElementById('weddings-promo-button');
    if (weddingsPromoButton) {
      weddingsPromoButton.addEventListener('click', () => {
        trackEvent('weddings_promo_click', {
          page: 'home',
          button_text: 'Explore Wedding Services',
          button_location: 'weddings_promo_section'
        });
      });
    }
  }

  injectStructuredData();
  populateTextContent();
  setupEventListeners();
  setupSocialButtons();
  setupSectionTracking();
  setupTippingModal();
  setupRequestModal();
  setupWeddingsPromoTracking();
  loadShowSchedule();
  setupAdminCode();
  ensureMobileVideoAutoplay();
});