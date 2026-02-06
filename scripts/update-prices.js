#!/usr/bin/env node
/**
 * AI Price Compare - Automated Price Updater
 * 
 * This script fetches current pricing data from various APIs
 * and updates the prices.json file.
 * 
 * Usage: node scripts/update-prices.js
 */

const fs = require('fs');
const path = require('path');

const PRICES_PATH = path.join(__dirname, '..', 'data', 'prices.json');

// OpenRouter API endpoint
const OPENROUTER_API = 'https://openrouter.ai/api/v1/models';

// Model ID mappings (OpenRouter ID -> Our ID)
const OPENROUTER_MAPPINGS = {
  'openai/gpt-4o': 'gpt-4o',
  'openai/gpt-4o-mini': 'gpt-4o-mini',
  'openai/o3-mini': 'o3-mini',
  'openai/o1': 'o1',
  'anthropic/claude-3.5-sonnet': 'claude-3-5-sonnet',
  'anthropic/claude-3.5-haiku': 'claude-3-5-haiku',
  'anthropic/claude-3.7-sonnet': 'claude-3-7-sonnet',
  'google/gemini-2.0-flash-001': 'gemini-2-flash',
  'google/gemini-2.0-pro-exp-02-05': 'gemini-2-pro',
  'google/gemini-2.0-flash-thinking-exp-01-21': 'gemini-2-flash-thinking',
  'deepseek/deepseek-chat': 'deepseek-v3',
  'deepseek/deepseek-r1': 'deepseek-r1',
  'meta-llama/llama-3.3-70b-instruct': 'llama-3-3-70b',
  'mistralai/mistral-large': 'mistral-large',
  'mistralai/mistral-small-24b-instruct-2501': 'mistral-small-3',
  'qwen/qwen-2.5-72b-instruct': 'qwen-2-5-72b',
  'x-ai/grok-2': 'grok-2',
  'x-ai/grok-2-vision': 'grok-2-vision',
  'cohere/command-r-plus': 'command-r-plus',
  'cohere/command-a': 'cohere-command-a',
  'perplexity/sonar': 'perplexity-sonar',
  'perplexity/sonar-pro': 'perplexity-sonar-pro',
  'microsoft/phi-4': 'microsoft-phi-4',
};

// Models that need manual price updates (not on OpenRouter or different pricing)
const MANUAL_MODELS = ['kimi-k2-5', 'gpt-4-5'];

async function fetchOpenRouterPrices() {
  console.log('📡 Fetching prices from OpenRouter...');
  
  try {
    const response = await fetch(OPENROUTER_API, {
      headers: {
        'HTTP-Referer': 'https://aipricecompare.com',
        'X-Title': 'AI Price Compare'
      }
    });
    
    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const prices = {};
    
    for (const model of data.data || []) {
      const ourId = OPENROUTER_MAPPINGS[model.id];
      if (ourId && model.pricing) {
        // OpenRouter prices are per token, we need per 1M tokens
        const inputPer1M = parseFloat(model.pricing.prompt) * 1000000;
        const outputPer1M = parseFloat(model.pricing.completion) * 1000000;
        
        // Only update if prices are valid
        if (!isNaN(inputPer1M) && !isNaN(outputPer1M) && inputPer1M > 0) {
          prices[ourId] = {
            inputPer1M: Math.round(inputPer1M * 100) / 100,
            outputPer1M: Math.round(outputPer1M * 100) / 100,
            currency: 'USD',
            url: `https://openrouter.ai/${model.id}?ref=aipricecompare`
          };
        }
      }
    }
    
    console.log(`✅ Fetched prices for ${Object.keys(prices).length} models from OpenRouter`);
    return prices;
    
  } catch (error) {
    console.error('❌ Error fetching OpenRouter prices:', error.message);
    return {};
  }
}

function loadCurrentPrices() {
  try {
    const data = fs.readFileSync(PRICES_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Error loading prices.json:', error.message);
    process.exit(1);
  }
}

function savePrices(prices) {
  try {
    fs.writeFileSync(PRICES_PATH, JSON.stringify(prices, null, 2));
    console.log('💾 Prices saved to prices.json');
  } catch (error) {
    console.error('❌ Error saving prices.json:', error.message);
    process.exit(1);
  }
}

function updatePrices(currentData, openRouterPrices) {
  const updated = { ...currentData };
  const changes = [];
  const now = new Date().toISOString().split('T')[0];
  
  updated.lastUpdated = now;
  
  for (const model of updated.models) {
    const newOpenRouterPrice = openRouterPrices[model.id];
    
    if (newOpenRouterPrice) {
      // Check if OpenRouter pricing exists and update it
      const oldPrice = model.pricing?.openrouter;
      
      if (!model.pricing) {
        model.pricing = {};
      }
      
      model.pricing.openrouter = {
        provider: 'OpenRouter',
        inputPer1M: newOpenRouterPrice.inputPer1M,
        outputPer1M: newOpenRouterPrice.outputPer1M,
        currency: newOpenRouterPrice.currency,
        url: newOpenRouterPrice.url
      };
      
      // Track changes
      if (!oldPrice || 
          oldPrice.inputPer1M !== newOpenRouterPrice.inputPer1M ||
          oldPrice.outputPer1M !== newOpenRouterPrice.outputPer1M) {
        changes.push({
          model: model.name,
          old: oldPrice ? `$${oldPrice.inputPer1M}/$${oldPrice.outputPer1M}` : 'new',
          new: `$${newOpenRouterPrice.inputPer1M}/$${newOpenRouterPrice.outputPer1M}`
        });
      }
    }
  }
  
  return { updated, changes };
}

function generateReport(changes) {
  if (changes.length === 0) {
    return '📊 No price changes detected.';
  }
  
  let report = `📊 Price Updates (${changes.length} models):\n\n`;
  for (const change of changes) {
    report += `  • ${change.model}: ${change.old} → ${change.new}\n`;
  }
  return report;
}

async function main() {
  console.log('🚀 AI Price Compare - Price Updater\n');
  
  // Load current prices
  const currentData = loadCurrentPrices();
  console.log(`📁 Loaded ${currentData.models.length} models from prices.json`);
  console.log(`📅 Last update: ${currentData.lastUpdated || 'unknown'}\n`);
  
  // Fetch new prices
  const openRouterPrices = await fetchOpenRouterPrices();
  
  if (Object.keys(openRouterPrices).length === 0) {
    console.log('⚠️  No price data fetched. Exiting.');
    process.exit(0);
  }
  
  // Update prices
  const { updated, changes } = updatePrices(currentData, openRouterPrices);
  
  // Save updated prices
  savePrices(updated);
  
  // Generate report
  console.log('\n' + generateReport(changes));
  
  // Summary
  console.log(`\n✅ Done! Updated ${changes.length} model prices.`);
  console.log(`📅 New lastUpdated: ${updated.lastUpdated}`);
  
  // Return changes for potential notifications
  return changes;
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { main, fetchOpenRouterPrices };
