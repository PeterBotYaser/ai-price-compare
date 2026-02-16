// TokenMeter Affiliate Link Manager
// Tracks and manages affiliate links for AI providers

const AFFILIATE_CONFIG = {
  // Active affiliate programs
  synthetic: {
    name: 'Synthetic',
    url: 'https://synthetic.new/?ref=tokenmeter',
    commission: '10%',
    status: 'active',
    description: 'Europäischer KI-Provider mit günstigen Kimi-Preisen'
  },
  openrouter: {
    name: 'OpenRouter',
    url: 'https://openrouter.ai/?ref=tokenmeter',
    commission: '5%',
    status: 'active',
    description: 'API-Aggregator mit Mengenrabatten'
  },
  // Pending programs - need to apply
  openai: {
    name: 'OpenAI',
    url: 'https://openai.com/api/',
    commission: 'variabel',
    status: 'pending',
    description: 'Original GPT-4 API'
  },
  anthropic: {
    name: 'Anthropic',
    url: 'https://www.anthropic.com/api',
    commission: 'variabel',
    status: 'pending',
    description: 'Claude API'
  },
  together: {
    name: 'Together AI',
    url: 'https://www.together.ai/',
    commission: 'variabel',
    status: 'pending',
    description: 'Open-Source Modelle'
  }
};

// Track affiliate link clicks
function trackAffiliateClick(provider, model) {
  const timestamp = new Date().toISOString();
  const data = {
    provider,
    model,
    timestamp,
    userAgent: navigator.userAgent,
    referrer: document.referrer
  };
  
  // Store in localStorage for now (replace with backend later)
  const clicks = JSON.parse(localStorage.getItem('affiliate_clicks') || '[]');
  clicks.push(data);
  localStorage.setItem('affiliate_clicks', JSON.stringify(clicks));
  
  console.log('Affiliate click tracked:', data);
  return true;
}

// Get affiliate link for provider
function getAffiliateLink(provider, model) {
  const config = AFFILIATE_CONFIG[provider.toLowerCase()];
  if (!config) return null;
  
  return {
    url: config.url,
    name: config.name,
    commission: config.commission,
    status: config.status
  };
}

// Generate affiliate CTA button HTML
function generateAffiliateButton(provider, model, buttonText = 'Jetzt sparen') {
  const affiliate = getAffiliateLink(provider, model);
  if (!affiliate || affiliate.status !== 'active') {
    return `<a href="${affiliate?.url || '#'}" class="btn btn-secondary" target="_blank" rel="noopener">${buttonText}</a>`;
  }
  
  return `
    <a href="${affiliate.url}" 
       class="btn btn-affiliate" 
       target="_blank" 
       rel="noopener"
       onclick="trackAffiliateClick('${provider}', '${model}')">
      ${buttonText}
      <span class="affiliate-badge">${affiliate.commission} Cashback</span>
    </a>
  `;
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    AFFILIATE_CONFIG,
    trackAffiliateClick,
    getAffiliateLink,
    generateAffiliateButton
  };
}
