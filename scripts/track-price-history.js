#!/usr/bin/env node
/**
 * AI Price Compare - Price History Tracker
 *
 * Tracks price changes over time and maintains historical data.
 * Run after update-prices.js to record changes.
 *
 * Usage: node scripts/track-price-history.js
 */

const fs = require('fs');
const path = require('path');

const PRICES_PATH = path.join(__dirname, '..', 'data', 'prices.json');
const HISTORY_PATH = path.join(__dirname, '..', 'data', 'price-history.json');

function loadJSON(path) {
  try {
    const data = fs.readFileSync(path, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`❌ Error loading ${path}:`, error.message);
    return null;
  }
}

function saveJSON(path, data) {
  try {
    fs.writeFileSync(path, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`❌ Error saving ${path}:`, error.message);
    return false;
  }
}

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function extractPricePoint(model) {
  const p = model.pricing;
  if (!p) return null;

  const point = {
    date: getToday(),
    routes: {}
  };

  // Direct pricing
  if (p.direct || (p.inputPer1M != null && p.outputPer1M != null)) {
    const direct = p.direct || p;
    point.routes.direct = {
      inputPer1M: direct.inputPer1M,
      outputPer1M: direct.outputPer1M,
      currency: direct.currency || 'USD'
    };
  }

  // OpenRouter pricing
  if (p.openrouter) {
    point.routes.openrouter = {
      inputPer1M: p.openrouter.inputPer1M,
      outputPer1M: p.openrouter.outputPer1M,
      currency: p.openrouter.currency || 'USD'
    };
  }

  // Synthetic pricing
  if (p.syntheticRoute) {
    point.routes.synthetic = {
      inputPer1M: p.syntheticRoute.inputPer1M,
      outputPer1M: p.syntheticRoute.outputPer1M,
      currency: p.syntheticRoute.currency || 'USD'
    };
  }

  return Object.keys(point.routes).length > 0 ? point : null;
}

function calculateTrend(history, route = 'direct', days = 7) {
  if (!history || history.length < 2) return { direction: 'stable', change: 0 };

  const recent = history.slice(-days);
  const first = recent[0]?.routes[route];
  const last = recent[recent.length - 1]?.routes[route];

  if (!first || !last) return { direction: 'stable', change: 0 };

  const change = ((last.inputPer1M - first.inputPer1M) / first.inputPer1M) * 100;

  if (change > 5) return { direction: 'up', change: Math.abs(change).toFixed(1) };
  if (change < -5) return { direction: 'down', change: Math.abs(change).toFixed(1) };
  return { direction: 'stable', change: 0 };
}

function updateHistory() {
  console.log('🚀 AI Price Compare - Price History Tracker\n');

  // Load current prices
  const prices = loadJSON(PRICES_PATH);
  if (!prices) {
    console.error('❌ Failed to load prices.json');
    process.exit(1);
  }

  // Load or initialize history
  let history = loadJSON(HISTORY_PATH);
  if (!history) {
    history = {
      metadata: {
        version: 1,
        description: 'Historical price data for AI models',
        firstRecord: getToday(),
        updateFrequency: 'daily'
      },
      models: {}
    };
  }

  const today = getToday();
  let updatedCount = 0;
  let newEntries = 0;

  // Process each model
  for (const model of prices.models) {
    const modelId = model.id;
    const pricePoint = extractPricePoint(model);

    if (!pricePoint) continue;

    // Initialize model history if needed
    if (!history.models[modelId]) {
      history.models[modelId] = {
        name: model.name,
        provider: model.provider,
        history: []
      };
    }

    const modelHistory = history.models[modelId].history;
    const lastEntry = modelHistory[modelHistory.length - 1];

    // Only add if price changed or no entry for today
    const shouldAdd = !lastEntry || lastEntry.date !== today;
    const priceChanged = lastEntry && (
      JSON.stringify(lastEntry.routes) !== JSON.stringify(pricePoint.routes)
    );

    if (shouldAdd || priceChanged) {
      // If same day but price changed, update instead of append
      if (lastEntry && lastEntry.date === today && priceChanged) {
        modelHistory[modelHistory.length - 1] = pricePoint;
        updatedCount++;
      } else {
        modelHistory.push(pricePoint);
        newEntries++;
      }

      // Calculate and store trend
      const trend = calculateTrend(modelHistory, 'direct', 30);
      history.models[modelId].trend = trend;
    }
  }

  // Save history
  history.metadata.lastUpdated = today;
  if (saveJSON(HISTORY_PATH, history)) {
    console.log(`✅ History updated:`);
    console.log(`   • ${newEntries} new entries`);
    console.log(`   • ${updatedCount} updated entries`);
    console.log(`   • ${Object.keys(history.models).length} models tracked`);
    console.log(`\n📅 Last updated: ${today}`);
  }

  return history;
}

// Generate summary for GitHub Actions
function generateSummary(history) {
  const modelsWithTrends = Object.entries(history.models)
    .filter(([_, data]) => data.trend)
    .map(([id, data]) => ({
      id,
      name: data.name,
      trend: data.trend
    }));

  const priceChanges = modelsWithTrends.filter(m => m.trend.direction !== 'stable');

  if (priceChanges.length === 0) {
    console.log('\n📊 No significant price changes detected (7d trend)');
  } else {
    console.log('\n📊 Price Changes (7d trend):');
    for (const m of priceChanges) {
      const icon = m.trend.direction === 'up' ? '📈' : '📉';
      console.log(`   ${icon} ${m.name}: ${m.trend.direction} ${m.trend.change}%`);
    }
  }
}

// Main
if (require.main === module) {
  const history = updateHistory();
  generateSummary(history);
}

module.exports = { updateHistory, calculateTrend };
