#!/bin/bash

echo "=== Complete Webpack Error Fix ==="
echo ""

# Step 1: Kill all Node/Next processes
echo "Step 1: Stopping all Node/Next.js processes..."
pkill -f node 2>/dev/null || true
pkill -f next 2>/dev/null || true
sleep 2

# Step 2: Clear ALL caches
echo "Step 2: Clearing all caches..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .swc
rm -rf .turbo
rm -rf dist
rm -rf build

# Step 3: Clear npm cache
echo "Step 3: Clearing npm cache..."
npm cache clean --force 2>/dev/null || true

# Step 4: Remove problematic dependencies
echo "Step 4: Removing and reinstalling critical dependencies..."
rm -rf node_modules/next
rm -rf node_modules/react
rm -rf node_modules/react-dom
rm -rf node_modules/webpack
rm -rf node_modules/.pnpm
rm -rf node_modules/.vite

# Step 5: Reinstall dependencies
echo "Step 5: Reinstalling dependencies..."
npm install --legacy-peer-deps

# Step 6: Verify React versions
echo "Step 6: Verifying React versions..."
npm ls react react-dom 2>/dev/null | head -20 || true

# Step 7: Start development server
echo "Step 7: Starting fresh development server..."
echo ""
echo "The server will start on http://localhost:3000"
echo "If you see any errors, press Ctrl+C and run: npm run dev:clean"
echo ""

# Use exec to replace the shell with the dev server
exec npm run dev