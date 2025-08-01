#!/usr/bin/env tsx

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

console.log('📊 Analyzing Build Chunks...\n');

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const analyzeChunks = () => {
  const chunksDir = '.next/static/chunks';
  
  if (!existsSync(chunksDir)) {
    console.error('❌ Build directory not found. Run "npm run build" first.');
    return;
  }
  
  // Check if this is a development build
  const isDevelopment = existsSync('.next/static/development');
  if (isDevelopment) {
    console.warn('⚠️  Development build detected!');
    console.warn('Vendor chunks are only created in production builds.');
    console.warn('Run "npm run build" (not "npm run dev") to see vendor chunks.\n');
  }
  
  const allFiles = readdirSync(chunksDir);
  const chunks = allFiles.filter(file => file.endsWith('.js'));
  
  console.log(`Total chunks: ${chunks.length}\n`);
  
  // Categorize chunks
  const categories = {
    vendor: [] as string[],
    app: [] as string[],
    pages: [] as string[],
    framework: [] as string[],
    other: [] as string[],
  };
  
  // Analyze each chunk
  const chunkAnalysis: Array<{
    name: string;
    size: number;
    category: string;
    vendors?: string[];
  }> = [];
  
  chunks.forEach(chunk => {
    const filePath = join(chunksDir, chunk);
    const stats = statSync(filePath);
    const content = readFileSync(filePath, 'utf8');
    
    // Detect vendors in the chunk
    const vendors: string[] = [];
    const vendorPatterns = [
      { pattern: /@clerk/, name: 'Clerk' },
      { pattern: /convex/, name: 'Convex' },
      { pattern: /three/, name: 'Three.js' },
      { pattern: /@radix-ui/, name: 'Radix UI' },
      { pattern: /framer-motion/, name: 'Framer Motion' },
      { pattern: /recharts/, name: 'Recharts' },
      { pattern: /stripe/, name: 'Stripe' },
      { pattern: /@sentry/, name: 'Sentry' },
      { pattern: /react-window/, name: 'React Window' },
      { pattern: /gsap/, name: 'GSAP' },
    ];
    
    vendorPatterns.forEach(({ pattern, name }) => {
      if (pattern.test(content)) {
        vendors.push(name);
      }
    });
    
    // Categorize chunk
    let category = 'other';
    if (chunk.includes('vendor') || chunk.includes('npm.')) {
      category = 'vendor';
      categories.vendor.push(chunk);
    } else if (chunk.includes('app')) {
      category = 'app';
      categories.app.push(chunk);
    } else if (chunk.includes('pages')) {
      category = 'pages';
      categories.pages.push(chunk);
    } else if (chunk.includes('framework') || chunk.includes('webpack') || chunk.includes('polyfills')) {
      category = 'framework';
      categories.framework.push(chunk);
    } else {
      categories.other.push(chunk);
    }
    
    chunkAnalysis.push({
      name: chunk,
      size: stats.size,
      category,
      vendors: vendors.length > 0 ? vendors : undefined,
    });
  });
  
  // Sort by size
  chunkAnalysis.sort((a, b) => b.size - a.size);
  
  // Display analysis
  console.log('📦 Chunk Analysis by Size:\n');
  chunkAnalysis.forEach(({ name, size, category, vendors }) => {
    console.log(`  ${name}`);
    console.log(`    Size: ${formatSize(size)}`);
    console.log(`    Category: ${category}`);
    if (vendors) {
      console.log(`    Contains: ${vendors.join(', ')}`);
    }
    console.log('');
  });
  
  // Summary by category
  console.log('📈 Summary by Category:\n');
  Object.entries(categories).forEach(([category, files]) => {
    if (files.length > 0) {
      const totalSize = files.reduce((sum, file) => {
        const filePath = join(chunksDir, file);
        return sum + statSync(filePath).size;
      }, 0);
      
      console.log(`  ${category.charAt(0).toUpperCase() + category.slice(1)}:`);
      console.log(`    Files: ${files.length}`);
      console.log(`    Total size: ${formatSize(totalSize)}`);
      console.log('');
    }
  });
  
  // Check for missing vendor chunks
  console.log('🔍 Vendor Chunk Status:\n');
  const expectedVendorChunks = [
    'clerk-vendor',
    'three-vendor',
    'ui-vendor',
    'charts-vendor',
    'animation-vendor',
    'convex-vendor',
  ];
  
  expectedVendorChunks.forEach(vendorName => {
    const found = chunks.some(chunk => chunk.includes(vendorName));
    if (found) {
      console.log(`  ✅ ${vendorName} chunk found`);
    } else {
      console.log(`  ❌ ${vendorName} chunk NOT found`);
    }
  });
  
  // Recommendations
  console.log('\n💡 Recommendations:\n');
  
  const hasVendorChunks = categories.vendor.length > 0;
  if (!hasVendorChunks) {
    console.log('  ⚠️  No vendor chunks detected!');
    console.log('  - Check webpack splitChunks configuration');
    console.log('  - Ensure production build: NODE_ENV=production npm run build');
    console.log('  - Verify next.config.mjs is being loaded');
  }
  
  const largeChunks = chunkAnalysis.filter(c => c.size > 500 * 1024);
  if (largeChunks.length > 0) {
    console.log(`\n  ⚠️  ${largeChunks.length} chunks are larger than 500KB:`);
    largeChunks.forEach(chunk => {
      console.log(`  - ${chunk.name} (${formatSize(chunk.size)})`);
    });
  }
};

analyzeChunks();