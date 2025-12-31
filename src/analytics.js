/**
 * Analytics Module
 * Handles Google Analytics injection and event tracking.
 */

/**
 * Check if QA mode is enabled
 */
function isQAMode() {
    return localStorage.getItem('up_qa_mode') === 'true';
}

/**
 * Initialize QA mode from query parameter
 */
function initQAMode() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('qa') === 'true') {
        localStorage.setItem('up_qa_mode', 'true');
    }
}

export function initAnalytics(config) {
    // Initialize QA mode detection
    initQAMode();

    // Skip analytics if QA mode is enabled
    if (isQAMode()) {
        console.log('🔧 QA Mode: Google Analytics disabled');
        return;
    }

    if (config.ids && config.ids.googleAnalytics) {
      const gaId = config.ids.googleAnalytics;

      // Prevent duplicate injection
      if (!document.querySelector(`script[src*="${gaId}"]`)) {
          const script = document.createElement('script');
          script.async = true;
          script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
          document.head.appendChild(script);

          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          // Make gtag global so other scripts can use it directly if needed
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', gaId);
      }
    }
}

/**
 * Tracks a custom event.
 * @param {string} eventName
 * @param {object} params
 */
export function trackEvent(eventName, params = {}) {
    // Skip tracking if QA mode is enabled
    if (isQAMode()) {
        console.log('🔧 QA Mode - Event not tracked:', eventName, params);
        return;
    }

    if (typeof window.gtag !== 'undefined') {
      window.gtag('event', eventName, params);
    } else {
      console.log('GA Event (Dev):', eventName, params);
    }
}