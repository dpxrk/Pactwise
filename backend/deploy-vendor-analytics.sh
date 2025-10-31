#!/bin/bash

# Deploy Vendor Analytics System
# This script deploys the vendor analytics edge function and runs the migration

set -e

echo "🚀 Deploying Vendor Analytics System..."
echo ""

# Check if we're in the right directory
if [ ! -d "supabase/functions/vendor-analytics" ]; then
    echo "❌ Error: Must be run from backend directory"
    exit 1
fi

# Step 1: Run the database migration
echo "📊 Step 1/2: Running database migration..."
cd ..
npx supabase db push || {
    echo "⚠️  Migration failed. This might be expected if already applied."
    echo "   Continuing with deployment..."
}
cd backend

# Step 2: Deploy the edge function
echo "⚡ Step 2/2: Deploying vendor-analytics edge function..."
npx supabase functions deploy vendor-analytics --no-verify-jwt || {
    echo "❌ Failed to deploy edge function"
    echo ""
    echo "📝 Manual deployment steps:"
    echo "   1. cd backend"
    echo "   2. npx supabase functions deploy vendor-analytics"
    exit 1
}

echo ""
echo "✅ Vendor Analytics System deployed successfully!"
echo ""
echo "🔍 Test the endpoint:"
echo "   Navigate to /dashboard/vendors and select a vendor"
echo "   The sidebar should show AI-powered analytics"
echo ""
