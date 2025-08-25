#!/bin/bash

echo "=== Final Webpack Fix Solution ==="
echo ""

# Function to kill processes safely
kill_processes() {
    echo "Stopping any running servers..."
    pkill -f "next dev" 2>/dev/null || true
    pkill -f "node.*next" 2>/dev/null || true
    sleep 1
}

# Function to clean all caches
clean_caches() {
    echo "Cleaning all caches..."
    rm -rf .next
    rm -rf node_modules/.cache
    rm -rf .swc
    rm -rf node_modules/.vite
    rm -rf node_modules/.turbo
}

# Function to fix common issues
fix_common_issues() {
    echo "Fixing common webpack issues..."
    
    # Remove and reinstall webpack-related packages
    rm -rf node_modules/webpack
    rm -rf node_modules/webpack-sources
    rm -rf node_modules/next/dist/compiled/webpack
    
    # Ensure React versions are consistent
    npm dedupe react react-dom 2>/dev/null || true
}

# Main execution
echo "1. Killing existing processes..."
kill_processes

echo ""
echo "2. Cleaning caches..."
clean_caches

echo ""
echo "3. Fixing webpack issues..."
fix_common_issues

echo ""
echo "4. Starting development server..."
echo "----------------------------------------"
echo "Server will start at http://localhost:3000"
echo "If you see webpack errors, try these commands:"
echo "  1. rm -rf node_modules package-lock.json"
echo "  2. npm install --legacy-peer-deps"
echo "  3. npm run dev:clean"
echo "----------------------------------------"
echo ""

# Start the dev server
npm run dev:clean