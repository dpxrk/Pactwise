#!/bin/bash

echo "Fixing webpack module loading error..."

# 1. Clean build cache
echo "Step 1: Cleaning build cache..."
rm -rf .next
rm -rf node_modules/.cache

# 2. Remove problematic packages if they exist
echo "Step 2: Checking for incompatible packages..."
if grep -q "react-server-dom-webpack" package.json 2>/dev/null; then
    echo "Removing react-server-dom-webpack..."
    npm uninstall react-server-dom-webpack
fi

# 3. Ensure React versions are consistent
echo "Step 3: Checking React version consistency..."
npm ls react react-dom 2>/dev/null | head -n 20

# 4. Restart dev server
echo "Step 4: Restarting development server..."
npm run dev:clean

echo "Fix complete! If issues persist, try:"
echo "  1. rm -rf node_modules package-lock.json"
echo "  2. npm install"
echo "  3. npm run dev:clean"