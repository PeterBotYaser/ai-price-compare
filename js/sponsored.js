// Sponsored Listings Module for TokenMeter
// Handles loading and display of sponsored API providers

const SPONSORED_DATA_URL = 'data/sponsored.json';

let sponsoredData = null;

// Load sponsored data
async function loadSponsoredData() {
  try {
    const response = await fetch(SPONSORED_DATA_URL);
    if (!response.ok) throw new Error('Failed to load sponsored data');
    sponsoredData = await response.json();
    return sponsoredData;
  } catch (error) {
    console.warn('[Sponsored] Could not load sponsored data:', error);
    return null;
  }
}

// Get active sponsored slots
function getActiveSlots() {
  if (!sponsoredData || !sponsoredData.enabled) return [];
  return sponsoredData.slots.filter(slot => {
    if (!slot.active) return false;
    const now = new Date();
    if (slot.startDate && new Date(slot.startDate) > now) return false;
    if (slot.endDate && new Date(slot.endDate) < now) return false;
    return true;
  });
}

// Create sponsored badge HTML
function createSponsoredBadge(type = 'featured', text = 'Sponsored') {
  const badgeClass = {
    'featured': 'sponsored-badge--featured',
    'recommended': 'sponsored-badge--recommended',
    'route': 'sponsored-badge--route'
  }[type] || 'sponsored-badge--featured';

  return `<span class="sponsored-badge ${badgeClass}">
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
    ${text}
  </span>`;
}

// Create sponsored widget for sidebar
function createSponsoredWidget(slot) {
  return `
    <div class="sponsored-widget">
      <div class="sponsored-widget__header">
        ${createSponsoredBadge(slot.type, slot.badge)}
        <span class="sponsored-widget__title">${slot.provider}</span>
      </div>
      <p class="sponsored-widget__text">${slot.description}</p>
      <a href="${slot.url}" target="_blank" rel="noopener sponsored" class="sponsored-widget__cta">
        ${slot.cta}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M7 17L17 7M17 7H7M17 7v10"/>
        </svg>
      </a>
    </div>
  `;
}

// Mark model row as sponsored
function markModelAsSponsored(modelId, slot) {
  const rows = document.querySelectorAll('.model-table tbody tr');
  rows.forEach(row => {
    const modelCell = row.querySelector('td:first-child');
    if (!modelCell) return;
    
    const modelName = modelCell.querySelector('.model-name')?.textContent?.toLowerCase() || '';
    const providerName = modelCell.querySelector('.provider-name')?.textContent?.toLowerCase() || '';
    
    if (modelId && (modelName.includes(modelId.toLowerCase()) || 
        providerName.includes(slot.provider.toLowerCase()))) {
      row.classList.add('sponsored-row');
      const badgeCell = modelCell.querySelector('.model-badges');
      if (badgeCell && !badgeCell.querySelector('.sponsored-badge')) {
        badgeCell.insertAdjacentHTML('afterbegin', createSponsoredBadge(slot.type, slot.badge));
      }
    }
  });
}

// Inject sponsored section before models table
function injectSponsoredSection(slots) {
  const modelsSection = document.getElementById('models');
  if (!modelsSection || !slots.length) return;

  const featuredSlots = slots.filter(s => s.type === 'featured' || s.modelId);
  if (!featuredSlots.length) return;

  const cardsHtml = featuredSlots.map(slot => `
    <div class="sponsored-model-card">
      <div class="sponsored-model-card__badge">${slot.badge}</div>
      <h4>${slot.provider}</h4>
      <p>${slot.description}</p>
      <a href="${slot.url}" target="_blank" rel="noopener sponsored" class="btn btn-primary">
        ${slot.cta}
      </a>
    </div>
  `).join('');

  const sectionHtml = `
    <div class="sponsored-section">
      <div class="sponsored-section__label">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
        Empfohlene Anbieter
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
        ${cardsHtml}
      </div>
    </div>
  `;

  modelsSection.insertAdjacentHTML('afterbegin', sectionHtml);
}

// Add sponsored widgets to sidebar
function addSponsoredToSidebar(slots) {
  const sidebar = document.querySelector('.sidebar') || document.querySelector('[data-sidebar]');
  if (!sidebar) return;

  const routeSlots = slots.filter(s => s.type === 'route' || !s.modelId);
  routeSlots.forEach(slot => {
    sidebar.insertAdjacentHTML('beforeend', createSponsoredWidget(slot));
  });
}

// Initialize sponsored listings
async function initSponsored() {
  await loadSponsoredData();
  if (!sponsoredData) return;

  const activeSlots = getActiveSlots();
  if (!activeSlots.length) return;

  // Inject featured section
  injectSponsoredSection(activeSlots);

  // Add to sidebar
  addSponsoredToSidebar(activeSlots);

  // Mark sponsored models in table (after table is rendered)
  setTimeout(() => {
    activeSlots.forEach(slot => {
      if (slot.modelId) {
        markModelAsSponsored(slot.modelId, slot);
      }
    });
  }, 100);
}

// Auto-init if DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSponsored);
} else {
  initSponsored();
}

export { loadSponsoredData, getActiveSlots, initSponsored };
