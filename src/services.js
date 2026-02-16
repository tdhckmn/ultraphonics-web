import { setupCommonElements } from './utils.js';
import { trackEvent } from './analytics.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize common elements with 'services' page key
    setupCommonElements('services');

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