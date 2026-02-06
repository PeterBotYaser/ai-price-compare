#!/usr/bin/env node
/**
 * AI Price Compare - Asset Generator
 * 
 * Generates PNG assets from SVG files for OG images and favicons.
 * 
 * Usage: node scripts/generate-assets.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// Simple SVG to PNG using HTML canvas approach
// This creates an HTML file that can be opened in a browser to generate PNGs
function generateHTMLConverter() {
  const ogSvgContent = fs.readFileSync(path.join(ROOT, 'og-image.svg'), 'utf8').replace(/`/g, '\\`').replace(/\\/g, '\\\\');
  const faviconSvgContent = fs.readFileSync(path.join(ROOT, 'favicon.svg'), 'utf8').replace(/`/g, '\\`').replace(/\\/g, '\\\\');
  
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Asset Generator - AI Price Compare</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 40px; background: #0f172a; color: white; }
    canvas { border: 1px solid #334155; margin: 20px 0; display: block; }
    .asset { margin: 30px 0; }
    button { background: #6366f1; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 16px; }
    button:hover { background: #4f46e5; }
    a { color: #10b981; }
  </style>
</head>
<body>
  <h1>🎨 AI Price Compare - Asset Generator</h1>
  <p>Click the buttons below to download PNG versions of the assets.</p>
  
  <div class="asset">
    <h2>OG Image (1200x630)</h2>
    <canvas id="og-canvas" width="1200" height="630"></canvas>
    <button onclick="downloadPNG('og-canvas', 'og-image.png')">Download og-image.png</button>
  </div>
  
  <div class="asset">
    <h2>Favicon (32x32)</h2>
    <canvas id="favicon-canvas" width="32" height="32"></canvas>
    <button onclick="downloadPNG('favicon-canvas', 'favicon.png')">Download favicon.png</button>
  </div>
  
  <div class="asset">
    <h2>Favicon (180x180 - Apple Touch)</h2>
    <canvas id="apple-canvas" width="180" height="180"></canvas>
    <button onclick="downloadPNG('apple-canvas', 'apple-touch-icon.png')">Download apple-touch-icon.png</button>
  </div>

  <script>
    // OG Image SVG
    const ogSvg = \`${ogSvgContent}\`;
    
    // Favicon SVG  
    const faviconSvg = \`${faviconSvgContent}\`;
    
    // Apple touch icon SVG (larger favicon)
    const appleSvg = faviconSvg.replace('width="32" height="32"', 'width="180" height="180"').replace('font-size="18"', 'font-size="100"').replace('rx="6"', 'rx="32"');
    
    function svgToCanvas(svg, canvasId) {
      const canvas = document.getElementById(canvasId);
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      const svgBlob = new Blob([svg], {type: 'image/svg+xml'});
      const url = URL.createObjectURL(svgBlob);
      
      img.onload = function() {
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
      };
      
      img.src = url;
    }
    
    function downloadPNG(canvasId, filename) {
      const canvas = document.getElementById(canvasId);
      const link = document.createElement('a');
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
    
    // Render all assets
    svgToCanvas(ogSvg, 'og-canvas');
    svgToCanvas(faviconSvg, 'favicon-canvas');
    svgToCanvas(appleSvg, 'apple-canvas');
  </script>
</body>
</html>`;

  const outputPath = path.join(ROOT, 'asset-generator.html');
  fs.writeFileSync(outputPath, html);
  console.log('✅ Generated asset-generator.html');
  console.log('   Open this file in a browser to generate PNG assets');
  console.log(`   ${outputPath}`);
}

async function main() {
  console.log('🎨 AI Price Compare - Asset Generator\n');
  
  // Generate HTML fallback
  generateHTMLConverter();
  console.log('\n💡 To generate PNGs:');
  console.log('   1. Open asset-generator.html in a browser');
  console.log('   2. Click the download buttons');
  console.log('   3. Move the downloaded files to the project root');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
