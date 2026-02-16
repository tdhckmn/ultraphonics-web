import { setupCommonElements } from './utils.js';

const emailjsConfig = {
    publicKey: "KhA8Z-PRCg69qMpWp",
    serviceId: "service_eujinnf",
    quoteTemplateId: "template_0i5n9gk"
};

document.addEventListener('DOMContentLoaded', () => {
    // Initialize common elements
    setupCommonElements('quote');

    // --- Quote Form Specific Logic ---

    /* --- Auto-select event type from URL parameter --- */
    const urlParams = new URLSearchParams(window.location.search);
    const eventType = urlParams.get('event_type');
    if (eventType) {
        const eventTypeValue = eventType.charAt(0).toUpperCase() + eventType.slice(1).toLowerCase();
        const radioButton = document.querySelector(`input[name="event_type"][value="${eventTypeValue}"]`);
        if (radioButton) {
            radioButton.checked = true;
            // Trigger change event in case there's any dependent logic
            radioButton.dispatchEvent(new Event('change'));
        }
    }

    /* --- Initialize EmailJS --- */
    if (emailjsConfig.publicKey) {
        emailjs.init({
            publicKey: emailjsConfig.publicKey,
        });
    }

    /* --- Multi-Step Logic --- */
    let currentStep = 1;
    const totalSteps = 5;

    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    const submitBtn = document.getElementById("submitBtn");

    function showStep(step) {
        document.querySelectorAll('.step-content').forEach(el => el.classList.remove('active'));
        const stepEl = document.getElementById(`step-${step}`);
        if(stepEl) stepEl.classList.add('active');
        
        document.querySelectorAll('.progress-step').forEach((el, idx) => {
            if (idx < step) el.classList.add('active');
            else el.classList.remove('active');
        });

        if (step === 1) prevBtn.style.display = 'none';
        else prevBtn.style.display = 'inline-block';

        if (step === totalSteps) {
            nextBtn.style.display = 'none';
            submitBtn.style.display = 'inline-block';
        } else {
            nextBtn.style.display = 'inline-block';
            submitBtn.style.display = 'none';
        }
    }

    function validateStep(step) {
        const stepEl = document.getElementById(`step-${step}`);
        if (!stepEl) return true;
        
        const inputs = stepEl.querySelectorAll('input[required], select[required]');
        let valid = true;
        
        inputs.forEach(input => {
            if (!input.value.trim()) {
                valid = false;
                input.style.borderColor = 'red';
                input.addEventListener('input', () => input.style.borderColor = '#444', {once: true});
            }
        });

        if (step === 2) {
             const radioGroup = stepEl.querySelector('input[name="event_type"]:checked');
             const radios = stepEl.querySelectorAll('input[name="event_type"]');
             if (radios.length > 0 && !radioGroup) {
                 valid = false;
                 alert("Please select an event type.");
             }
        }
        return valid;
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (validateStep(currentStep)) {
                currentStep++;
                showStep(currentStep);
                window.scrollTo(0, 0);
            }
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentStep > 1) {
                currentStep--;
                showStep(currentStep);
                window.scrollTo(0, 0);
            }
        });
    }

    /* --- Other Field Toggle --- */
    document.querySelectorAll('input[name="event_type"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const container = document.getElementById('event_type_other_container');
            if(e.target.value === 'Other') {
                container.style.display = 'block';
                container.querySelector('input').focus();
            } else {
                container.style.display = 'none';
            }
        });
    });

    /* --- Form Submission with EmailJS --- */
    const quoteForm = document.getElementById("quote-form");
    if (quoteForm) {
        quoteForm.addEventListener("submit", function(event) {
        event.preventDefault();
        
        const status = document.getElementById("form-status");
        
        if (!emailjsConfig.serviceId) {
            status.textContent = "Error: EmailJS not configured.";
            status.classList.add("error");
            return;
        }
        
        submitBtn.disabled = true;
        submitBtn.textContent = "Sending...";
        status.textContent = "";

        // Send via EmailJS
        emailjs.sendForm(
            emailjsConfig.serviceId, 
            emailjsConfig.quoteTemplateId, 
            this
        )
        .then(() => {
            status.textContent = "Thank you! We have received your inquiry and will be in touch shortly.";
            status.style.color = "var(--color-accent)";
            event.target.reset();
            submitBtn.textContent = "Sent";
            document.querySelector('.form-navigation').style.display = 'none';
        }, (error) => {
            console.error('FAILED...', error);
            status.textContent = "Oops! There was a problem submitting your form.";
            status.style.color = "red";
            submitBtn.disabled = false;
            submitBtn.textContent = "Request Quote";
        });
        });
    }

    // Initialize
    showStep(1);
});