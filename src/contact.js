import { config } from '../content/config.js';
import { setupCommonElements } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize common elements with 'contact' page key to load title/lead from config
    setupCommonElements('contact');

    // --- Contact Form Specific Logic ---

    // 1. Initialize EmailJS
    if (config.ids && config.ids.emailjs) {
        emailjs.init({
            publicKey: config.ids.emailjs.publicKey,
        });
    }

    // 2. Handle Form Submission
    const contactForm = document.getElementById("contact-form");
    if (contactForm) {
        contactForm.addEventListener("submit", function(event) {
            event.preventDefault();
            
            const status = document.getElementById("form-status");
            const btn = document.getElementById("submit-btn");
            
            if (!config.ids || !config.ids.emailjs || !config.ids.emailjs.serviceId) {
                status.textContent = "Error: EmailJS not configured in content/config.js";
                status.classList.add("error");
                return;
            }

            btn.disabled = true;
            btn.textContent = "Sending...";
            status.textContent = "";
            status.className = "form-status";

            emailjs.sendForm(
                config.ids.emailjs.serviceId, 
                config.ids.emailjs.contactTemplateId, 
                this
            )
            .then(() => {
                status.textContent = "Thanks! We've received your message and will follow up soon.";
                status.classList.add("success");
                event.target.reset();
                btn.textContent = "Message Sent";
            }, (error) => {
                console.error('FAILED...', error);
                status.textContent = "Oops! There was a problem submitting your form. Please try again or email us directly.";
                status.classList.add("error");
                btn.disabled = false;
                btn.textContent = "Send Message";
            });
        });
    }
});