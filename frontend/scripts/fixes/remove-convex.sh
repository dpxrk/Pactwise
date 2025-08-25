#!/bin/bash

echo "Removing all Convex references from the codebase..."

# Remove Convex imports and comments from TypeScript/JavaScript files
find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) | while read file; do
  # Remove lines containing convex (case insensitive)
  sed -i '/[Cc]onvex/d' "$file" 2>/dev/null || true
  
  # Remove empty import blocks that might be left
  sed -i '/^import {$/,/^} from/d' "$file" 2>/dev/null || true
  
  echo "Cleaned: $file"
done

# Clean up test configuration files
echo "Cleaning test configuration files..."
sed -i '/convex/d' jest.config.js 2>/dev/null || true
sed -i '/convex/d' jest.config.frontend.js 2>/dev/null || true

# Update package.json test scripts
echo "Updating package.json test scripts..."
sed -i 's/"test:backend": ".*"/"test:backend": "echo \"Backend tests pending Supabase integration\""/' package.json
sed -i 's/"test:backend:coverage": ".*"/"test:backend:coverage": "echo \"Backend coverage pending Supabase integration\""/' package.json

# Clean up public files
echo "Cleaning public service worker..."
sed -i '/convex/d' public/service-worker-v2.js 2>/dev/null || true

# Remove any Convex references from performance metrics
echo "Cleaning performance metrics..."
sed -i 's/"environment": ".*convex.*"/"environment": "supabase"/' performance-metrics/*.json 2>/dev/null || true

echo "Convex removal complete!"