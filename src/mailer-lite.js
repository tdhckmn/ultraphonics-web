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

    // Detect "secret code" for admin
    emailInput.addEventListener('input', () => {
      const currentValue = emailInput.value.toLowerCase();
      if (currentValue === 'dishwasher') {
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