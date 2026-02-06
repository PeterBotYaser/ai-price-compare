// AI Price Compare - client-side rendering (no build step)

const DATA_URL = 'data/prices.json';

// Comparison state
let comparisonState = {
  selected: new Set(),
  maxCompare: 3
};

function money(amount, currency = 'USD') {
  if (amount == null || Number.isNaN(amount)) return '-';
  const v = Number(amount);
  // Keep it simple + predictable across browsers (avoid Intl edge cases in static hosting)
  const prefix = currency === 'USD' ? '$' : `${currency} `;
  return `${prefix}${v.toFixed(2)}`;
}

function numberWithSeparators(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '';
  return v.toLocaleString('de-DE');
}

function badgeClass(category) {
  const c = (category || '').toLowerCase();
  if (c.includes('frontier')) return 'frontier';
  if (c.includes('balanced')) return 'balanced';
  if (c.includes('budget')) return 'budget';
  if (c.includes('open')) return 'open-source';
  return 'balanced';
}

function getModelPricingVariants(model) {
  // Returns [{ label, inputPer1M, outputPer1M, currency, url, savingsPercent }]
  const p = model?.pricing;
  if (!p) return [];

  // Simple format
  if (p.inputPer1M != null && p.outputPer1M != null) {
    return [{
      label: model.provider,
      inputPer1M: Number(p.inputPer1M),
      outputPer1M: Number(p.outputPer1M),
      currency: p.currency || 'USD',
      url: model.affiliateUrl || null,
      savingsPercent: null,
    }];
  }

  // Route format (direct + alternative)
  const variants = [];
  if (p.direct?.inputPer1M != null && p.direct?.outputPer1M != null) {
    variants.push({
      label: 'Direkt',
      inputPer1M: Number(p.direct.inputPer1M),
      outputPer1M: Number(p.direct.outputPer1M),
      currency: p.direct.currency || 'USD',
      url: model.affiliateUrl || null,
      savingsPercent: null,
    });
  }
  if (p.syntheticRoute?.inputPer1M != null && p.syntheticRoute?.outputPer1M != null) {
    variants.push({
      label: p.syntheticRoute.provider || 'Route',
      inputPer1M: Number(p.syntheticRoute.inputPer1M),
      outputPer1M: Number(p.syntheticRoute.outputPer1M),
      currency: p.direct?.currency || p.syntheticRoute.currency || 'USD',
      url: p.syntheticRoute.url || null,
      savingsPercent: p.syntheticRoute.savingsPercent ?? null,
    });
  }
  return variants;
}

function calcMonthlyCost({ inputTokens, outputTokens, inputPer1M, outputPer1M }) {
  const inM = inputTokens / 1_000_000;
  const outM = outputTokens / 1_000_000;
  return inM * inputPer1M + outM * outputPer1M;
}

function toggleModelComparison(modelId, modelName, checkbox) {
  if (comparisonState.selected.has(modelId)) {
    comparisonState.selected.delete(modelId);
    checkbox.checked = false;
  } else {
    if (comparisonState.selected.size >= comparisonState.maxCompare) {
      alert(`Maximal ${comparisonState.maxCompare} Modelle zum Vergleich auswählbar.`);
      checkbox.checked = false;
      return;
    }
    comparisonState.selected.add(modelId);
    checkbox.checked = true;
  }
  updateComparisonBar();
}

function updateComparisonBar() {
  let bar = document.getElementById('comparison-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'comparison-bar';
    bar.className = 'comparison-bar';
    document.body.appendChild(bar);
  }
  
  const count = comparisonState.selected.size;
  if (count === 0) {
    bar.classList.remove('visible');
    return;
  }
  
  bar.classList.add('visible');
  bar.innerHTML = `
    <div class="comparison-bar-content">
      <span class="comparison-count">${count} Modell${count > 1 ? 'e' : ''} ausgewählt</span>
      <div class="comparison-actions">
        <button class="btn btn-secondary" onclick="clearComparison()">Zurücksetzen</button>
        <button class="btn btn-primary" onclick="showComparison()" ${count < 2 ? 'disabled' : ''}>Vergleichen</button>
      </div>
    </div>
  `;
}

function clearComparison() {
  comparisonState.selected.clear();
  document.querySelectorAll('.compare-checkbox').forEach(cb => cb.checked = false);
  updateComparisonBar();
}

function showComparison() {
  const modal = document.getElementById('comparison-modal');
  if (modal) {
    renderComparisonTable();
    modal.classList.add('visible');
  }
}

function closeComparison() {
  const modal = document.getElementById('comparison-modal');
  if (modal) {
    modal.classList.remove('visible');
  }
}

function renderComparisonTable() {
  const container = document.getElementById('comparison-table-container');
  if (!container) return;
  
  const selectedModels = window.allModels.filter(m => comparisonState.selected.has(m.id));
  if (selectedModels.length < 2) return;
  
  const features = [...new Set(selectedModels.flatMap(m => m.features || []))];
  
  container.innerHTML = `
    <table class="comparison-table">
      <thead>
        <tr>
          <th>Feature</th>
          ${selectedModels.map(m => `
            <th>
              <div class="comparison-header">
                <div class="comparison-model-name">${m.name}</div>
                <div class="comparison-model-provider">${m.provider}</div>
                <span class="category-badge ${badgeClass(m.category)}">${m.category || ''}</span>
              </div>
            </th>
          `).join('')}
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="feature-name">Input / 1M Tokens</td>
          ${selectedModels.map(m => {
            const variants = getModelPricingVariants(m);
            const primary = variants[0];
            return `<td>${primary ? money(primary.inputPer1M, primary.currency) : '-'}</td>`;
          }).join('')}
        </tr>
        <tr>
          <td class="feature-name">Output / 1M Tokens</td>
          ${selectedModels.map(m => {
            const variants = getModelPricingVariants(m);
            const primary = variants[0];
            return `<td>${primary ? money(primary.outputPer1M, primary.currency) : '-'}</td>`;
          }).join('')}
        </tr>
        <tr>
          <td class="feature-name">Context Window</td>
          ${selectedModels.map(m => `<td>${m.contextWindow ? numberWithSeparators(m.contextWindow) : '-'}</td>`).join('')}
        </tr>
        ${features.map(feature => `
          <tr>
            <td class="feature-name">${feature}</td>
            ${selectedModels.map(m => `
              <td>${(m.features || []).includes(feature) ? '✅' : '❌'}</td>
            `).join('')}
          </tr>
        `).join('')}
        <tr>
          <td class="feature-name">Aktion</td>
          ${selectedModels.map(m => `
            <td>
              ${m.affiliateUrl ? `<a class="btn btn-primary btn-sm" href="${m.affiliateUrl}" target="_blank" rel="noopener sponsored">Zum Anbieter →</a>` : '-'}
            </td>
          `).join('')}
        </tr>
      </tbody>
    </table>
  `;
}

function renderModelCard(model) {
  const card = document.createElement('div');
  card.className = 'model-card';
  card.dataset.category = model.category || '';
  card.dataset.modelId = model.id;

  const variants = getModelPricingVariants(model);
  const primary = variants[0] || null;
  const alt = variants.length > 1 ? variants[1] : null;

  const isSelected = comparisonState.selected.has(model.id);
  
  card.innerHTML = `
    <div class="model-compare">
      <label class="compare-label">
        <input type="checkbox" class="compare-checkbox" ${isSelected ? 'checked' : ''}>
        <span>Vergleichen</span>
      </label>
    </div>
    <div class="model-header">
      <div>
        <div class="model-name">${model.name}</div>
        <div class="model-provider">${model.provider}${model.contextWindow ? ` • ${numberWithSeparators(model.contextWindow)} ctx` : ''}</div>
      </div>
      <span class="category-badge ${badgeClass(model.category)}">${model.category || ''}</span>
    </div>

    <div class="model-pricing">
      ${primary ? `
        <div class="price-row">
          <span class="price-label">Input / 1M</span>
          <span class="price-value">${money(primary.inputPer1M, primary.currency)}</span>
        </div>
        <div class="price-row">
          <span class="price-label">Output / 1M</span>
          <span class="price-value">${money(primary.outputPer1M, primary.currency)}</span>
        </div>
      ` : '<div class="price-row"><span class="price-label">Preis</span><span class="price-value">-</span></div>'}

      ${alt ? `
        <div class="savings-highlight-box">
          <div class="savings-label">Alternative Route</div>
          <div class="savings-text">
            ${alt.label}: ${money(alt.inputPer1M, alt.currency)} / ${money(alt.outputPer1M, alt.currency)}
            ${alt.savingsPercent != null ? ` • <span class="price-value savings">-${alt.savingsPercent}%</span>` : ''}
          </div>
        </div>
      ` : ''}
    </div>

    <div class="model-features">
      ${(model.features || []).slice(0, 8).map(f => `<span class="feature-tag">${f}</span>`).join('')}
    </div>

    <div class="model-footer">
      ${model.affiliateUrl ? `<a class="btn btn-primary" href="${model.affiliateUrl}" target="_blank" rel="noopener sponsored">Anbieter</a>` : `<span class="btn btn-primary" aria-disabled="true">Anbieter</span>`}
      ${alt?.url ? `<a class="btn btn-secondary" href="${alt.url}" target="_blank" rel="noopener sponsored">Route</a>` : `<button class="btn btn-secondary" type="button" data-action="details">Details</button>`}
    </div>
  `;

  const detailsBtn = card.querySelector('[data-action="details"]');
  if (detailsBtn) {
    detailsBtn.addEventListener('click', () => {
      const variantsText = variants
        .map(v => `${v.label}: ${money(v.inputPer1M, v.currency)} / ${money(v.outputPer1M, v.currency)}`)
        .join('\n');
      const extra = model.deals?.length ? `\n\nDeals:\n- ${model.deals.map(d => d.description).join('\n- ')}` : '';
      alert(`${model.name}\n\n${variantsText}${extra}`);
    });
  }

  const compareCheckbox = card.querySelector('.compare-checkbox');
  if (compareCheckbox) {
    compareCheckbox.addEventListener('change', () => {
      toggleModelComparison(model.id, model.name, compareCheckbox);
    });
  }

  return card;
}

function renderDealCard(deal) {
  const card = document.createElement('div');
  card.className = 'deal-card';

  const featured = /free|100%|\$\s*\d+/i.test(deal.discount || '') || /startup/i.test(deal.title || '');
  if (featured) card.classList.add('featured');

  card.innerHTML = `
    ${featured ? '<div class="deal-badge">Deal</div>' : ''}
    <div class="deal-provider">${deal.provider}</div>
    <h3>${deal.title}</h3>
    <p>${deal.description}</p>
    ${deal.discount ? `<div class="deal-discount">${deal.discount}</div>` : ''}
    ${deal.requirements ? `<div class="deal-requirements">Voraussetzungen: ${deal.requirements}</div>` : ''}
    ${deal.url ? `<div style="margin-top:16px"><a class="btn btn-primary" href="${deal.url}" target="_blank" rel="noopener" style="display:inline-block;max-width:220px">Zum Deal →</a></div>` : ''}
  `;

  return card;
}

let currentSearchQuery = '';
let currentCategoryFilter = 'all';

function applyFilter(category) {
  currentCategoryFilter = category;
  filterModels();
}

function applySearch(query) {
  currentSearchQuery = query.toLowerCase().trim();
  filterModels();
}

function filterModels() {
  const cards = document.querySelectorAll('.model-card');
  const noResultsEl = document.getElementById('no-results');
  let visibleCount = 0;

  cards.forEach((card) => {
    const category = card.dataset.category || '';
    const modelName = card.querySelector('.model-name')?.textContent?.toLowerCase() || '';
    const provider = card.querySelector('.model-provider')?.textContent?.toLowerCase() || '';
    const features = Array.from(card.querySelectorAll('.feature-tag')).map(f => f.textContent.toLowerCase()).join(' ');
    
    // Category filter
    const categoryMatch = currentCategoryFilter === 'all' || category === currentCategoryFilter;
    
    // Search filter
    const searchMatch = !currentSearchQuery || 
      modelName.includes(currentSearchQuery) || 
      provider.includes(currentSearchQuery) || 
      features.includes(currentSearchQuery);
    
    if (categoryMatch && searchMatch) {
      card.classList.remove('hidden');
      visibleCount++;
    } else {
      card.classList.add('hidden');
    }
  });

  // Show/hide no results message
  if (noResultsEl) {
    noResultsEl.style.display = visibleCount === 0 ? 'block' : 'none';
  }
}

function setupSearch() {
  const searchInput = document.getElementById('model-search');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    applySearch(e.target.value);
  });

  // Clear search on Escape key
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchInput.value = '';
      applySearch('');
      searchInput.blur();
    }
  });
}

function setupFilters() {
  const buttons = document.querySelectorAll('.filter-btn');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyFilter(btn.dataset.filter);
    });
  });
}

function renderCalculator(models, lastUpdated) {
  const inputEl = document.getElementById('input-tokens');
  const outputEl = document.getElementById('output-tokens');
  const resultsEl = document.getElementById('calc-results');
  if (!inputEl || !outputEl || !resultsEl) return;

  const update = () => {
    const inputTokens = Math.max(0, Number(inputEl.value || 0));
    const outputTokens = Math.max(0, Number(outputEl.value || 0));

    const rows = models.map((m) => {
      const variants = getModelPricingVariants(m);
      if (!variants.length) {
        return { id: m.id, name: m.name, provider: m.provider, cost: Infinity, currency: 'USD', route: '-' };
      }
      // pick cheapest variant
      const computed = variants
        .map(v => ({
          route: v.label,
          currency: v.currency,
          cost: calcMonthlyCost({ inputTokens, outputTokens, inputPer1M: v.inputPer1M, outputPer1M: v.outputPer1M })
        }))
        .sort((a, b) => a.cost - b.cost);

      return {
        id: m.id,
        name: m.name,
        provider: m.provider,
        cost: computed[0].cost,
        currency: computed[0].currency,
        route: computed[0].route,
      };
    }).filter(r => Number.isFinite(r.cost)).sort((a, b) => a.cost - b.cost);

    const bestId = rows[0]?.id;

    resultsEl.innerHTML = `
      <h3>Geschätzte Monatskosten (${numberWithSeparators(inputTokens)} in / ${numberWithSeparators(outputTokens)} out) ${lastUpdated ? `• Datenstand: ${lastUpdated}` : ''}</h3>
      <div style="overflow:auto">
        <table class="calc-table">
          <thead>
            <tr>
              <th>Model</th>
              <th>Route</th>
              <th>Kosten</th>
            </tr>
          </thead>
          <tbody>
            ${rows.slice(0, 12).map(r => `
              <tr>
                <td>${r.name} <span style="color:var(--text-muted);font-family:inherit">(${r.provider})</span></td>
                <td>${r.route}</td>
                <td class="${r.id === bestId ? 'best-price' : ''}">${money(r.cost, r.currency)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <p style="margin-top:12px;color:var(--text-muted);font-size:0.875rem">
        Hinweis: Token-Kosten sind modell- und anbieterabhängig; Preise können sich ändern.
      </p>
    `;
  };

  inputEl.addEventListener('input', update);
  outputEl.addEventListener('input', update);
  update();
}

function createComparisonModal() {
  if (document.getElementById('comparison-modal')) return;
  
  const modal = document.createElement('div');
  modal.id = 'comparison-modal';
  modal.className = 'comparison-modal';
  modal.innerHTML = `
    <div class="comparison-modal-overlay" onclick="closeComparison()"></div>
    <div class="comparison-modal-content">
      <div class="comparison-modal-header">
        <h2>Modelle vergleichen</h2>
        <button class="comparison-modal-close" onclick="closeComparison()">×</button>
      </div>
      <div class="comparison-modal-body">
        <div id="comparison-table-container"></div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function main() {
  setupFilters();
  setupSearch();
  createComparisonModal();

  const res = await fetch(DATA_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load ${DATA_URL}: ${res.status}`);
  const data = await res.json();

  const lastUpdated = data.lastUpdated || null;
  const lastUpdatedEl = document.getElementById('last-updated');
  if (lastUpdatedEl) lastUpdatedEl.textContent = lastUpdated || '-';

  const models = Array.isArray(data.models) ? data.models : [];
  const deals = Array.isArray(data.deals) ? data.deals : [];
  
  // Store models globally for comparison
  window.allModels = models;

  const modelsGrid = document.getElementById('models-grid');
  if (modelsGrid) {
    modelsGrid.innerHTML = '';
    models.forEach((m) => modelsGrid.appendChild(renderModelCard(m)));
  }

  const dealsGrid = document.getElementById('deals-grid');
  if (dealsGrid) {
    dealsGrid.innerHTML = '';
    deals.forEach((d) => dealsGrid.appendChild(renderDealCard(d)));
  }

  renderCalculator(models, lastUpdated);
}

// Affiliate link click tracking
function trackAffiliateClick(provider, url) {
  // Simple analytics - can be extended to use Google Analytics, Plausible, etc.
  const event = {
    type: 'affiliate_click',
    provider: provider,
    url: url,
    timestamp: new Date().toISOString(),
    page: window.location.pathname
  };
  
  // Log to console for now (replace with actual analytics)
  console.log('[Affiliate Click]', event);
  
  // Send to analytics if gtag is available
  if (typeof gtag !== 'undefined') {
    gtag('event', 'affiliate_click', {
      event_category: 'engagement',
      event_label: provider,
      transport_type: 'beacon'
    });
  }
  
  // Send to Plausible if available
  if (typeof plausible !== 'undefined') {
    plausible('Affiliate Click', { props: { provider: provider } });
  }
}

// Add click tracking to all affiliate links
document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href*="?ref="], a[href*="?via="], a[href*="?utm_source="], a[href*="?referrer="]');
  if (link) {
    const url = new URL(link.href);
    const hostname = url.hostname;
    trackAffiliateClick(hostname, link.href);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  main().catch((err) => {
    console.error(err);
    const modelsGrid = document.getElementById('models-grid');
    if (modelsGrid) {
      modelsGrid.innerHTML = `<div class="model-card"><div class="model-name">Fehler beim Laden</div><div class="model-provider">${String(err.message || err)}</div></div>`;
    }
  });
});
