#!/usr/bin/env tsx
/**
 * Collect baseline performance metrics before optimization deployment
 * Run this BEFORE deploying optimizations to establish comparison baseline
 */

import { ConvexClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import chalk from "chalk";
import fs from "fs/promises";
import path from "path";

// Configuration
const CONVEX_URL = process.env.VITE_CONVEX_URL || "https://your-prod-instance.convex.cloud";
const OUTPUT_DIR = path.join(process.cwd(), "performance-metrics");
const METRIC_OPERATIONS = [
  { name: "contracts.getContracts", args: { limit: 50 } },
  { name: "contracts.getContractsSimple", args: {} },
  { name: "vendors.getVendors", args: { limit: 50 } },
  { name: "vendors.getVendorAnalytics", args: {} },
  { name: "analytics.getDashboardSummary", args: {} },
  { name: "analytics.getContractAnalytics", args: {} },
  { name: "search.searchContracts", args: { query: "contract" } },
] as const;

// Initialize client
const client = new ConvexClient(CONVEX_URL);

interface MetricResult {
  operation: string;
  timestamp: string;
  measurements: number[];
  stats: {
    count: number;
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
    stdDev: number;
  };
  metadata: {
    resultCount?: number;
    hasMore?: boolean;
    error?: string;
  };
}

const results: MetricResult[] = [];

/**
 * Calculate statistics from measurements
 */
function calculateStats(measurements: number[]) {
  const sorted = [...measurements].sort((a, b) => a - b);
  const count = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);
  const avg = sum / count;
  
  // Calculate standard deviation
  const squaredDiffs = sorted.map(x => Math.pow(x - avg, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / count;
  const stdDev = Math.sqrt(avgSquaredDiff);

  return {
    count,
    avg: Math.round(avg * 100) / 100,
    min: sorted[0],
    max: sorted[count - 1],
    p50: sorted[Math.floor(count * 0.5)],
    p95: sorted[Math.floor(count * 0.95)],
    p99: sorted[Math.floor(count * 0.99)],
    stdDev: Math.round(stdDev * 100) / 100,
  };
}

/**
 * Measure operation performance
 */
async function measureOperation(
  operation: string,
  queryFn: () => Promise<any>,
  iterations: number = 10
): Promise<MetricResult> {
  console.log(chalk.gray(`  Measuring ${operation}...`));
  
  const measurements: number[] = [];
  const metadata: any = {};

  // Warm-up run
  await queryFn();

  // Actual measurements
  for (let i = 0; i < iterations; i++) {
    try {
      const start = performance.now();
      const result = await queryFn();
      const duration = performance.now() - start;
      
      measurements.push(duration);

      // Capture metadata from first run
      if (i === 0) {
        if (Array.isArray(result)) {
          metadata.resultCount = result.length;
        } else if (result && typeof result === 'object') {
          metadata.resultCount = result.contracts?.length || result.vendors?.length || result.results?.length;
          metadata.hasMore = result.hasMore;
        }
      }

      // Show progress
      if ((i + 1) % 5 === 0) {
        process.stdout.write(".");
      }
    } catch (error) {
      metadata.error = String(error);
      console.error(chalk.red(`\n  Error in ${operation}:`), error);
      break;
    }
  }
  
  console.log(" Done");

  return {
    operation,
    timestamp: new Date().toISOString(),
    measurements,
    stats: calculateStats(measurements),
    metadata,
  };
}

/**
 * Get sample enterprises for testing
 */
async function getSampleEnterprises(): Promise<{ id: string; name: string }[]> {
  try {
    // This would need to be implemented based on your actual API
    // For now, returning placeholder
    console.log(chalk.yellow("⚠️  Using placeholder enterprise IDs"));
    return [
      { id: "enterprise_1", name: "Sample Enterprise 1" },
      { id: "enterprise_2", name: "Sample Enterprise 2" },
    ];
  } catch (error) {
    console.error(chalk.red("Failed to get enterprises:"), error);
    return [];
  }
}

/**
 * Collect baseline metrics for all operations
 */
async function collectBaselines() {
  console.log(chalk.blue.bold("\n📊 Collecting Baseline Performance Metrics"));
  console.log(chalk.gray(`Convex URL: ${CONVEX_URL}`));
  console.log(chalk.gray(`Timestamp: ${new Date().toISOString()}\n`));

  // Get sample enterprises
  const enterprises = await getSampleEnterprises();
  
  if (enterprises.length === 0) {
    console.error(chalk.red("No enterprises found for testing"));
    return;
  }

  // Test each operation for each enterprise
  for (const enterprise of enterprises) {
    console.log(chalk.blue(`\n🏢 Testing Enterprise: ${enterprise.name}`));
    console.log(chalk.blue("=".repeat(50)));

    for (const { name, args } of METRIC_OPERATIONS) {
      const [module, method] = name.split(".");
      
      // Build query function based on operation
      const queryFn = () => {
        const queryArgs = { ...args, enterpriseId: enterprise.id };
        
        // Map to actual API calls
        switch (name) {
          case "contracts.getContracts":
            return client.query(api.contracts.getContracts, queryArgs);
          case "contracts.getContractsSimple":
            return client.query(api.contracts.getContractsSimple, queryArgs);
          case "vendors.getVendors":
            return client.query(api.vendors.getVendors, queryArgs);
          case "vendors.getVendorAnalytics":
            return client.query(api.vendors.getVendorAnalytics, queryArgs);
          case "analytics.getDashboardSummary":
            return client.query(api.analytics.getDashboardSummary, queryArgs);
          case "analytics.getContractAnalytics":
            return client.query(api.analytics.getContractAnalytics, queryArgs);
          case "search.searchContracts":
            return client.query(api.search.searchContracts, queryArgs);
          default:
            throw new Error(`Unknown operation: ${name}`);
        }
      };

      const result = await measureOperation(name, queryFn);
      results.push(result);
    }
  }
}

/**
 * Generate performance report
 */
function generateReport(): string {
  const report = [
    "# Baseline Performance Metrics",
    `Generated: ${new Date().toISOString()}`,
    `Environment: ${CONVEX_URL}`,
    "",
    "## Summary Statistics",
    "",
  ];

  // Group by operation
  const byOperation = results.reduce((acc, result) => {
    if (!acc[result.operation]) acc[result.operation] = [];
    acc[result.operation].push(result);
    return acc;
  }, {} as Record<string, MetricResult[]>);

  // Generate summary table
  report.push("| Operation | Samples | Avg (ms) | P95 (ms) | P99 (ms) | Std Dev |");
  report.push("|-----------|---------|----------|----------|----------|---------|");

  Object.entries(byOperation).forEach(([op, measurements]) => {
    const allMeasurements = measurements.flatMap(m => m.measurements);
    const combined = calculateStats(allMeasurements);
    
    report.push(
      `| ${op} | ${combined.count} | ${combined.avg} | ${combined.p95} | ${combined.p99} | ${combined.stdDev} |`
    );
  });

  // Detailed results
  report.push("\n## Detailed Results\n");

  Object.entries(byOperation).forEach(([op, measurements]) => {
    report.push(`### ${op}`);
    report.push("");
    
    measurements.forEach(m => {
      report.push(`**Run at ${m.timestamp}**`);
      report.push(`- Measurements: ${m.stats.count}`);
      report.push(`- Average: ${m.stats.avg}ms`);
      report.push(`- Min/Max: ${m.stats.min}ms / ${m.stats.max}ms`);
      report.push(`- P50/P95/P99: ${m.stats.p50}ms / ${m.stats.p95}ms / ${m.stats.p99}ms`);
      
      if (m.metadata.resultCount !== undefined) {
        report.push(`- Result Count: ${m.metadata.resultCount}`);
      }
      if (m.metadata.error) {
        report.push(`- ⚠️ Error: ${m.metadata.error}`);
      }
      report.push("");
    });
  });

  // Recommendations
  report.push("\n## Optimization Targets\n");
  
  const slowOperations = Object.entries(byOperation)
    .map(([op, measurements]) => {
      const allMeasurements = measurements.flatMap(m => m.measurements);
      const stats = calculateStats(allMeasurements);
      return { operation: op, stats };
    })
    .filter(({ stats }) => stats.avg > 200)
    .sort((a, b) => b.stats.avg - a.stats.avg);

  if (slowOperations.length > 0) {
    report.push("The following operations exceed the 200ms threshold and should be prioritized for optimization:");
    report.push("");
    
    slowOperations.forEach(({ operation, stats }) => {
      report.push(`- **${operation}**: ${stats.avg}ms average (${Math.round(stats.avg / 200)}x over threshold)`);
    });
  } else {
    report.push("✅ All operations are performing within acceptable thresholds.");
  }

  return report.join("\n");
}

/**
 * Save results to file
 */
async function saveResults() {
  // Ensure output directory exists
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  // Save raw JSON data
  const jsonPath = path.join(OUTPUT_DIR, `baseline-metrics-${Date.now()}.json`);
  await fs.writeFile(
    jsonPath,
    JSON.stringify({ 
      timestamp: new Date().toISOString(),
      environment: CONVEX_URL,
      results 
    }, null, 2)
  );
  console.log(chalk.green(`\n✅ Raw data saved to: ${jsonPath}`));

  // Save markdown report
  const reportPath = path.join(OUTPUT_DIR, `baseline-report-${Date.now()}.md`);
  await fs.writeFile(reportPath, generateReport());
  console.log(chalk.green(`✅ Report saved to: ${reportPath}`));

  // Save latest symlink
  const latestJsonPath = path.join(OUTPUT_DIR, "baseline-metrics-latest.json");
  const latestReportPath = path.join(OUTPUT_DIR, "baseline-report-latest.md");
  
  try {
    await fs.unlink(latestJsonPath).catch(() => {});
    await fs.unlink(latestReportPath).catch(() => {});
    await fs.symlink(path.basename(jsonPath), latestJsonPath);
    await fs.symlink(path.basename(reportPath), latestReportPath);
  } catch (error) {
    // Symlinks might not work on all systems
    await fs.copyFile(jsonPath, latestJsonPath);
    await fs.copyFile(reportPath, latestReportPath);
  }
}

/**
 * Print summary to console
 */
function printSummary() {
  console.log(chalk.blue("\n📊 Baseline Metrics Summary"));
  console.log(chalk.blue("=".repeat(60)));

  const byOperation = results.reduce((acc, result) => {
    if (!acc[result.operation]) acc[result.operation] = [];
    acc[result.operation].push(result);
    return acc;
  }, {} as Record<string, MetricResult[]>);

  Object.entries(byOperation).forEach(([op, measurements]) => {
    const allMeasurements = measurements.flatMap(m => m.measurements);
    const stats = calculateStats(allMeasurements);
    
    const status = stats.avg < 100 ? chalk.green("✅") :
                  stats.avg < 200 ? chalk.yellow("⚠️") :
                  chalk.red("❌");

    console.log(
      `${status} ${op.padEnd(35)} | ` +
      `Avg: ${chalk.cyan(stats.avg + "ms")} | ` +
      `P95: ${chalk.cyan(stats.p95 + "ms")}`
    );
  });

  console.log(chalk.blue("=".repeat(60)));
}

/**
 * Main function
 */
async function main() {
  try {
    // Collect baseline metrics
    await collectBaselines();

    // Save results
    await saveResults();

    // Print summary
    printSummary();

    console.log(chalk.green.bold("\n✅ Baseline metrics collection completed!"));
    console.log(chalk.gray("\nNext steps:"));
    console.log(chalk.gray("1. Review the generated report"));
    console.log(chalk.gray("2. Deploy optimizations"));
    console.log(chalk.gray("3. Run comparison tests"));

  } catch (error) {
    console.error(chalk.red("\n❌ Failed to collect baselines:"), error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);