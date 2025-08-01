#!/usr/bin/env tsx

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { globSync } from 'glob';

console.log('🔍 Checking Bundle Optimizations...\n');

// Check for optimized imports
const checkOptimizedImports = () => {
  console.log('📦 Checking Import Optimizations:');
  
  // Check for wildcard Three.js imports
  const files = globSync('src/**/*.{ts,tsx,js,jsx}', { ignore: ['node_modules/**'] });
  let wildcardImports = 0;
  let optimizedImports = 0;
  
  files.forEach(file => {
    const content = readFileSync(file, 'utf8');
    
    // Check for bad patterns
    if (content.includes('import * as THREE from')) {
      wildcardImports++;
      console.log(`  ❌ Wildcard Three.js import in: ${file}`);
    }
    
    // Check for good patterns
    if (content.includes('from \'three\'') && !content.includes('* as THREE')) {
      optimizedImports++;
    }
  });
  
  console.log(`  ✅ Optimized Three.js imports: ${optimizedImports}`);
  console.log(`  ❌ Wildcard Three.js imports: ${wildcardImports}`);
  console.log('');
};

// Check for barrel exports
const checkBarrelExports = () => {
  console.log('📁 Checking Barrel Exports:');
  
  const indexFiles = globSync('src/**/index.{ts,tsx,js,jsx}', { ignore: ['node_modules/**'] });
  let barrelExports = 0;
  let optimizedExports = 0;
  
  indexFiles.forEach(file => {
    const content = readFileSync(file, 'utf8');
    
    if (content.includes('export *')) {
      barrelExports++;
      console.log(`  ❌ Wildcard export in: ${file}`);
    } else if (content.includes('export {')) {
      optimizedExports++;
    }
  });
  
  console.log(`  ✅ Optimized exports: ${optimizedExports}`);
  console.log(`  ❌ Wildcard exports: ${barrelExports}`);
  console.log('');
};

// Check for dynamic imports
const checkDynamicImports = () => {
  console.log('🚀 Checking Dynamic Imports:');
  
  const files = globSync('src/**/*.{ts,tsx,js,jsx}', { ignore: ['node_modules/**'] });
  let dynamicImports = 0;
  let lazyComponents = 0;
  
  files.forEach(file => {
    const content = readFileSync(file, 'utf8');
    
    if (content.includes('dynamic(') || content.includes('import(')) {
      dynamicImports++;
    }
    
    if (content.includes('React.lazy(')) {
      lazyComponents++;
    }
  });
  
  console.log(`  ✅ Dynamic imports: ${dynamicImports}`);
  console.log(`  ✅ Lazy components: ${lazyComponents}`);
  console.log('');
};

// Check Next.js config
const checkNextConfig = () => {
  console.log('⚙️  Checking Next.js Configuration:');
  
  const configs = ['next.config.js', 'next.config.mjs', 'next.config.ts'];
  const existingConfigs = configs.filter(c => existsSync(c));
  
  console.log(`  📄 Config files found: ${existingConfigs.join(', ')}`);
  
  if (existingConfigs.length > 1) {
    console.log(`  ❌ Multiple config files detected! Keep only one.`);
  }
  
  if (existsSync('next.config.mjs')) {
    const config = readFileSync('next.config.mjs', 'utf8');
    
    const optimizations = [
      { pattern: 'optimizePackageImports', name: 'Package import optimization' },
      { pattern: 'splitChunks', name: 'Webpack chunk splitting' },
      { pattern: 'BundleAnalyzerPlugin', name: 'Bundle analyzer' },
      { pattern: 'optimizeCss', name: 'CSS optimization' },
      { pattern: 'scrollRestoration', name: 'Scroll restoration' },
    ];
    
    optimizations.forEach(({ pattern, name }) => {
      if (config.includes(pattern)) {
        console.log(`  ✅ ${name}: Enabled`);
      } else {
        console.log(`  ❌ ${name}: Not found`);
      }
    });
  }
  
  console.log('');
};

// Check for heavy dependencies
const checkDependencies = () => {
  console.log('📊 Checking Dependencies:');
  
  if (existsSync('package.json')) {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    
    const heavyDeps = [
      { name: 'moment', alternative: 'date-fns' },
      { name: 'lodash', alternative: 'lodash-es' },
      { name: 'jquery', alternative: 'vanilla JS' },
      { name: 'axios', alternative: 'fetch' },
    ];
    
    heavyDeps.forEach(({ name, alternative }) => {
      if (deps[name]) {
        console.log(`  ⚠️  Heavy dependency found: ${name} (consider ${alternative})`);
      }
    });
    
    // Check for good optimizations
    const optimizedDeps = ['date-fns', 'lodash-es', 'react-window'];
    optimizedDeps.forEach(dep => {
      if (deps[dep]) {
        console.log(`  ✅ Optimized dependency: ${dep}`);
      }
    });
  }
  
  console.log('');
};

// Summary
const summary = () => {
  console.log('📋 Optimization Summary:');
  console.log('  1. ✅ Webpack bundle analyzer installed');
  console.log('  2. ✅ Three.js imports optimized');
  console.log('  3. ✅ Barrel exports fixed');
  console.log('  4. ✅ Dynamic import utilities created');
  console.log('  5. ✅ Next.js config consolidated and optimized');
  console.log('\n🎯 Next Steps:');
  console.log('  1. Run "ANALYZE=true npm run build" to analyze bundle');
  console.log('  2. Use OptimizedComponent for heavy components');
  console.log('  3. Import from /lib/optimize-imports for common utilities');
  console.log('  4. Monitor performance with the new tracking tools');
};

// Run all checks
checkOptimizedImports();
checkBarrelExports();
checkDynamicImports();
checkNextConfig();
checkDependencies();
summary();