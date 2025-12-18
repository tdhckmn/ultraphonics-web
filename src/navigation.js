/**
 * Shared Navigation Logic
 * Renders menu items from config and handles toggle/interaction behaviors.
 * @param {Object} config - The configuration object containing the navigation array.
 */
export function initNavigation(config) {
    const navToggle = document.getElementById('nav-toggle');
    const navOverlay = document.getElementById('nav-overlay');
    const navList = document.getElementById('nav-list');
  
    // Ensure all elements exist before proceeding
    if (!navToggle || !navOverlay || !navList) return;
  
    // 1. Render Menu Items
    if (config.navigation) {
        navList.innerHTML = ''; 
        config.navigation.forEach(item => {
            const li = document.createElement('li');
            li.className = 'nav-item';
            const a = document.createElement('a');
            a.href = item.link;
            a.textContent = item.label;
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