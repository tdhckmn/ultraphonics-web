import { config } from '../content/config.js';
import { setupCommonElements } from './utils.js';
import { trackEvent } from './analytics.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize common elements with 'services' page key
    setupCommonElements('services');

    // --- Services Page Specific Logic ---

    const container = document.getElementById('services-list');
    const items = config.services.detailedItems || [];

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

            const buttonHtml = item.button
                ? `<div style="margin-top: 1rem;"><a href="${item.button.link}" class="button service-card-btn" data-service-title="${item.title}" style="font-size: 1rem; padding: 0.5rem 1rem;">${item.button.title}</a></div>`
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
                    ${buttonHtml}
                </div>
            `;
            container.appendChild(card);
        });
    }

    // Setup analytics tracking for all CTA buttons
    setupServicesAnalytics();
});

function setupServicesAnalytics() {
    // Track main quote request buttons
    const quoteButtons = document.querySelectorAll('a[href="quote-request.html"]');
    quoteButtons.forEach((button) => {
        // Skip service card buttons (they have their own tracking)
        if (button.classList.contains('service-card-btn')) return;

        button.addEventListener('click', () => {
            const buttonText = button.textContent.trim();
            trackEvent('quote_request_click', {
                page: 'services',
                button_text: buttonText,
                button_location: buttonText === 'Start Your Inquiry' ? 'top' :
                                 buttonText === 'Book Now' ? 'bottom_cta' : 'unknown'
            });
        });
    });

    // Track service-specific buttons in cards
    const serviceCardButtons = document.querySelectorAll('.service-card-btn');
    serviceCardButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const serviceTitle = button.getAttribute('data-service-title');
            const buttonText = button.textContent.trim();
            trackEvent('service_specific_click', {
                page: 'services',
                service_name: serviceTitle,
                button_text: buttonText
            });
        });
    });

    // Track permanent contact link
    const permanentLink = document.querySelector('.permanent-contact-link');
    if (permanentLink) {
        permanentLink.addEventListener('click', () => {
            trackEvent('quote_request_click', {
                page: 'services',
                button_text: 'Request a Quote',
                button_location: 'permanent_link'
            });
        });
    }
}