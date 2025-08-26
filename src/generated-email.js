// FILE: generated-email.js

(async function generateEmail() {
    try {
        const params = new URLSearchParams(window.location.search);
        const clientName = params.get('clientName') || '';
        const casualName = params.get('casualName') || '';
        const signatureName = params.get('signatureName') || '';
        const yourPhone = params.get('yourPhone') || '';
        const message = params.get('message') || '';

        const response = await fetch('email-template.html');
        if (!response.ok) {
            throw new Error(`Failed to fetch template: ${response.statusText}`);
        }
        let templateText = await response.text();

        const messageHTML = message.split('\n').map(line => `<p>${line}</p>`).join('');

        // Replace the new, correct placeholders
        const finalEmailHTML = templateText
            .replace('[clientName]', clientName)
            .replace('[casualName]', casualName)
            .replace('[messageHTML]', messageHTML)
            .replace('[yourPhone]', yourPhone)
            .replace('[signatureName]', signatureName);

        // Replace the entire page with the final HTML
        document.open();
        document.write(finalEmailHTML);
        document.close();

    } catch (error) {
        document.body.innerHTML = `<p style="font-family: sans-serif; color: red; padding: 20px;"><strong>Error:</strong> ${error.message}</p>`;
        console.error(error);
    }
})();