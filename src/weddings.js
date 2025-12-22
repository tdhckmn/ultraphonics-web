import { config } from '../content/config.js';
import { setupCommonElements } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    setupCommonElements('weddings');

    const container = document.getElementById('wedding-services-list');
    const items = config.weddingPage ? config.weddingPage.items : [];

    if (container && items.length > 0) {
        items.forEach((item) => {
            const featuresHtml = item.features 
                ? `<ul class="service-features">
                    ${item.features.map(f => `<li>${f}</li>`).join('')}
                   </ul>`
                : '';
            
            const attributionHtml = item.attribution 
                ? `<div class="photo-attribution">${item.attribution}</div>` 
                : '';
            
            const card = document.createElement('div');
            card.className = 'service-card';
            card.innerHTML = `
                <div class="service-image-container">
                    <img src="${item.image}" alt="${item.title}" class="service-image" loading="lazy" />
                    ${attributionHtml}
                </div>
                <div class="service-content">
                    <h2 class="service-title">${item.title}</h2>
                    <p class="service-description">${item.description}</p>
                    ${featuresHtml}
                </div>
            `;
            container.appendChild(card);
        });
    }
});