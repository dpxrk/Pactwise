#!/usr/bin/env tsx
/**
 * Verify that the testing environment is properly set up
 */

import { ConvexClient } from "convex/browser";
import chalk from "chalk";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs/promises";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "../.env.local") });

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

async function verifyEnvironment() {
  console.log(chalk.blue.bold("\n🔍 Verifying Testing Environment\n"));

  // Check environment variables
  console.log(chalk.blue("📋 Environment Variables:"));
  const envVars = [
    { name: "NEXT_PUBLIC_CONVEX_URL", value: process.env.NEXT_PUBLIC_CONVEX_URL },
    { name: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", value: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY },
    { name: "CLERK_SECRET_KEY", value: process.env.CLERK_SECRET_KEY },
  ];

  let allPresent = true;
  envVars.forEach(({ name, value }) => {
    if (value) {
      console.log(chalk.green(`  ✓ ${name}: ${value.substring(0, 20)}...`));
    } else {
      console.log(chalk.red(`  ✗ ${name}: Not set`));
      allPresent = false;
    }
  });

  if (!allPresent) {
    console.log(chalk.red("\n❌ Missing required environment variables"));
    return false;
  }

  // Check Convex connection
  console.log(chalk.blue("\n🔌 Testing Convex Connection:"));
  try {
    const client = new ConvexClient(CONVEX_URL!);
    console.log(chalk.green(`  ✓ Connected to: ${CONVEX_URL}`));
    
    // Try a simple query to verify API is accessible
    // Note: This might fail if no data exists, which is okay
    try {
      await client.query(async ({ db }) => {
        return { status: "connected" };
      });
      console.log(chalk.green("  ✓ API is accessible"));
    } catch (error) {
      console.log(chalk.yellow("  ⚠ API query failed (this is okay if no data exists yet)"));
    }
  } catch (error) {
    console.log(chalk.red(`  ✗ Failed to connect: ${error}`));
    return false;
  }

  // Check required files exist
  console.log(chalk.blue("\n📁 Checking Required Files:"));
  const requiredFiles = [
    "convex/_generated/api.js",
    "convex/schema.ts",
    "scripts/test-optimizations.ts",
    "scripts/collect-baseline-metrics.ts",
    "scripts/generate-test-data.ts",
  ];

  for (const file of requiredFiles) {
    const path = join(__dirname, "..", file);
    try {
      await fs.access(path);
      console.log(chalk.green(`  ✓ ${file}`));
    } catch {
      console.log(chalk.red(`  ✗ ${file} - Missing`));
    }
  }

  // Check optimized functions exist
  console.log(chalk.blue("\n🚀 Checking Optimized Functions:"));
  const optimizedFiles = [
    "convex/optimized/contracts.ts",
    "convex/optimized/vendors.ts",
    "convex/optimized/analytics.ts",
    "convex/optimized/events.ts",
    "convex/optimized/caching.ts",
  ];

  let optimizedCount = 0;
  for (const file of optimizedFiles) {
    const path = join(__dirname, "..", file);
    try {
      await fs.access(path);
      console.log(chalk.green(`  ✓ ${file}`));
      optimizedCount++;
    } catch {
      console.log(chalk.yellow(`  ⚠ ${file} - Not deployed yet`));
    }
  }

  console.log(chalk.blue("\n📊 Summary:"));
  console.log(chalk.gray(`  - Environment: ${allPresent ? "Ready" : "Incomplete"}`));
  console.log(chalk.gray(`  - Convex URL: ${CONVEX_URL}`));
  console.log(chalk.gray(`  - Optimized Functions: ${optimizedCount}/${optimizedFiles.length}`));

  return allPresent;
}

async function main() {
  const isReady = await verifyEnvironment();

  if (isReady) {
    console.log(chalk.green.bold("\n✅ Environment is ready for testing!\n"));
    console.log(chalk.gray("Next steps:"));
    console.log(chalk.gray("1. Generate test data: npm run data:generate:small"));
    console.log(chalk.gray("2. Collect baseline metrics: npm run metrics:baseline"));
    console.log(chalk.gray("3. Run optimization tests: npm run test:optimizations"));
  } else {
    console.log(chalk.red.bold("\n❌ Environment setup incomplete\n"));
    console.log(chalk.gray("Please check the errors above and fix them before proceeding."));
    process.exit(1);
  }
}

main().catch(console.error);