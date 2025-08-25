#!/bin/bash

echo "Removing duplicate Id type imports..."

find src -name "*.tsx" -o -name "*.ts" | while read file; do
  # Count how many Id imports exist
  count=$(grep -c "import type { Id } from '@/types/id.types';" "$file" 2>/dev/null || echo 0)
  
  if [ "$count" -gt 1 ]; then
    echo "Fixing $file (found $count imports)"
    
    # Create a temporary file
    temp_file=$(mktemp)
    
    # Keep only the first import, remove others
    awk '/import type \{ Id \} from .@\/types\/id\.types.;/ && !seen {seen=1; print; next} 
         /import type \{ Id \} from .@\/types\/id\.types.;/ {next} 
         {print}' "$file" > "$temp_file"
    
    # Replace the original file
    mv "$temp_file" "$file"
  fi
done

# Also remove any malformed import statements within other imports
echo "Fixing malformed import statements..."

find src -name "*.tsx" -o -name "*.ts" | while read file; do
  # Fix cases where import was added inside another import block
  if grep -q "^import {$" "$file"; then
    sed -i '/^import {$/,/^}.*/ {
      /^import type { Id }/d
    }' "$file" 2>/dev/null || true
  fi
done

echo "Duplicate imports fixed!"