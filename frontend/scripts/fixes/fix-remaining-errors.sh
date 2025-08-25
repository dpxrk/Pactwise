#!/bin/bash

echo "Fixing remaining syntax errors..."

# Fix ContractVersionHistory.tsx - duplicate isLoading
echo "Fixing ContractVersionHistory.tsx..."
sed -i '113,115d' src/app/_components/contracts/ContractVersionHistory.tsx

# Fix health/route.ts - orphaned code block
echo "Fixing health/route.ts..."
cat > /tmp/health-route-fix.txt << 'EOF'
      // Record the health check
      // await convex.mutation(api.monitoring.systemHealth.recordHealthCheck, {
      //   status: convexHealth.status
      // }).catch(() => {
      //   // Ignore recording errors to avoid cascading failures
      // });
EOF
sed -i '16,21s/.*//' src/app/api/v1/health/route.ts
sed -i '16r /tmp/health-route-fix.txt' src/app/api/v1/health/route.ts

# Fix contracts/page.tsx - orphaned code block
echo "Fixing contracts/page.tsx..."
sed -i '79,81d' src/app/dashboard/contracts/page.tsx

# Fix templates/[id]/edit/page.tsx - orphaned code block
echo "Fixing templates/[id]/edit/page.tsx..."
sed -i '112,114d' src/app/dashboard/contracts/templates/[id]/edit/page.tsx

echo "Cleanup complete!"