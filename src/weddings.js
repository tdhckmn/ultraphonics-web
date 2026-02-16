import { setupCommonElements } from './utils.js';
import { trackEvent } from './analytics.js';

document.addEventListener('DOMContentLoaded', () => {
    setupCommonElements('weddings');
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