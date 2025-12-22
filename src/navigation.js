/**
 * Shared Navigation Logic
 * Renders menu items from config and handles toggle/interaction behaviors.
 * @param {Object} config - The configuration object containing the pages object.
 */
export function initNavigation(config) {
    const navToggle = document.getElementById('nav-toggle');
    const navOverlay = document.getElementById('nav-overlay');
    const navList = document.getElementById('nav-list');
  
    // Ensure all elements exist before proceeding
    if (!navToggle || !navOverlay || !navList) return;
  
    // 1. Render Menu Items
    if (config.pages) {
        navList.innerHTML = ''; 
        
        // Convert pages object to array of values to iterate
        Object.values(config.pages).forEach(page => {
            // Check if page should be hidden from navigation or if it lacks a link/label
            if (page.hide || !page.link || !page.label || page.staging) return;

            const li = document.createElement('li');
            li.className = 'nav-item';
            const a = document.createElement('a');
            a.href = page.link;
            a.textContent = page.label;
            a.className = 'nav-link';
            li.appendChild(a);
            navList.appendChild(li);
        });
    }
  
    // 2. Toggle Menu (Open/Close)
    navToggle.addEventListener('click', () => {
        navToggle.classList.toggle('open');
        navOverlay.classList.toggle('open');
        document.body.classList.toggle('modal-open');
    });
  
    // 3. Close on Link Click
    navList.addEventListener('click', (e) => {
        if (e.target.tagName === 'A') {
            navToggle.classList.remove('open');
            navOverlay.classList.remove('open');
            document.body.classList.remove('modal-open');
        }
    });
}