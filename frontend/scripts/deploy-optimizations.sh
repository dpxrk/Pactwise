#!/bin/bash

# Deploy optimizations to Convex
# This script deploys the optimized functions to your development environment

echo "🚀 Deploying Convex Optimizations"
echo "================================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check if convex is installed
if ! command -v convex &> /dev/null; then
    echo -e "${RED}❌ Convex CLI not found. Please install it first:${NC}"
    echo "npm install -g convex"
    exit 1
fi

echo -e "${GREEN}✓ Convex CLI found${NC}"

# Step 2: Generate types
echo -e "\n${YELLOW}📦 Generating Convex types...${NC}"
npx convex codegen --typecheck=disable

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Types generated successfully${NC}"
else
    echo -e "${RED}❌ Failed to generate types${NC}"
    exit 1
fi

# Step 3: Deploy to development
echo -e "\n${YELLOW}🔄 Deploying to development...${NC}"
npx convex deploy --typecheck=disable

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Deployment successful${NC}"
else
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi

# Step 4: List deployed functions
echo -e "\n${YELLOW}📋 Deployed functions:${NC}"
echo "- Optimized contract queries"
echo "- Optimized vendor analytics"
echo "- Optimized search functions"
echo "- Caching layer"
echo "- Performance monitoring"
echo "- Automated cleanup jobs"

echo -e "\n${GREEN}✅ Optimization deployment complete!${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Generate test data: npm run data:generate:small"
echo "2. Run baseline tests: npm run metrics:baseline"
echo "3. Compare performance: npm run test:optimizations"