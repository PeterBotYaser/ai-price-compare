#!/bin/bash
# AI Price Compare - Daily Price Update Script
# Run this daily via cron: 0 6 * * * /path/to/daily-update.sh

set -e

cd "$(dirname "$0")/.."

echo "🚀 Starting daily price update..."
echo "📅 $(date)"

# Run price update
node scripts/update-prices.js

# Check if there are changes
if git diff --quiet data/prices.json; then
    echo "✅ No price changes. Done."
    exit 0
fi

# Get summary of changes
CHANGES=$(git diff data/prices.json | grep -E "^\+.*inputPer1M|^\-.*inputPer1M" | wc -l)
echo "📊 Detected price changes: $CHANGES updates"

# Commit and push
git add data/prices.json
git commit -m "chore: daily price update $(date +%Y-%m-%d)"
git push

echo "✅ Price update committed and pushed!"

# Optional: Send notification (configure as needed)
# curl -X POST "$WEBHOOK_URL" -d "{"text": "Price update: $CHANGES models updated"}"
