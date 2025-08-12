// Script to test landing page features
const puppeteer = require('puppeteer');

async function testLandingPage() {
  console.log('🚀 Starting landing page feature tests...\n');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Navigate to landing page
    console.log('📍 Navigating to landing page...');
    await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Check if main elements are present
    console.log('\n✅ Checking main page elements:');
    
    // Check for logo
    const logo = await page.$('[alt*="Pactwise"]') || await page.$('svg');
    console.log(`  - Logo: ${logo ? '✓' : '✗'}`);
    
    // Check for navigation
    const nav = await page.$('nav');
    console.log(`  - Navigation: ${nav ? '✓' : '✗'}`);
    
    // Check for hero section
    const heroText = await page.$eval('body', el => el.textContent);
    const hasHero = heroText.includes('Contract') || heroText.includes('Vendor');
    console.log(`  - Hero Section: ${hasHero ? '✓' : '✗'}`);
    
    // Check for demo buttons
    console.log('\n🎮 Checking demo features:');
    
    const demoButtons = await page.$$('button');
    let demoButtonCount = 0;
    
    for (const button of demoButtons) {
      const text = await button.evaluate(el => el.textContent);
      if (text && text.toLowerCase().includes('demo')) {
        demoButtonCount++;
      }
    }
    
    console.log(`  - Found ${demoButtonCount} demo buttons`);
    
    // Check specific demo titles
    const demoTitles = [
      'Contract Analysis Demo',
      'Vendor Evaluation Demo', 
      'Negotiation Assistant Demo',
      'Compliance Monitoring Demo'
    ];
    
    console.log('\n📋 Checking specific demos:');
    for (const title of demoTitles) {
      const hasDemo = heroText.includes(title);
      console.log(`  - ${title}: ${hasDemo ? '✓' : '✗'}`);
    }
    
    // Test clicking a demo button (if found)
    console.log('\n🔧 Testing demo interaction:');
    
    const launchButtons = await page.$$('button');
    let demoLaunched = false;
    
    for (const button of launchButtons) {
      const text = await button.evaluate(el => el.textContent);
      if (text && text.includes('Launch Demo')) {
        console.log('  - Found "Launch Demo" button, attempting to click...');
        
        try {
          await button.click();
          await page.waitForTimeout(2000); // Wait for modal to open
          
          // Check if modal opened
          const modal = await page.$('[role="dialog"]') || await page.$('.fixed.inset-0');
          if (modal) {
            console.log('  - Demo modal opened successfully! ✓');
            demoLaunched = true;
            
            // Close modal
            const closeButton = await page.$('[aria-label*="Close"]') || await page.$('button[class*="close"]');
            if (closeButton) {
              await closeButton.click();
              console.log('  - Modal closed successfully ✓');
            }
          }
          break;
        } catch (err) {
          console.log('  - Error clicking demo button:', err.message);
        }
      }
    }
    
    if (!demoLaunched) {
      console.log('  - No interactive demo launched (buttons may require additional setup)');
    }
    
    // Check for scroll functionality
    console.log('\n📜 Testing scroll functionality:');
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(1000);
    const scrollPosition = await page.evaluate(() => window.pageYOffset);
    console.log(`  - Page scrolling: ${scrollPosition > 0 ? '✓' : '✗'}`);
    
    // Check for animations or transitions
    const hasAnimations = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      for (const el of elements) {
        const style = window.getComputedStyle(el);
        if (style.animation !== 'none' || 
            style.transition !== 'all 0s ease 0s' && style.transition !== 'none') {
          return true;
        }
      }
      return false;
    });
    console.log(`  - Animations/Transitions present: ${hasAnimations ? '✓' : '✗'}`);
    
    // Check console for errors
    console.log('\n⚠️  Checking for console errors:');
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.reload();
    await page.waitForTimeout(3000);
    
    if (consoleErrors.length === 0) {
      console.log('  - No console errors detected ✓');
    } else {
      console.log(`  - Found ${consoleErrors.length} console errors:`);
      consoleErrors.forEach(err => console.log(`    • ${err}`));
    }
    
    console.log('\n✨ Landing page test complete!');
    
  } catch (error) {
    console.error('\n❌ Error during testing:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the test
testLandingPage().catch(console.error);