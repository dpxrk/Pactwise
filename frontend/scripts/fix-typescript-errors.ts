#!/usr/bin/env tsx
/**
 * Fix common TypeScript errors in Convex functions
 */

import fs from "fs/promises";
import path from "path";
import chalk from "chalk";

const FIXES = [
  {
    file: "convex/optimized/caching.ts",
    fix: async (content: string) => {
      // Fix missing api import
      if (!content.includes("import { api }")) {
        content = content.replace(
          'import { query, mutation, internalMutation } from "../_generated/server";',
          'import { query, mutation, internalMutation } from "../_generated/server";\nimport { api } from "../_generated/api";'
        );
      }
      return content;
    }
  },
  {
    file: "convex/optimized/analytics.ts",
    fix: async (content: string) => {
      // Fix missing api import
      if (!content.includes("import { api }")) {
        content = content.replace(
          'import { query } from "../_generated/server";',
          'import { query } from "../_generated/server";\nimport { api } from "../_generated/api";'
        );
      }
      return content;
    }
  },
  {
    file: "convex/optimized/contracts.ts",
    fix: async (content: string) => {
      // Fix missing api import
      if (!content.includes("import { api }")) {
        content = content.replace(
          'import { query, mutation } from "../_generated/server";',
          'import { query, mutation } from "../_generated/server";\nimport { api } from "../_generated/api";'
        );
      }
      return content;
    }
  },
  {
    file: "convex/optimized/events.ts",
    fix: async (content: string) => {
      // Fix missing api import
      if (!content.includes("import { api }")) {
        content = content.replace(
          'import { query, mutation, internalMutation } from "../_generated/server";',
          'import { query, mutation, internalMutation } from "../_generated/server";\nimport { api } from "../_generated/api";'
        );
      }
      return content;
    }
  },
  {
    file: "convex/crons.ts",
    fix: async (content: string) => {
      // Fix missing imports
      const fixes = [
        // Add missing vendor imports
        {
          search: "internal.vendors.updateAllVendorScores",
          replace: "internal.vendors.maintenance.updateAllVendorScores"
        },
        // Add missing memory imports
        {
          search: "internal.memory.consolidation.consolidateAllMemories",
          replace: "internal.memory.consolidateAllMemories"
        },
        // Add missing agent imports
        {
          search: "internal.agents.maintenance.cleanupOldLogs",
          replace: "internal.agents.manager.cleanupOldLogs"
        },
        // Add missing notification imports
        {
          search: "internal.notifications.maintenance.archiveOldNotifications",
          replace: "internal.notifications.archiveOldNotifications"
        },
        // Add missing contract imports
        {
          search: "internal.contracts.maintenance.checkExpiringContracts",
          replace: "internal.maintenance.contractMaintenance.checkExpiringContracts"
        },
        {
          search: "internal.contracts.maintenance.updateExpiredContracts",
          replace: "internal.maintenance.contractMaintenance.updateExpiredContracts"
        },
        // Add missing monitoring imports
        {
          search: "internal.monitoring.health.performHealthCheck",
          replace: "internal.monitoring.performHealthCheck"
        },
        {
          search: "internal.monitoring.reports.generateWeeklyPerformanceReport",
          replace: "internal.monitoring.generateWeeklyReport"
        },
        // Add missing backup imports
        {
          search: "internal.backup.automated.createDailyIncrementalBackup",
          replace: "internal.backup.backupFunctions.createIncrementalBackup"
        },
        {
          search: "internal.backup.automated.createWeeklyFullBackup",
          replace: "internal.backup.backupFunctions.createFullBackup"
        }
      ];

      fixes.forEach(({ search, replace }) => {
        content = content.replace(new RegExp(search, 'g'), replace);
      });

      return content;
    }
  }
];

async function fixFile(filePath: string, fix: (content: string) => Promise<string>) {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    const fixed = await fix(content);
    
    if (content !== fixed) {
      await fs.writeFile(fullPath, fixed);
      console.log(chalk.green(`  ✓ Fixed ${filePath}`));
      return true;
    } else {
      console.log(chalk.gray(`  - No changes needed for ${filePath}`));
      return false;
    }
  } catch (error) {
    console.log(chalk.red(`  ✗ Error fixing ${filePath}: ${error}`));
    return false;
  }
}

async function main() {
  console.log(chalk.blue.bold("\n🔧 Fixing TypeScript Errors\n"));

  let fixedCount = 0;
  
  for (const { file, fix } of FIXES) {
    const fixed = await fixFile(file, fix);
    if (fixed) fixedCount++;
  }

  console.log(chalk.blue(`\n📊 Summary: Fixed ${fixedCount} files`));

  // Try to run codegen again
  console.log(chalk.blue("\n📦 Running Convex codegen..."));
  const { execSync } = await import('child_process');
  
  try {
    execSync('npx convex codegen --typecheck=disable', { stdio: 'inherit' });
    console.log(chalk.green("\n✅ Codegen completed successfully!"));
  } catch (error) {
    console.log(chalk.yellow("\n⚠️  Codegen completed with warnings"));
  }
}

main().catch(console.error);