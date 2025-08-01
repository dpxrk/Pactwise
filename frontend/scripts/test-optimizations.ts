#!/usr/bin/env tsx
/**
 * Test runner for Convex backend optimizations
 * This script runs tests and collects performance metrics
 */

import { ConvexClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import chalk from "chalk";

// Configuration
const CONVEX_URL = process.env.VITE_CONVEX_URL || "https://your-dev-instance.convex.cloud";
const TEST_SIZES = [10, 100, 500, 1000, 5000];
const ITERATIONS = 3; // Number of times to run each test

// Initialize Convex client
const client = new ConvexClient(CONVEX_URL);

// Test results storage
interface TestResult {
  operation: string;
  size: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  improvement?: number;
}

const results: TestResult[] = [];

/**
 * Measure query performance
 */
async function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>,
  iterations: number = ITERATIONS
): Promise<{ result: T; metrics: { avg: number; min: number; max: number } }> {
  const durations: number[] = [];
  let result: T;

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    result = await fn();
    const duration = performance.now() - start;
    durations.push(duration);
  }

  return {
    result: result!,
    metrics: {
      avg: durations.reduce((a, b) => a + b, 0) / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
    },
  };
}

/**
 * Generate test data
 */
async function generateTestData(size: number) {
  console.log(chalk.blue(`\n📊 Generating ${size} test records...`));

  // Create test enterprise
  const enterpriseId = await client.mutation(api.enterprises.create, {
    name: `Test Enterprise ${Date.now()}`,
    domain: "test.com",
  });

  // Create test user
  const userId = await client.mutation(api.users.create, {
    clerkId: `test_user_${Date.now()}`,
    email: "test@example.com",
    enterpriseId,
    role: "admin",
    createdAt: new Date().toISOString(),
  });

  // Create vendors
  const vendorIds: Id<"vendors">[] = [];
  console.log(chalk.gray(`Creating ${Math.min(size / 10, 50)} vendors...`));
  
  for (let i = 0; i < Math.min(size / 10, 50); i++) {
    const vendorId = await client.mutation(api.vendors.create, {
      enterpriseId,
      name: `Test Vendor ${i}`,
      contactEmail: `vendor${i}@test.com`,
      createdAt: new Date().toISOString(),
    });
    vendorIds.push(vendorId);
  }

  // Create contracts
  console.log(chalk.gray(`Creating ${size} contracts...`));
  const contractIds: Id<"contracts">[] = [];
  
  const batchSize = 50;
  for (let i = 0; i < size; i += batchSize) {
    const batch = [];
    for (let j = 0; j < Math.min(batchSize, size - i); j++) {
      const idx = i + j;
      batch.push(
        client.mutation(api.contracts.createContract, {
          enterpriseId,
          vendorId: vendorIds[idx % vendorIds.length],
          title: `Test Contract ${idx}`,
          storageId: "test_storage_id" as Id<"_storage">,
          fileName: `contract_${idx}.pdf`,
          fileType: "application/pdf",
          contractType: ["nda", "msa", "sow", "saas"][idx % 4] as any,
        })
      );
    }
    const ids = await Promise.all(batch);
    contractIds.push(...ids);
    
    if ((i + batchSize) % 500 === 0) {
      console.log(chalk.gray(`  Created ${i + batchSize} contracts...`));
    }
  }

  console.log(chalk.green(`✅ Test data generated successfully`));

  return { enterpriseId, userId, vendorIds, contractIds };
}

/**
 * Test contract queries
 */
async function testContractQueries(enterpriseId: Id<"enterprises">, size: number) {
  console.log(chalk.blue(`\n🔍 Testing contract queries with ${size} records...`));

  // Test original implementation
  console.log(chalk.gray("Testing original getContracts..."));
  const originalMetrics = await measurePerformance(
    "getContracts",
    () => client.query(api.contracts.getContracts, {
      enterpriseId,
      limit: 50,
    })
  );

  // Test optimized implementation
  console.log(chalk.gray("Testing optimized getContractsOptimized..."));
  const optimizedMetrics = await measurePerformance(
    "getContractsOptimized",
    () => client.query(api.optimized.contracts.getContractsOptimized, {
      enterpriseId,
      limit: 50,
    })
  );

  // Calculate improvement
  const improvement = ((originalMetrics.metrics.avg - optimizedMetrics.metrics.avg) / originalMetrics.metrics.avg) * 100;

  // Store results
  results.push({
    operation: "getContracts (original)",
    size,
    ...originalMetrics.metrics,
  });

  results.push({
    operation: "getContracts (optimized)",
    size,
    ...optimizedMetrics.metrics,
    improvement,
  });

  console.log(chalk.green(`✅ Contract queries tested - ${improvement.toFixed(1)}% improvement`));
}

/**
 * Test vendor analytics
 */
async function testVendorAnalytics(enterpriseId: Id<"enterprises">, size: number) {
  console.log(chalk.blue(`\n📈 Testing vendor analytics with ${size} records...`));

  // Test original implementation
  console.log(chalk.gray("Testing original getVendorAnalytics..."));
  const originalMetrics = await measurePerformance(
    "getVendorAnalytics",
    () => client.query(api.vendors.getVendorAnalytics, {
      enterpriseId,
    })
  );

  // Test optimized implementation
  console.log(chalk.gray("Testing optimized getVendorAnalyticsOptimized..."));
  const optimizedMetrics = await measurePerformance(
    "getVendorAnalyticsOptimized",
    () => client.query(api.optimized.vendors.getVendorAnalyticsOptimized, {
      enterpriseId,
      limit: 20,
    })
  );

  // Calculate improvement
  const improvement = ((originalMetrics.metrics.avg - optimizedMetrics.metrics.avg) / originalMetrics.metrics.avg) * 100;

  // Store results
  results.push({
    operation: "getVendorAnalytics (original)",
    size,
    ...originalMetrics.metrics,
  });

  results.push({
    operation: "getVendorAnalytics (optimized)",
    size,
    ...optimizedMetrics.metrics,
    improvement,
  });

  console.log(chalk.green(`✅ Vendor analytics tested - ${improvement.toFixed(1)}% improvement`));
}

/**
 * Test search functionality
 */
async function testSearch(enterpriseId: Id<"enterprises">, size: number) {
  console.log(chalk.blue(`\n🔎 Testing search with ${size} records...`));

  // Test optimized search
  console.log(chalk.gray("Testing optimized search..."));
  const searchMetrics = await measurePerformance(
    "searchContractsOptimized",
    () => client.query(api.optimized.analytics.searchContractsOptimized, {
      enterpriseId,
      query: "test",
      limit: 20,
    })
  );

  results.push({
    operation: "searchContracts (optimized)",
    size,
    ...searchMetrics.metrics,
  });

  console.log(chalk.green(`✅ Search tested - avg ${searchMetrics.metrics.avg.toFixed(1)}ms`));
}

/**
 * Test caching functionality
 */
async function testCaching(enterpriseId: Id<"enterprises">) {
  console.log(chalk.blue(`\n💾 Testing caching functionality...`));

  // First call (cache miss)
  console.log(chalk.gray("Testing cache miss..."));
  const firstCallMetrics = await measurePerformance(
    "getCachedDashboardSummary (miss)",
    () => client.query(api.optimized.caching.getCachedDashboardSummary, {
      enterpriseId,
    }),
    1 // Single iteration for cache test
  );

  // Second call (cache hit)
  console.log(chalk.gray("Testing cache hit..."));
  const secondCallMetrics = await measurePerformance(
    "getCachedDashboardSummary (hit)",
    () => client.query(api.optimized.caching.getCachedDashboardSummary, {
      enterpriseId,
    }),
    5 // More iterations for cache hit
  );

  const cacheImprovement = ((firstCallMetrics.metrics.avg - secondCallMetrics.metrics.avg) / firstCallMetrics.metrics.avg) * 100;

  console.log(chalk.green(`✅ Caching tested - ${cacheImprovement.toFixed(1)}% improvement on cache hit`));

  results.push({
    operation: "Dashboard (no cache)",
    size: 0,
    ...firstCallMetrics.metrics,
  });

  results.push({
    operation: "Dashboard (cached)",
    size: 0,
    ...secondCallMetrics.metrics,
    improvement: cacheImprovement,
  });
}

/**
 * Print results table
 */
function printResults() {
  console.log(chalk.blue("\n📊 Performance Test Results"));
  console.log(chalk.blue("=" .repeat(80)));

  // Group results by operation type
  const groupedResults = results.reduce((acc, result) => {
    const baseOp = result.operation.replace(/ \(.*\)/, "");
    if (!acc[baseOp]) acc[baseOp] = [];
    acc[baseOp].push(result);
    return acc;
  }, {} as Record<string, TestResult[]>);

  // Print results for each operation
  Object.entries(groupedResults).forEach(([operation, opResults]) => {
    console.log(chalk.yellow(`\n${operation}`));
    console.log(chalk.gray("-".repeat(80)));
    
    // Create table header
    console.log(
      chalk.gray(
        "Size".padEnd(10) +
        "Version".padEnd(20) +
        "Avg (ms)".padEnd(12) +
        "Min (ms)".padEnd(12) +
        "Max (ms)".padEnd(12) +
        "Improvement"
      )
    );

    // Print results
    opResults.forEach(result => {
      const version = result.operation.includes("optimized") ? "Optimized" : 
                     result.operation.includes("cached") ? "Cached" : "Original";
      
      const improvement = result.improvement ? 
        chalk.green(`+${result.improvement.toFixed(1)}%`) : "-";

      console.log(
        (result.size || "-").toString().padEnd(10) +
        version.padEnd(20) +
        result.avgDuration.toFixed(1).padEnd(12) +
        result.minDuration.toFixed(1).padEnd(12) +
        result.maxDuration.toFixed(1).padEnd(12) +
        improvement
      );
    });
  });

  // Calculate overall improvement
  const improvements = results.filter(r => r.improvement).map(r => r.improvement!);
  const avgImprovement = improvements.length > 0 ?
    improvements.reduce((a, b) => a + b, 0) / improvements.length : 0;

  console.log(chalk.blue("\n" + "=".repeat(80)));
  console.log(chalk.green(`🎯 Average Performance Improvement: ${avgImprovement.toFixed(1)}%`));
}

/**
 * Clean up test data
 */
async function cleanup(enterpriseId: Id<"enterprises">) {
  console.log(chalk.blue("\n🧹 Cleaning up test data..."));
  
  try {
    // Delete test enterprise (this should cascade delete related data)
    await client.mutation(api.enterprises.delete, { id: enterpriseId });
    console.log(chalk.green("✅ Test data cleaned up"));
  } catch (error) {
    console.log(chalk.yellow("⚠️  Manual cleanup may be required"));
  }
}

/**
 * Main test runner
 */
async function main() {
  console.log(chalk.blue.bold("\n🚀 Convex Backend Optimization Test Suite"));
  console.log(chalk.gray(`Testing with sizes: ${TEST_SIZES.join(", ")}`));
  console.log(chalk.gray(`Iterations per test: ${ITERATIONS}`));
  console.log(chalk.gray(`Convex URL: ${CONVEX_URL}\n`));

  try {
    for (const size of TEST_SIZES) {
      console.log(chalk.blue.bold(`\n📦 Testing with ${size} records`));
      console.log(chalk.blue("=".repeat(50)));

      // Generate test data
      const { enterpriseId, userId, vendorIds, contractIds } = await generateTestData(size);

      // Run tests
      await testContractQueries(enterpriseId, size);
      await testVendorAnalytics(enterpriseId, size);
      
      if (size <= 1000) { // Search tests are expensive
        await testSearch(enterpriseId, size);
      }

      // Test caching (only once)
      if (size === TEST_SIZES[0]) {
        await testCaching(enterpriseId);
      }

      // Cleanup
      await cleanup(enterpriseId);
    }

    // Print results
    printResults();

    console.log(chalk.green.bold("\n✅ All tests completed successfully!"));
    
  } catch (error) {
    console.error(chalk.red("\n❌ Test failed:"), error);
    process.exit(1);
  }
}

// Run tests
main().catch(console.error);