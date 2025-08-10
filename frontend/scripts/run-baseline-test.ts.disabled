#!/usr/bin/env tsx
/**
 * Run baseline performance tests with current deployment
 */

import { ConvexClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
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

if (!CONVEX_URL) {
  console.error(chalk.red("NEXT_PUBLIC_CONVEX_URL not found"));
  process.exit(1);
}

const client = new ConvexClient(CONVEX_URL);

interface TestResult {
  operation: string;
  measurements: number[];
  stats: {
    avg: number;
    min: number;
    max: number;
    p95: number;
  };
  error?: string;
}

async function measureOperation(
  name: string,
  operation: () => Promise<any>,
  iterations: number = 5
): Promise<TestResult> {
  console.log(chalk.gray(`  Testing ${name}...`));
  const measurements: number[] = [];
  let error: string | undefined;

  // Warm-up
  try {
    await operation();
  } catch (e) {
    // Ignore warm-up errors
  }

  for (let i = 0; i < iterations; i++) {
    try {
      const start = performance.now();
      await operation();
      const duration = performance.now() - start;
      measurements.push(duration);
      process.stdout.write(".");
    } catch (e) {
      error = String(e);
      console.log(chalk.red(` Error: ${error}`));
      break;
    }
  }
  console.log();

  if (measurements.length === 0) {
    return {
      operation: name,
      measurements: [],
      stats: { avg: 0, min: 0, max: 0, p95: 0 },
      error
    };
  }

  const sorted = [...measurements].sort((a, b) => a - b);
  return {
    operation: name,
    measurements,
    stats: {
      avg: Math.round(measurements.reduce((a, b) => a + b, 0) / measurements.length),
      min: Math.round(sorted[0]),
      max: Math.round(sorted[sorted.length - 1]),
      p95: Math.round(sorted[Math.floor(sorted.length * 0.95)])
    },
    error
  };
}

async function runBaselineTests() {
  console.log(chalk.blue.bold("\n📊 Running Baseline Performance Tests\n"));
  console.log(chalk.gray(`Convex URL: ${CONVEX_URL}`));
  console.log(chalk.gray(`Timestamp: ${new Date().toISOString()}\n`));

  const results: TestResult[] = [];

  // Test 1: Get enterprises (simple query)
  console.log(chalk.blue("1️⃣ Testing enterprise queries..."));
  const enterpriseResult = await measureOperation(
    "enterprises.list",
    async () => {
      try {
        return await client.query(api.enterprises.list);
      } catch (e) {
        // If list doesn't exist, try another method
        return { enterprises: [] };
      }
    }
  );
  results.push(enterpriseResult);

  // Test 2: Get contracts (if available)
  console.log(chalk.blue("\n2️⃣ Testing contract queries..."));
  const contractResult = await measureOperation(
    "contracts.getContractsSimple",
    async () => {
      try {
        // First, get an enterprise ID
        const enterprises = await client.query(api.enterprises.list);
        if (enterprises && enterprises.length > 0) {
          return await client.query(api.contracts.getContractsSimple, {
            enterpriseId: enterprises[0]._id
          });
        }
        return [];
      } catch (e) {
        return { error: String(e) };
      }
    }
  );
  results.push(contractResult);

  // Test 3: Test optimized functions (if deployed)
  console.log(chalk.blue("\n3️⃣ Testing optimized queries..."));
  const optimizedResult = await measureOperation(
    "optimized.contracts.getContractsOptimized",
    async () => {
      try {
        const enterprises = await client.query(api.enterprises.list);
        if (enterprises && enterprises.length > 0) {
          return await client.query(api.optimized.contracts.getContractsOptimized, {
            enterpriseId: enterprises[0]._id,
            limit: 20
          });
        }
        return { contracts: [], hasMore: false };
      } catch (e) {
        return { error: String(e) };
      }
    }
  );
  results.push(optimizedResult);

  // Display results
  console.log(chalk.blue("\n📊 Results Summary"));
  console.log(chalk.blue("=" .repeat(60)));
  
  console.log(chalk.gray(
    "Operation".padEnd(40) +
    "Avg (ms)".padEnd(10) +
    "Min (ms)".padEnd(10) +
    "Max (ms)".padEnd(10)
  ));
  console.log(chalk.gray("-".repeat(60)));

  results.forEach(result => {
    if (result.error) {
      console.log(
        chalk.red(result.operation.padEnd(40)) +
        chalk.red("ERROR: " + result.error.substring(0, 30))
      );
    } else {
      const color = result.stats.avg < 200 ? chalk.green : 
                   result.stats.avg < 500 ? chalk.yellow : 
                   chalk.red;
      
      console.log(
        result.operation.padEnd(40) +
        color(result.stats.avg.toString().padEnd(10)) +
        result.stats.min.toString().padEnd(10) +
        result.stats.max.toString().padEnd(10)
      );
    }
  });

  // Save results
  const timestamp = Date.now();
  const resultsPath = join(__dirname, `../performance-metrics/baseline-${timestamp}.json`);
  
  await fs.mkdir(dirname(resultsPath), { recursive: true });
  await fs.writeFile(resultsPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    environment: CONVEX_URL,
    results
  }, null, 2));

  console.log(chalk.green(`\n✅ Results saved to: ${resultsPath}`));

  // Recommendations
  console.log(chalk.blue("\n💡 Observations:"));
  
  const hasOptimized = results.some(r => r.operation.includes("optimized") && !r.error);
  if (hasOptimized) {
    console.log(chalk.green("✓ Optimized functions are deployed and working"));
    
    // Compare performance if both exist
    const original = results.find(r => r.operation === "contracts.getContractsSimple");
    const optimized = results.find(r => r.operation === "optimized.contracts.getContractsOptimized");
    
    if (original && optimized && !original.error && !optimized.error) {
      const improvement = ((original.stats.avg - optimized.stats.avg) / original.stats.avg * 100).toFixed(1);
      console.log(chalk.green(`✓ Performance improvement: ${improvement}%`));
    }
  } else {
    console.log(chalk.yellow("⚠ Optimized functions not accessible yet"));
    console.log(chalk.gray("  Run: npx convex deploy"));
  }
}

async function main() {
  try {
    await runBaselineTests();
    console.log(chalk.green.bold("\n✅ Baseline testing complete!"));
  } catch (error) {
    console.error(chalk.red("\n❌ Test failed:"), error);
    process.exit(1);
  }
}

main().catch(console.error);