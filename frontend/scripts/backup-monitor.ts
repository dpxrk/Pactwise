#!/usr/bin/env tsx

/**
 * Backup monitoring script
 * Checks backup health and sends alerts if issues are found
 */

import { ConvexClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const ALERT_THRESHOLDS = {
  BACKUP_AGE_HOURS: 26, // Alert if no backup in 26 hours
  BACKUP_SIZE_VARIANCE: 0.5, // Alert if backup size varies by 50%
  MIN_TABLES_COUNT: 10, // Minimum expected tables in backup
};

interface BackupHealth {
  healthy: boolean;
  issues: string[];
  lastBackup?: {
    id: string;
    timestamp: string;
    type: string;
    recordCount: number;
    size: number;
  };
  recommendations: string[];
}

async function checkBackupHealth(): Promise<BackupHealth> {
  const client = new ConvexClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  const health: BackupHealth = {
    healthy: true,
    issues: [],
    recommendations: [],
  };

  try {
    // Get recent backups
    const recentBackups = await client.query(api.backup.monitoring.getRecentBackups, {
      limit: 10,
    });

    if (!recentBackups || recentBackups.length === 0) {
      health.healthy = false;
      health.issues.push("No backups found");
      health.recommendations.push("Run manual backup immediately");
      return health;
    }

    // Check latest backup age
    const latestBackup = recentBackups[0];
    health.lastBackup = latestBackup;
    
    const backupAge = Date.now() - new Date(latestBackup.timestamp).getTime();
    const ageInHours = backupAge / (1000 * 60 * 60);

    if (ageInHours > ALERT_THRESHOLDS.BACKUP_AGE_HOURS) {
      health.healthy = false;
      health.issues.push(`Latest backup is ${ageInHours.toFixed(1)} hours old`);
      health.recommendations.push("Check cron job status");
    }

    // Check backup completeness
    if (latestBackup.status !== 'completed') {
      health.healthy = false;
      health.issues.push(`Latest backup status: ${latestBackup.status}`);
      if (latestBackup.error) {
        health.issues.push(`Error: ${latestBackup.error}`);
      }
    }

    // Check backup size consistency
    if (recentBackups.length >= 2) {
      const previousBackup = recentBackups[1];
      const sizeChange = Math.abs(latestBackup.size - previousBackup.size) / previousBackup.size;
      
      if (sizeChange > ALERT_THRESHOLDS.BACKUP_SIZE_VARIANCE) {
        health.issues.push(
          `Backup size changed by ${(sizeChange * 100).toFixed(1)}% ` +
          `(${formatBytes(previousBackup.size)} → ${formatBytes(latestBackup.size)})`
        );
        health.recommendations.push("Investigate data changes");
      }
    }

    // Check table count
    if (latestBackup.tables.length < ALERT_THRESHOLDS.MIN_TABLES_COUNT) {
      health.healthy = false;
      health.issues.push(
        `Only ${latestBackup.tables.length} tables backed up, ` +
        `expected at least ${ALERT_THRESHOLDS.MIN_TABLES_COUNT}`
      );
    }

    // Check for backup failures in recent history
    const failedBackups = recentBackups.filter(b => b.status === 'failed');
    if (failedBackups.length > 0) {
      health.issues.push(`${failedBackups.length} failed backups in recent history`);
      health.recommendations.push("Review backup logs for errors");
    }

    // Add general recommendations
    if (health.healthy) {
      health.recommendations.push("Schedule regular restore tests");
      health.recommendations.push("Review backup retention policies");
    }

  } catch (error) {
    health.healthy = false;
    health.issues.push(`Failed to check backup health: ${error}`);
  }

  return health;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function sendAlert(health: BackupHealth) {
  console.error("🚨 BACKUP HEALTH ALERT 🚨");
  console.error("Issues found:", health.issues.join('\n'));
  console.error("Recommendations:", health.recommendations.join('\n'));
  
  // In production, integrate with your alerting system:
  // - Send to Slack/Discord
  // - Create PagerDuty incident
  // - Send email alert
  // - Update status page
}

async function main() {
  console.log("🔍 Checking backup health...");
  
  const health = await checkBackupHealth();
  
  if (health.healthy) {
    console.log("✅ Backup system is healthy");
    if (health.lastBackup) {
      console.log(`Last backup: ${health.lastBackup.id}`);
      console.log(`Timestamp: ${health.lastBackup.timestamp}`);
      console.log(`Type: ${health.lastBackup.type}`);
      console.log(`Size: ${formatBytes(health.lastBackup.size)}`);
      console.log(`Records: ${health.lastBackup.recordCount.toLocaleString()}`);
    }
  } else {
    await sendAlert(health);
    process.exit(1);
  }
  
  if (health.recommendations.length > 0) {
    console.log("\n📋 Recommendations:");
    health.recommendations.forEach(rec => console.log(`  - ${rec}`));
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { checkBackupHealth, BackupHealth };