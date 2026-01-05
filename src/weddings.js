import { config } from '../content/config.js';
import { setupCommonElements } from './utils.js';
import { trackEvent } from './analytics.js';

document.addEventListener('DOMContentLoaded', () => {
    setupCommonElements('weddings');

    const container = document.getElementById('wedding-services-list');
    const items = config.weddingPage ? config.weddingPage.items : [];

    if (container && items.length > 0) {
        items.forEach((item) => {
            const featuresHtml = item.features
                ? `<ul class="service-features">
                    ${item.features.map(f => `<li>${f}</li>`).join('')}
                   </ul>`
                : '';

            const attributionHtml = item.attribution
                ? `<div class="photo-attribution">${item.attribution}</div>`
                : '';

            const card = document.createElement('div');
            card.className = 'service-card';
            card.innerHTML = `
                <div class="service-image-container">
                    <img src="${item.image}" alt="${item.title}" class="service-image" loading="lazy" />
                    ${attributionHtml}
                </div>
                <div class="service-content">
                    <h2 class="service-title">${item.title}</h2>
                    <p class="service-description">${item.description}</p>
                    ${featuresHtml}
                </div>
            `;
            container.appendChild(card);
        });
    }

    // Setup analytics tracking for CTA buttons
    setupWeddingAnalytics();
});

function setupWeddingAnalytics() {
    // Track all "Get a Quote" buttons
    const quoteButtons = document.querySelectorAll('a[href="quote-request.html"]');
    quoteButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const buttonText = button.textContent.trim();
            trackEvent('quote_request_click', {
                page: 'weddings',
                button_text: buttonText,
                button_location: buttonText === 'Check Availability' ? 'top' :
                                 buttonText === 'Get a Quote' ? 'bottom_cta' : 'unknown'
            });
        });
    });

    // Track wedding flyer downloads
    const flyerButton = document.querySelector('a[download][href*="drive.google.com"]');
    if (flyerButton) {
        flyerButton.addEventListener('click', () => {
            trackEvent('flyer_download', {
                page: 'weddings',
                flyer_type: 'wedding'
            });
        });
    }

    // Track permanent contact link
    const permanentLink = document.querySelector('.permanent-contact-link');
    if (permanentLink) {
        permanentLink.addEventListener('click', () => {
            trackEvent('quote_request_click', {
                page: 'weddings',
                button_text: 'Request a Quote',
                button_location: 'permanent_link'
            });
        });
    }
}