#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';

interface BundleStats {
  timestamp: string;
  buildId: string;
  bundles: {
    name: string;
    size: number;
    gzipSize: number;
  }[];
  totalSize: number;
  totalGzipSize: number;
}

interface BundleSizeLimit {
  name: string;
  maxSize: number; // in KB
  maxGzipSize: number; // in KB
}

// Define bundle size limits
const BUNDLE_SIZE_LIMITS: BundleSizeLimit[] = [
  { name: 'vendor', maxSize: 350, maxGzipSize: 120 },
  { name: 'framework', maxSize: 150, maxGzipSize: 50 },
  { name: 'common', maxSize: 80, maxGzipSize: 25 },
  { name: 'three', maxSize: 300, maxGzipSize: 100 }, // Keep Three.js limit unchanged
  { name: 'ui', maxSize: 120, maxGzipSize: 40 },
];

const TOTAL_SIZE_LIMIT = 1000; // 1MB total
const TOTAL_GZIP_SIZE_LIMIT = 350; // 350KB gzipped

class BundleSizeMonitor {
  private historyPath = path.join(process.cwd(), '.bundle-size-history.json');
  private nextDistPath = path.join(process.cwd(), '.next');
  
  async run() {
    console.log(chalk.blue('🔍 Bundle Size Monitor\n'));

    // Check if build exists
    if (!fs.existsSync(this.nextDistPath)) {
      console.error(chalk.red('❌ No build found. Run "npm run build" first.'));
      process.exit(1);
    }

    // Analyze bundle sizes
    const stats = await this.analyzeBundles();
    
    // Check against limits
    const violations = this.checkSizeLimits(stats);
    
    // Load history
    const history = this.loadHistory();
    
    // Compare with previous build
    if (history.length > 0) {
      this.compareToPrevious(stats, history[history.length - 1]);
    }
    
    // Save to history
    this.saveToHistory(stats);
    
    // Print report
    this.printReport(stats, violations);
    
    // Exit with error if violations
    if (violations.length > 0) {
      process.exit(1);
    }
  }

  private async analyzeBundles(): Promise<BundleStats> {
    const buildManifest = JSON.parse(
      fs.readFileSync(path.join(this.nextDistPath, 'build-manifest.json'), 'utf8')
    );
    
    const bundles: BundleStats['bundles'] = [];
    let totalSize = 0;
    let totalGzipSize = 0;
    
    // Analyze static chunks
    const staticDir = path.join(this.nextDistPath, 'static', 'chunks');
    if (fs.existsSync(staticDir)) {
      const files = fs.readdirSync(staticDir);
      
      for (const file of files) {
        if (file.endsWith('.js')) {
          const filePath = path.join(staticDir, file);
          const stats = fs.statSync(filePath);
          const size = stats.size;
          
          // Estimate gzip size (rough approximation)
          const gzipSize = Math.round(size * 0.3);
          
          bundles.push({
            name: file,
            size: Math.round(size / 1024), // KB
            gzipSize: Math.round(gzipSize / 1024), // KB
          });
          
          totalSize += size;
          totalGzipSize += gzipSize;
        }
      }
    }
    
    return {
      timestamp: new Date().toISOString(),
      buildId: buildManifest.buildId || 'unknown',
      bundles,
      totalSize: Math.round(totalSize / 1024),
      totalGzipSize: Math.round(totalGzipSize / 1024),
    };
  }

  private checkSizeLimits(stats: BundleStats): string[] {
    const violations: string[] = [];
    
    // Check individual bundle limits
    for (const limit of BUNDLE_SIZE_LIMITS) {
      const bundle = stats.bundles.find(b => b.name.includes(limit.name));
      if (bundle) {
        if (bundle.size > limit.maxSize) {
          violations.push(
            `Bundle "${limit.name}" exceeds size limit: ${bundle.size}KB > ${limit.maxSize}KB`
          );
        }
        if (bundle.gzipSize > limit.maxGzipSize) {
          violations.push(
            `Bundle "${limit.name}" exceeds gzip size limit: ${bundle.gzipSize}KB > ${limit.maxGzipSize}KB`
          );
        }
      }
    }
    
    // Check total size limits
    if (stats.totalSize > TOTAL_SIZE_LIMIT) {
      violations.push(
        `Total bundle size exceeds limit: ${stats.totalSize}KB > ${TOTAL_SIZE_LIMIT}KB`
      );
    }
    if (stats.totalGzipSize > TOTAL_GZIP_SIZE_LIMIT) {
      violations.push(
        `Total gzip size exceeds limit: ${stats.totalGzipSize}KB > ${TOTAL_GZIP_SIZE_LIMIT}KB`
      );
    }
    
    return violations;
  }

  private loadHistory(): BundleStats[] {
    if (fs.existsSync(this.historyPath)) {
      return JSON.parse(fs.readFileSync(this.historyPath, 'utf8'));
    }
    return [];
  }

  private saveToHistory(stats: BundleStats) {
    const history = this.loadHistory();
    history.push(stats);
    
    // Keep only last 10 builds
    if (history.length > 10) {
      history.shift();
    }
    
    fs.writeFileSync(this.historyPath, JSON.stringify(history, null, 2));
  }

  private compareToPrevious(current: BundleStats, previous: BundleStats) {
    console.log(chalk.yellow('\n📊 Comparison with previous build:\n'));
    
    const sizeDiff = current.totalSize - previous.totalSize;
    const gzipDiff = current.totalGzipSize - previous.totalGzipSize;
    
    const formatDiff = (diff: number) => {
      if (diff > 0) return chalk.red(`+${diff}KB`);
      if (diff < 0) return chalk.green(`${diff}KB`);
      return chalk.gray('±0KB');
    };
    
    console.log(`Total Size: ${formatDiff(sizeDiff)}`);
    console.log(`Gzip Size: ${formatDiff(gzipDiff)}`);
    
    // Show bundle-specific changes
    console.log('\nBundle changes:');
    for (const bundle of current.bundles) {
      const prevBundle = previous.bundles.find(b => b.name === bundle.name);
      if (prevBundle) {
        const diff = bundle.size - prevBundle.size;
        if (Math.abs(diff) > 1) { // Only show if change > 1KB
          console.log(`  ${bundle.name}: ${formatDiff(diff)}`);
        }
      } else {
        console.log(`  ${bundle.name}: ${chalk.yellow('NEW')}`);
      }
    }
  }

  private printReport(stats: BundleStats, violations: string[]) {
    console.log(chalk.blue('\n📦 Bundle Size Report\n'));
    
    console.log(`Build ID: ${stats.buildId}`);
    console.log(`Timestamp: ${new Date(stats.timestamp).toLocaleString()}\n`);
    
    // Print bundle sizes
    console.log(chalk.cyan('Individual Bundles:'));
    console.log('─'.repeat(60));
    console.log('Bundle'.padEnd(30) + 'Size'.padEnd(15) + 'Gzip Size');
    console.log('─'.repeat(60));
    
    for (const bundle of stats.bundles.sort((a, b) => b.size - a.size)) {
      console.log(
        bundle.name.padEnd(30) +
        `${bundle.size}KB`.padEnd(15) +
        `${bundle.gzipSize}KB`
      );
    }
    
    console.log('─'.repeat(60));
    console.log(
      'TOTAL'.padEnd(30) +
      chalk.bold(`${stats.totalSize}KB`.padEnd(15)) +
      chalk.bold(`${stats.totalGzipSize}KB`)
    );
    
    // Print violations
    if (violations.length > 0) {
      console.log(chalk.red('\n❌ Size Limit Violations:'));
      violations.forEach(v => console.log(chalk.red(`  • ${v}`)));
    } else {
      console.log(chalk.green('\n✅ All bundle sizes within limits!'));
    }
    
    // Print optimization tips if needed
    if (stats.totalSize > TOTAL_SIZE_LIMIT * 0.8) {
      console.log(chalk.yellow('\n⚠️  Bundle size is approaching limit. Consider:'));
      console.log('  • Lazy loading more components');
      console.log('  • Removing unused dependencies');
      console.log('  • Using dynamic imports for large libraries');
      console.log('  • Running "npm run analyze" to identify large modules');
    }
  }
}

// Run the monitor
if (require.main === module) {
  new BundleSizeMonitor().run().catch(console.error);
}

export { BundleSizeMonitor, BundleStats, BundleSizeLimit };