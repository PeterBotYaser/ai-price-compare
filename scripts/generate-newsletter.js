#!/usr/bin/env node
/**
 * AI Price Compare - Newsletter Generator
 * 
 * Generates newsletter content when prices change.
 * Can be integrated with email services like Buttondown, ConvertKit, etc.
 * 
 * Usage: node scripts/generate-newsletter.js
 */

const fs = require('fs');
const path = require('path');

const PRICES_PATH = path.join(__dirname, '..', 'data', 'prices.json');
const NEWSLETTER_PATH = path.join(__dirname, '..', 'newsletters');

function loadPrices() {
  try {
    const data = fs.readFileSync(PRICES_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Error loading prices.json:', error.message);
    process.exit(1);
  }
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

function generateGermanNewsletter(data) {
  const date = formatDate(data.lastUpdated);
  const topDeals = data.deals?.slice(0, 3) || [];
  
  // Get models with best savings
  const modelsWithSavings = data.models
    .filter(m => {
      const p = m.pricing;
      return p?.syntheticRoute || p?.openrouter;
    })
    .slice(0, 5);

  return `---
subject: "📊 AI Preis-Update: ${date} – Neue Deals & Preisänderungen"
date: "${data.lastUpdated}"
---

# 🤖 AI Price Compare Weekly

**${date}** – Das wichtigste aus der AI-Preiswelt auf einen Blick.

---

## 🔥 Top Deals dieser Woche

${topDeals.map(deal => `
### ${deal.provider}: ${deal.title}
${deal.description}
${deal.discount ? `**Rabatt:** ${deal.discount}` : ''}
${deal.requirements ? `*Voraussetzungen: ${deal.requirements}*` : ''}
👉 [Zum Angebot](${deal.url})
`).join('\n')}

---

## 💡 Spartipps: Günstige Routen

${modelsWithSavings.map(m => {
  const variants = [];
  if (m.pricing?.direct) variants.push({ name: 'Direkt', ...m.pricing.direct });
  if (m.pricing?.syntheticRoute) variants.push({ name: 'Synthetic', ...m.pricing.syntheticRoute });
  if (m.pricing?.openrouter) variants.push({ name: 'OpenRouter', ...m.pricing.openrouter });
  
  if (variants.length < 2) return null;
  
  const cheapest = variants.reduce((min, v) => v.inputPer1M < min.inputPer1M ? v : min);
  const direct = variants.find(v => v.name === 'Direkt') || variants[0];
  const savings = ((1 - cheapest.inputPer1M / direct.inputPer1M) * 100).toFixed(0);
  
  return `### ${m.name}
- Direkt: $${direct.inputPer1M}/$${direct.outputPer1M} per 1M tokens
- Günstigste Route (${cheapest.name}): $${cheapest.inputPer1M}/$${cheapest.outputPer1M}
- **Du sparst ${savings}%!**
`;
}).filter(Boolean).join('\n')}

---

## 📊 Aktuelle Preisübersicht

| Modell | Input/1M | Output/1M | Context |
|--------|----------|-----------|---------|
${data.models.slice(0, 10).map(m => {
  const p = m.pricing?.direct || m.pricing;
  return `| ${m.name} | $${p?.inputPer1M ?? '-'} | $${p?.outputPer1M ?? '-'} | ${m.contextWindow ? (m.contextWindow / 1000) + 'k' : '-'} |`;
}).join('\n')}

**Alle ${data.models.length} Modelle:** [aipricecompare.com](https://aipricecompare.com)

---

## 🔗 Schnell-Links

- 🌐 [Preisvergleich](https://aipricecompare.com)
- 🔥 [Alle Deals](https://aipricecompare.com#deals)
- 💰 [Kosten-Rechner](https://aipricecompare.com#calculator)

---

*Du erhältst diesen Newsletter, weil du dich auf aipricecompare.com angemeldet hast.*

[Abmelden](https://aipricecompare.com/newsletter/unsubscribe)
`;
}

function generateEnglishNewsletter(data) {
  const date = new Date(data.lastUpdated).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  const topDeals = data.deals?.slice(0, 3) || [];
  
  const modelsWithSavings = data.models
    .filter(m => {
      const p = m.pricing;
      return p?.syntheticRoute || p?.openrouter;
    })
    .slice(0, 5);

  return `---
subject: "📊 AI Price Update: ${date} – New Deals & Price Changes"
date: "${data.lastUpdated}"
---

# 🤖 AI Price Compare Weekly

**${date}** – The most important updates from the AI pricing world at a glance.

---

## 🔥 Top Deals This Week

${topDeals.map(deal => `
### ${deal.provider}: ${deal.title}
${deal.description}
${deal.discount ? `**Discount:** ${deal.discount}` : ''}
${deal.requirements ? `*Requirements: ${deal.requirements}*` : ''}
👉 [Get Deal](${deal.url})
`).join('\n')}

---

## 💡 Savings Tips: Cheap Routes

${modelsWithSavings.map(m => {
  const variants = [];
  if (m.pricing?.direct) variants.push({ name: 'Direct', ...m.pricing.direct });
  if (m.pricing?.syntheticRoute) variants.push({ name: 'Synthetic', ...m.pricing.syntheticRoute });
  if (m.pricing?.openrouter) variants.push({ name: 'OpenRouter', ...m.pricing.openrouter });
  
  if (variants.length < 2) return null;
  
  const cheapest = variants.reduce((min, v) => v.inputPer1M < min.inputPer1M ? v : min);
  const direct = variants.find(v => v.name === 'Direct') || variants[0];
  const savings = ((1 - cheapest.inputPer1M / direct.inputPer1M) * 100).toFixed(0);
  
  return `### ${m.name}
- Direct: $${direct.inputPer1M}/$${direct.outputPer1M} per 1M tokens
- Cheapest Route (${cheapest.name}): $${cheapest.inputPer1M}/$${cheapest.outputPer1M}
- **You save ${savings}%!**
`;
}).filter(Boolean).join('\n')}

---

## 📊 Current Price Overview

| Model | Input/1M | Output/1M | Context |
|-------|----------|-----------|---------|
${data.models.slice(0, 10).map(m => {
  const p = m.pricing?.direct || m.pricing;
  return `| ${m.name} | $${p?.inputPer1M ?? '-'} | $${p?.outputPer1M ?? '-'} | ${m.contextWindow ? (m.contextWindow / 1000) + 'k' : '-'} |`;
}).join('\n')}

**All ${data.models.length} models:** [aipricecompare.com/en/](https://aipricecompare.com/en/)

---

## 🔗 Quick Links

- 🌐 [Price Comparison](https://aipricecompare.com/en/)
- 🔥 [All Deals](https://aipricecompare.com/en/#deals)
- 💰 [Cost Calculator](https://aipricecompare.com/en/#calculator)

---

*You're receiving this newsletter because you signed up on aipricecompare.com.*

[Unsubscribe](https://aipricecompare.com/newsletter/unsubscribe)
`;
}

function main() {
  console.log('🚀 AI Price Compare - Newsletter Generator\n');
  
  // Ensure newsletters directory exists
  if (!fs.existsSync(NEWSLETTER_PATH)) {
    fs.mkdirSync(NEWSLETTER_PATH, { recursive: true });
  }
  
  const data = loadPrices();
  console.log(`📁 Loaded ${data.models.length} models`);
  console.log(`📅 Last updated: ${data.lastUpdated}\n`);
  
  // Generate German newsletter
  const germanNewsletter = generateGermanNewsletter(data);
  const germanPath = path.join(NEWSLETTER_PATH, `newsletter-${data.lastUpdated}-de.md`);
  fs.writeFileSync(germanPath, germanNewsletter);
  console.log(`✅ German newsletter saved: ${germanPath}`);
  
  // Generate English newsletter
  const englishNewsletter = generateEnglishNewsletter(data);
  const englishPath = path.join(NEWSLETTER_PATH, `newsletter-${data.lastUpdated}-en.md`);
  fs.writeFileSync(englishPath, englishNewsletter);
  console.log(`✅ English newsletter saved: ${englishPath}`);
  
  console.log('\n📧 Newsletters generated successfully!');
  console.log('💡 Next steps:');
  console.log('   1. Review the generated files');
  console.log('   2. Copy content to your email service (Buttondown, ConvertKit, etc.)');
  console.log('   3. Send to your subscribers');
}

main();
