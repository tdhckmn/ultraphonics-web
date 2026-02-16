import { setupCommonElements } from './utils.js';

const emailjsConfig = {
    publicKey: "KhA8Z-PRCg69qMpWp",
    serviceId: "service_eujinnf",
    contactTemplateId: "template_o1lwsxk"
};

document.addEventListener('DOMContentLoaded', () => {
    // Initialize common elements
    setupCommonElements('contact');

    // --- Contact Form Specific Logic ---

    // 1. Initialize EmailJS
    if (emailjsConfig.publicKey) {
        emailjs.init({
            publicKey: emailjsConfig.publicKey,
        });
    }

    // 2. Handle Form Submission
    const contactForm = document.getElementById("contact-form");
    if (contactForm) {
        contactForm.addEventListener("submit", function(event) {
            event.preventDefault();
            
            const status = document.getElementById("form-status");
            const btn = document.getElementById("submit-btn");
            
            if (!emailjsConfig.serviceId) {
                status.textContent = "Error: EmailJS not configured.";
                status.classList.add("error");
                return;
            }

            btn.disabled = true;
            btn.textContent = "Sending...";
            status.textContent = "";
            status.className = "form-status";

            emailjs.sendForm(
                emailjsConfig.serviceId, 
                emailjsConfig.contactTemplateId, 
                this
            )
            .then(() => {
                status.textContent = "Thanks! We\'ve received your message and will follow up soon.";
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