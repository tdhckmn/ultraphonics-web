// FILE: admin.js

document.addEventListener('DOMContentLoaded', () => {
    const CORRECT_PASSWORD = 'DWS';

    // This is now the ONLY pre-populated text.
    const PREPOPULATED_MESSAGE = `We're currently looking to book the following dates:
- [DATE 1]
- [DATE 2]
- [DATE 3]`;

    const loginSection = document.getElementById('login-section');
    const loginForm = document.getElementById('login-form');
    const passwordInput = document.getElementById('password');
    const dashboardSection = document.getElementById('dashboard-section');
    const emailGeneratorTile = document.getElementById('email-generator-tile');
    const generatorForm = document.getElementById('generator-form');

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (passwordInput.value === CORRECT_PASSWORD) {
            loginSection.style.display = 'none';
            dashboardSection.style.display = 'block';
        } else {
            alert('Incorrect password. Please try again.');
        }
    });

    emailGeneratorTile.addEventListener('click', () => {
        generatorForm.style.display = 'block';
        emailGeneratorTile.style.display = 'none';
        document.getElementById('message').value = PREPOPULATED_MESSAGE;
    });

    generatorForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const params = new URLSearchParams();
        params.append('clientName', document.getElementById('client-name').value);
        params.append('casualName', document.getElementById('casual-name').value);
        params.append('signatureName', document.getElementById('signature-name').value);
        params.append('yourPhone', document.getElementById('your-phone').value);
        params.append('message', document.getElementById('message').value);

        window.open(`generated-email.html?${params.toString()}`, '_blank');
    });
});