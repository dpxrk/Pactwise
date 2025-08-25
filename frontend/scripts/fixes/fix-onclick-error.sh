#!/bin/bash

echo "Fixing onClick handler errors in Next.js app..."

# Kill existing Next.js processes
echo "Stopping existing Next.js processes..."
pkill -f "next dev" 2>/dev/null || true

# Clean build cache
echo "Cleaning build cache..."
rm -rf .next
rm -rf node_modules/.cache

# Ensure all interactive components have 'use client' directive
echo "Checking for missing 'use client' directives..."

# Find all TSX files with onClick handlers
find src -name "*.tsx" -type f | while read file; do
    # Check if file has onClick but no 'use client'
    if grep -q "onClick" "$file" && ! grep -q "^[\"']use client[\"']" "$file"; then
        echo "Adding 'use client' to: $file"
        # Add 'use client' at the beginning of the file
        echo "'use client'" | cat - "$file" > temp && mv temp "$file"
    fi
done

echo "Starting development server..."
npm run dev

echo "Fix complete! The application should now run without onClick errors."