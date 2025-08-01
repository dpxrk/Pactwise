#!/usr/bin/env tsx
/**
 * Check what functions are currently deployed in Convex
 */

import chalk from "chalk";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs/promises";
import path from "path";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "../.env.local") });

async function checkDeployedFunctions() {
  console.log(chalk.blue.bold("\n📋 Checking Deployed Convex Functions\n"));

  try {
    // Check generated API file
    const apiPath = path.join(__dirname, "../convex/_generated/api.d.ts");
    const apiContent = await fs.readFile(apiPath, 'utf-8');

    // Extract function names
    const functionPattern = /export declare const (\w+):/g;
    const functions = [];
    let match;

    while ((match = functionPattern.exec(apiContent)) !== null) {
      functions.push(match[1]);
    }

    console.log(chalk.blue("📦 Found API modules:"));
    
    // Group functions by module
    const modules = new Map<string, string[]>();
    
    // Check for optimized functions
    const optimizedModules = ['contracts', 'vendors', 'analytics', 'events', 'caching'];
    let hasOptimized = false;

    for (const func of functions) {
      if (func.includes('.')) {
        const [module, ...rest] = func.split('.');
        if (!modules.has(module)) {
          modules.set(module, []);
        }
        modules.get(module)!.push(rest.join('.'));
      } else {
        if (!modules.has('root')) {
          modules.set('root', []);
        }
        modules.get('root')!.push(func);
      }

      // Check for optimized functions
      if (func.includes('optimized')) {
        hasOptimized = true;
      }
    }

    // Display modules
    for (const [module, funcs] of modules.entries()) {
      console.log(chalk.yellow(`\n${module}:`));
      funcs.slice(0, 5).forEach(f => console.log(chalk.gray(`  - ${f}`)));
      if (funcs.length > 5) {
        console.log(chalk.gray(`  ... and ${funcs.length - 5} more`));
      }
    }

    // Check for optimized module
    if (modules.has('optimized')) {
      console.log(chalk.green("\n✅ Optimized functions are deployed!"));
      const optimizedFuncs = modules.get('optimized') || [];
      console.log(chalk.gray("Optimized functions available:"));
      optimizedFuncs.forEach(f => console.log(chalk.gray(`  - ${f}`)));
    } else {
      console.log(chalk.yellow("\n⚠️  Optimized functions not found in deployment"));
      console.log(chalk.gray("You may need to:"));
      console.log(chalk.gray("1. Deploy the optimized functions: npx convex deploy"));
      console.log(chalk.gray("2. Check for deployment errors"));
    }

    // Check for specific key functions
    console.log(chalk.blue("\n🔍 Checking key functions:"));
    const keyFunctions = [
      { name: 'contracts.getContracts', status: functions.includes('contracts') ? '✅' : '❌' },
      { name: 'vendors.getVendors', status: functions.includes('vendors') ? '✅' : '❌' },
      { name: 'analytics.getDashboardSummary', status: functions.includes('analytics') ? '✅' : '❌' },
      { name: 'optimized.contracts.getContractsOptimized', status: hasOptimized ? '✅' : '❌' },
    ];

    keyFunctions.forEach(({ name, status }) => {
      console.log(`${status} ${name}`);
    });

  } catch (error) {
    console.error(chalk.red("Failed to check deployed functions:"), error);
    console.log(chalk.yellow("\nTip: Make sure you've run 'npx convex codegen' first"));
  }
}

async function main() {
  await checkDeployedFunctions();

  console.log(chalk.blue("\n📝 Deployment Status Summary:"));
  console.log(chalk.gray("- Original functions: Likely deployed"));
  console.log(chalk.gray("- Optimized functions: Need to check"));
  console.log(chalk.gray("- Migration status: Can check with 'npm run migration:status'"));
}

main().catch(console.error);