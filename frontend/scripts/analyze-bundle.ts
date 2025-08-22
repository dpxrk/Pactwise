#!/usr/bin/env tsx
/**
 * Bundle size analysis script
 * Analyzes the production build and reports on bundle sizes
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);

// Get performance config
const perfConfig = require('../next.performance.config.js');

interface BundleStats {
  name: string;
  size: number;
  gzipSize: number;
}

interface AnalysisResult {
  totalSize: number;
  totalGzipSize: number;
  bundles: BundleStats[];
  warnings: string[];
  passed: boolean;
}

async function getDirectorySize(dirPath: string): Promise<number> {
  let totalSize = 0;
  
  try {
    const files = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const file of files) {
      const filePath = path.join(dirPath, file.name);
      
      if (file.isDirectory()) {
        totalSize += await getDirectorySize(filePath);
      } else {
        const stats = await fs.stat(filePath);
        totalSize += stats.size;
      }
    }
  } catch (error) {
    console.warn(`Could not read directory ${dirPath}:`, error);
  }
  
  return totalSize;
}

async function analyzeBundles(): Promise<AnalysisResult> {
  const buildDir = '.next';
  const result: AnalysisResult = {
    totalSize: 0,
    totalGzipSize: 0,
    bundles: [],
    warnings: [],
    passed: true,
  };

  try {
    // Check if build directory exists
    await fs.access(buildDir);
    
    // Analyze static files
    const staticDir = path.join(buildDir, 'static');
    const staticSize = await getDirectorySize(staticDir);
    
    result.bundles.push({
      name: 'Static Assets',
      size: staticSize,
      gzipSize: Math.round(staticSize * 0.3), // Estimate gzip size
    });
    
    // Analyze chunks
    const chunksDir = path.join(staticDir, 'chunks');
    const chunksSize = await getDirectorySize(chunksDir);
    
    result.bundles.push({
      name: 'JavaScript Chunks',
      size: chunksSize,
      gzipSize: Math.round(chunksSize * 0.3),
    });
    
    // Calculate totals
    result.totalSize = result.bundles.reduce((sum, b) => sum + b.size, 0);
    result.totalGzipSize = result.bundles.reduce((sum, b) => sum + b.gzipSize, 0);
    
    // Check against thresholds
    const thresholds = perfConfig.bundleSizeThresholds;
    
    if (chunksSize > thresholds.maxJavaScriptSize) {
      result.warnings.push(
        `JavaScript bundle size (${formatSize(chunksSize)}) exceeds limit (${formatSize(thresholds.maxJavaScriptSize)})`
      );
      result.passed = false;
    } else if (chunksSize > thresholds.maxJavaScriptSize * thresholds.warningThreshold) {
      result.warnings.push(
        `JavaScript bundle size (${formatSize(chunksSize)}) is approaching limit (${formatSize(thresholds.maxJavaScriptSize)})`
      );
    }
    
    if (result.totalSize > thresholds.maxPageSize) {
      result.warnings.push(
        `Total page size (${formatSize(result.totalSize)}) exceeds limit (${formatSize(thresholds.maxPageSize)})`
      );
      result.passed = false;
    }
    
  } catch (error) {
    console.error('Error analyzing bundles:', error);
    result.warnings.push('Failed to analyze bundle sizes');
    result.passed = false;
  }
  
  return result;
}

function formatSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

function printResults(result: AnalysisResult) {
  console.log('\n📊 Bundle Size Analysis Report\n');
  console.log('═'.repeat(50));
  
  console.log('\n📦 Bundle Breakdown:');
  result.bundles.forEach(bundle => {
    console.log(`  ${bundle.name}:`);
    console.log(`    Size: ${formatSize(bundle.size)}`);
    console.log(`    Gzip: ${formatSize(bundle.gzipSize)}`);
  });
  
  console.log('\n📈 Totals:');
  console.log(`  Total Size: ${formatSize(result.totalSize)}`);
  console.log(`  Total Gzip: ${formatSize(result.totalGzipSize)}`);
  
  if (result.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    result.warnings.forEach(warning => {
      console.log(`  - ${warning}`);
    });
  }
  
  console.log('\n' + '═'.repeat(50));
  
  if (result.passed) {
    console.log('✅ Bundle size check PASSED\n');
  } else {
    console.log('❌ Bundle size check FAILED\n');
    process.exit(1);
  }
}

async function main() {
  console.log('🔍 Analyzing bundle sizes...\n');
  
  try {
    // First, ensure we have a production build
    const buildExists = await fs.access('.next')
      .then(() => true)
      .catch(() => false);
    
    if (!buildExists) {
      console.log('No build found. Running production build...');
      await execAsync('npm run build');
    }
    
    const result = await analyzeBundles();
    printResults(result);
    
  } catch (error) {
    console.error('Error during bundle analysis:', error);
    process.exit(1);
  }
}

// Run the analysis
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}