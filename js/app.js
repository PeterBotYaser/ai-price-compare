// AI Price Compare - client-side rendering (no build step)

const DATA_URL = 'data/prices.json';

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

function renderModelCard(model) {
  const card = document.createElement('div');
  card.className = 'model-card';
  card.dataset.category = model.category || '';

  const variants = getModelPricingVariants(model);
  const primary = variants[0] || null;
  const alt = variants.length > 1 ? variants[1] : null;

  card.innerHTML = `
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

function applyFilter(category) {
  const cards = document.querySelectorAll('.model-card');
  cards.forEach((card) => {
    if (category === 'all') {
      card.classList.remove('hidden');
      return;
    }
    const c = card.dataset.category || '';
    if (c === category) card.classList.remove('hidden');
    else card.classList.add('hidden');
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

async function main() {
  setupFilters();

  const res = await fetch(DATA_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load ${DATA_URL}: ${res.status}`);
  const data = await res.json();

  const lastUpdated = data.lastUpdated || null;
  const lastUpdatedEl = document.getElementById('last-updated');
  if (lastUpdatedEl) lastUpdatedEl.textContent = lastUpdated || '-';

  const models = Array.isArray(data.models) ? data.models : [];
  const deals = Array.isArray(data.deals) ? data.deals : [];

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

document.addEventListener('DOMContentLoaded', () => {
  main().catch((err) => {
    console.error(err);
    const modelsGrid = document.getElementById('models-grid');
    if (modelsGrid) {
      modelsGrid.innerHTML = `<div class="model-card"><div class="model-name">Fehler beim Laden</div><div class="model-provider">${String(err.message || err)}</div></div>`;
    }
  });
});
