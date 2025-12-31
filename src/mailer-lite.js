import { trackEvent } from './analytics.js';

/**
 * Handles MailerLite interactions and the "Admin Backdoor".
 */
export function initMailerLite() {
    const mailerLiteForm = document.querySelector('form[action*="mailerlite.com"]');
    if (!mailerLiteForm) return;

    const emailInput = mailerLiteForm.querySelector('input[name="fields[email]"]');
    const submitButton = mailerLiteForm.querySelector('button[type="submit"]');

    if (!emailInput || !submitButton) return;

    let isAdminMode = false;

    // Admin access emails and secret code
    const adminEmails = [
      'dishwasher',
      'tomh@duck.com',
      'thomasdhickman@gmail.com',
      'an.fiolek@gmail.com',
      'lesterburton17@gmail.com',
      'davidbigham1@gmail.com',
      'shelleycatalan@gmail.com'
    ];

    // Detect "secret code" or band member email for admin
    emailInput.addEventListener('input', () => {
      const currentValue = emailInput.value.toLowerCase().trim();
      if (adminEmails.includes(currentValue)) {
        submitButton.textContent = 'Go to Admin';
        isAdminMode = true;
      } else {
        submitButton.textContent = 'Sign up';
        isAdminMode = false;
      }
    });

    submitButton.addEventListener('click', (event) => {
      if (isAdminMode) {
        event.preventDefault(); 
        window.location.href = '/admin/index.html'; 
      } else {
        trackEvent('mailing_list_signup');
      }
    });
}