#!/usr/bin/env tsx

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

console.log('🔍 Checking Vendor Chunk Configuration...\n');

// Check Next.js config
const checkNextConfig = () => {
  console.log('📋 Next.js Configuration:');
  
  const configPath = 'next.config.mjs';
  if (existsSync(configPath)) {
    const config = readFileSync(configPath, 'utf8');
    
    // Check for splitChunks configuration
    if (config.includes('splitChunks')) {
      console.log('  ✅ splitChunks configuration found');
      
      // Check for specific vendor chunks
      const vendorChunks = [
        { name: 'clerk', pattern: '@clerk|clerk' },
        { name: 'three', pattern: 'three|@react-three' },
        { name: 'ui', pattern: '@radix-ui|sonner|cmdk' },
        { name: 'charts', pattern: 'recharts|d3|victory' },
        { name: 'animation', pattern: 'framer-motion|gsap' },
        { name: 'convex', pattern: 'convex' },
      ];
      
      vendorChunks.forEach(({ name, pattern }) => {
        if (config.includes(pattern)) {
          console.log(`  ✅ ${name} vendor chunk configured`);
        } else {
          console.log(`  ❌ ${name} vendor chunk NOT configured`);
        }
      });
    } else {
      console.log('  ❌ splitChunks configuration NOT found');
    }
    
    // Check for optimizePackageImports
    if (config.includes('optimizePackageImports')) {
      console.log('  ✅ optimizePackageImports found');
      
      // Check for Clerk in optimizePackageImports
      if (config.includes('@clerk/nextjs') || config.includes('@clerk/clerk-react')) {
        console.log('  ✅ Clerk packages in optimizePackageImports');
      } else {
        console.log('  ❌ Clerk packages NOT in optimizePackageImports');
      }
    }
  } else {
    console.log('  ❌ next.config.mjs not found');
  }
  
  console.log('');
};

// Check build output
const checkBuildOutput = () => {
  console.log('📦 Build Output Analysis:');
  
  const chunksDir = '.next/static/chunks';
  if (existsSync(chunksDir)) {
    const chunks = readdirSync(chunksDir);
    
    // Look for vendor chunks
    const vendorChunks = chunks.filter(chunk => 
      chunk.includes('vendor') || 
      chunk.includes('npm.') || 
      chunk.includes('clerk') ||
      chunk.includes('three') ||
      chunk.includes('ui-') ||
      chunk.includes('charts') ||
      chunk.includes('animation') ||
      chunk.includes('convex')
    );
    
    console.log(`  Total chunks: ${chunks.length}`);
    console.log(`  Vendor chunks found: ${vendorChunks.length}`);
    
    if (vendorChunks.length > 0) {
      console.log('\n  Vendor chunks:');
      vendorChunks.forEach(chunk => {
        const size = readFileSync(join(chunksDir, chunk)).length;
        console.log(`    - ${chunk} (${(size / 1024).toFixed(2)} KB)`);
      });
    }
    
    // Check for Clerk chunks specifically
    const clerkChunks = chunks.filter(chunk => 
      chunk.toLowerCase().includes('clerk')
    );
    
    if (clerkChunks.length > 0) {
      console.log('\n  ✅ Clerk chunks found:');
      clerkChunks.forEach(chunk => {
        console.log(`    - ${chunk}`);
      });
    } else {
      console.log('\n  ❌ No dedicated Clerk vendor chunk found');
      console.log('  Clerk code might be bundled in:');
      
      // Check for Clerk in other chunks
      const potentialClerkChunks = chunks.filter(chunk => {
        if (!chunk.endsWith('.js')) return false;
        try {
          const content = readFileSync(join(chunksDir, chunk), 'utf8');
          return content.includes('@clerk') || content.includes('clerk');
        } catch {
          return false;
        }
      });
      
      if (potentialClerkChunks.length > 0) {
        potentialClerkChunks.forEach(chunk => {
          console.log(`    - ${chunk}`);
        });
      }
    }
  } else {
    console.log('  ❌ Build output not found. Run "npm run build" first.');
  }
  
  console.log('');
};

// Check package.json dependencies
const checkDependencies = () => {
  console.log('📚 Dependency Check:');
  
  if (existsSync('package.json')) {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    
    const clerkDeps = Object.keys(deps).filter(dep => dep.includes('clerk'));
    
    if (clerkDeps.length > 0) {
      console.log('  ✅ Clerk dependencies found:');
      clerkDeps.forEach(dep => {
        console.log(`    - ${dep}: ${deps[dep]}`);
      });
    } else {
      console.log('  ❌ No Clerk dependencies found');
    }
  }
  
  console.log('');
};

// Recommendations
const recommendations = () => {
  console.log('💡 Recommendations:');
  console.log('  1. Ensure webpack configuration includes Clerk vendor chunk');
  console.log('  2. Add Clerk packages to optimizePackageImports');
  console.log('  3. Set higher priority for Clerk chunk (priority: 20)');
  console.log('  4. Use enforce: true for critical vendor chunks');
  console.log('  5. Run "ANALYZE=true npm run build" to analyze bundle');
  console.log('\n🔧 To fix missing vendor chunks:');
  console.log('  1. Check next.config.mjs has proper splitChunks config');
  console.log('  2. Rebuild with "npm run build"');
  console.log('  3. Verify chunks with "npm run bundle:analyze"');
};

// Run all checks
checkNextConfig();
checkDependencies();
checkBuildOutput();
recommendations();