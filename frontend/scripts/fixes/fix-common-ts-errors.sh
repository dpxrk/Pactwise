#!/bin/bash

# Fix missing Id type imports
echo "Fixing missing Id type imports..."
find src -name "*.tsx" -o -name "*.ts" | while read file; do
  if grep -q "Id<" "$file" && ! grep -q "import.*Id.*from.*types/id.types" "$file"; then
    # Check if file uses Id type
    if grep -q "^import" "$file"; then
      # Add import after first import statement
      sed -i "/^import/a import type { Id } from '@/types/id.types';" "$file"
      echo "Fixed: $file"
    fi
  fi
done

# Fix duplicate isLoading declarations
echo "Fixing duplicate isLoading declarations..."
find src -name "*.tsx" -o -name "*.ts" | while read file; do
  if grep -q "const.*isLoading.*=.*useAuth" "$file"; then
    sed -i 's/const { user, userProfile, isLoading }/const { user, userProfile, isLoading: authLoading }/g' "$file"
    echo "Fixed auth isLoading in: $file"
  fi
done

echo "Common TypeScript errors fixed!"