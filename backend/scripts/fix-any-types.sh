#!/bin/bash

# Script to systematically replace 'any' types with proper TypeScript types
# This script fixes the most common patterns

set -e

BACKEND_DIR="/home/dpxrk/pactwise-fork/backend"
cd "$BACKEND_DIR"

echo "Starting systematic 'any' type elimination..."
echo "=========================================="

# Track changes
CHANGES_FILE="/tmp/any-type-changes.log"
> "$CHANGES_FILE"

# Function to log changes
log_change() {
    echo "$1" >> "$CHANGES_FILE"
}

# Pattern 1: Replace 'null as any' with 'null'
echo "1. Fixing 'null as any' patterns..."
FILES=$(grep -rl "null as any" --include="*.ts" supabase/functions supabase/types 2>/dev/null || true)
for file in $FILES; do
    if [ -f "$file" ]; then
        sed -i 's/null as any/null/g' "$file"
        log_change "Fixed 'null as any' in $file"
    fi
done

# Pattern 2: Replace ': any' with ': Record<string, unknown>' for object types
echo "2. Fixing parameter types..."
# This is more complex and requires manual review for each case

# Pattern 3: Replace 'data: any' with 'data: Record<string, unknown>'
FILES=$(grep -rl "data: any" --include="*.ts" supabase/functions 2>/dev/null || true)
for file in $FILES; do
    if [ -f "$file" ]; then
        # Only replace in function parameters and interface definitions
        sed -i 's/\([(,]\s*\)data: any\(\s*[,)]\)/\1data: Record<string, unknown>\2/g' "$file"
        log_change "Fixed 'data: any' parameters in $file"
    fi
done

# Pattern 4: Replace 'context: any' with 'context: Record<string, unknown>'
FILES=$(grep -rl "context: any" --include="*.ts" supabase/functions 2>/dev/null || true)
for file in $FILES; do
    if [ -f "$file" ]; then
        sed -i 's/context: any/context: Record<string, unknown>/g' "$file"
        log_change "Fixed 'context: any' in $file"
    fi
done

# Pattern 5: Replace 'parameters: any' with 'parameters: Record<string, unknown>'
FILES=$(grep -rl "parameters: any" --include="*.ts" supabase/functions 2>/dev/null || true)
for file in $FILES; do
    if [ -f "$file" ]; then
        sed -i 's/parameters: any/parameters: Record<string, unknown>/g' "$file"
        log_change "Fixed 'parameters: any' in $file"
    fi
done

# Pattern 6: Replace 'value: any' with 'value: unknown'
FILES=$(grep -rl "value: any" --include="*.ts" supabase/functions supabase/types 2>/dev/null || true)
for file in $FILES; do
    if [ -f "$file" ]; then
        sed -i 's/value: any/value: unknown/g' "$file"
        log_change "Fixed 'value: any' in $file"
    fi
done

# Pattern 7: Replace ': any[]' with ': unknown[]'
FILES=$(grep -rl ": any\[\]" --include="*.ts" supabase/functions supabase/types 2>/dev/null || true)
for file in $FILES; do
    if [ -f "$file" ]; then
        sed -i 's/: any\[\]/: unknown[]/g' "$file"
        log_change "Fixed ': any[]' in $file"
    fi
done

# Pattern 8: Replace 'result: any' with 'result: unknown'
FILES=$(grep -rl "result: any" --include="*.ts" supabase/functions 2>/dev/null || true)
for file in $FILES; do
    if [ -f "$file" ]; then
        sed -i 's/result: any/result: unknown/g' "$file"
        log_change "Fixed 'result: any' in $file"
    fi
done

# Pattern 9: Replace 'error: any' with proper error handling
FILES=$(grep -rl "error: any" --include="*.ts" supabase/functions 2>/dev/null || true)
for file in $FILES; do
    if [ -f "$file" ]; then
        sed -i 's/error: any/error: unknown/g' "$file"
        log_change "Fixed 'error: any' in $file"
    fi
done

# Pattern 10: Replace 'metadata: any' with 'metadata: Record<string, unknown>'
FILES=$(grep -rl "metadata: any" --include="*.ts" supabase/functions supabase/types 2>/dev/null || true)
for file in $FILES; do
    if [ -f "$file" ]; then
        sed -i 's/metadata: any/metadata: Record<string, unknown>/g' "$file"
        log_change "Fixed 'metadata: any' in $file"
    fi
done

# Pattern 11: Replace ': Promise<any>' with ': Promise<unknown>'
FILES=$(grep -rl "Promise<any>" --include="*.ts" supabase/functions 2>/dev/null || true)
for file in $FILES; do
    if [ -f "$file" ]; then
        sed -i 's/Promise<any>/Promise<unknown>/g' "$file"
        log_change "Fixed 'Promise<any>' in $file"
    fi
done

# Pattern 12: Replace 'payload: any' with 'payload: Record<string, unknown>'
FILES=$(grep -rl "payload: any" --include="*.ts" supabase/functions 2>/dev/null || true)
for file in $FILES; do
    if [ -f "$file" ]; then
        sed -i 's/payload: any/payload: Record<string, unknown>/g' "$file"
        log_change "Fixed 'payload: any' in $file"
    fi
done

echo ""
echo "=========================================="
echo "Summary of changes:"
echo "=========================================="
cat "$CHANGES_FILE" | sort | uniq -c
echo ""
echo "Total unique files modified:"
cat "$CHANGES_FILE" | cut -d' ' -f4- | sort | uniq | wc -l
echo ""
echo "Log file saved to: $CHANGES_FILE"
echo "=========================================="
