import { config } from '../content/config.js';
import { initNavigation } from './navigation.js';
import { initAnalytics } from './analytics.js';

/**
 * Initializes common elements found on all pages:
 * - Navigation
 * - Analytics
 * - Footer Copyright
 * - Email Injection
 * - Page Titles/Leads (optional)
 * * @param {string} [pageKey] - Optional key ('contact', 'services', 'quote') to load specific page titles.
 */
export function setupCommonElements(pageKey) {
    // 1. Navigation
    initNavigation(config);

    // 2. Analytics
    initAnalytics(config);

    // 3. Footer Copyright
    const yearSpan = document.getElementById('copyright-year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getUTCFullYear();
    }

    // 4. Email Injection
    // Finds elements with class 'email' (usually in footer or contact sections)
    // and sets their href/text if they are empty or placeholders.
    const emailElements = document.querySelectorAll('.email');
    emailElements.forEach(el => {
        if (config.siteInfo && config.siteInfo.email) {
            // Update text if needed (optional logic, mostly sets href)
            // el.textContent = config.siteInfo.email; 
            if (el.tagName === 'A') {
                el.href = `mailto:${config.siteInfo.email}`;
                // If the link text is generic "email", update it to the address, otherwise keep text like "Contact Us"
                if (el.textContent.includes('@') || el.textContent.trim() === '') {
                   el.textContent = config.siteInfo.email;
                }
            }
        }
    });

    // 5. Page Titles & Subtitles
    if (pageKey && config.pages && config.pages[pageKey]) {
        const pageConfig = config.pages[pageKey];
        const titleEl = document.querySelector('.page-title');
        const leadEl = document.querySelector('.page-lead');

        if (titleEl && pageConfig.title) titleEl.textContent = pageConfig.title;
        if (leadEl && pageConfig.lead) leadEl.textContent = pageConfig.lead;

        // 6. Pre-Production Banner Logic
        if (pageConfig.staging) {
            const banner = document.createElement('div');
            banner.className = 'pre-production-banner';
            banner.textContent = 'PRE-PRODUCTION: THIS PAGE IS NOT PUBLIC';
            document.body.prepend(banner);
        }
    }
}

// --- Date & Time Helpers ---

export function parseLocalDateOnly(dateStr) {
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
  
export function parseTimeToHM(timeStr) {
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

export function dateToIsoWithLocalTz(dLocal) {
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

export function toIsoWithTz(dateStr, timeStr) {
    const base = parseLocalDateOnly(dateStr);
    if (!base || isNaN(base)) return null;
    const { hours, minutes } = parseTimeToHM(timeStr);
    base.setHours(hours, minutes, 0, 0);
    return dateToIsoWithLocalTz(base);
}

export function firstUrl(...candidates) {
    return candidates.find(u => typeof u === "string" && u.trim().length > 0);
}

export function formatCityState(city, state) {
    const c = (city || "").trim();
    const s = (state || "").trim();
    if (c && s) return `${c}, ${s}`;
    return c || s || "";
}