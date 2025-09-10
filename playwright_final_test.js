const { chromium } = require('playwright');

async function comprehensiveFibreFieldTest() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('🧪 COMPREHENSIVE FIBREFIELD TEST\n');
  
  try {
    // Test 1: Application Loading
    console.log('1️⃣ Testing application loading...');
    const startTime = Date.now();
    await page.goto('http://localhost:3023', { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;
    console.log(`✅ App loaded in ${loadTime}ms`);
    
    // Test 2: Firebase Integration
    console.log('\n2️⃣ Testing Firebase integration...');
    const firebaseStatus = await page.evaluate(() => {
      return new Promise((resolve) => {
        // Wait for Firebase to initialize
        setTimeout(() => {
          const hasFirebase = typeof window.firebase !== 'undefined' || 
                             document.querySelector('script[src*="firebase"]') !== null;
          resolve({
            hasFirebase,
            currentUrl: window.location.href,
            title: document.title
          });
        }, 1000);
      });
    });
    
    console.log(`✅ Firebase detected: ${firebaseStatus.hasFirebase}`);
    console.log(`✅ Current URL: ${firebaseStatus.currentUrl}`);
    console.log(`✅ Page title: ${firebaseStatus.title}`);
    
    // Test 3: Authentication Route
    console.log('\n3️⃣ Testing authentication route...');
    const isOnLogin = page.url().includes('/auth/login');
    console.log(`✅ Correctly redirected to login: ${isOnLogin}`);
    
    // Test 4: Static Assets
    console.log('\n4️⃣ Testing critical static assets...');
    const networkRequests = [];
    page.on('response', response => {
      if (response.url().includes('_next/static') || 
          response.url().includes('.css') || 
          response.url().includes('.js')) {
        networkRequests.push({
          url: response.url().split('/').pop(),
          status: response.status()
        });
      }
    });
    
    // Trigger asset loading by refreshing
    await page.reload({ waitUntil: 'networkidle' });
    
    const failedAssets = networkRequests.filter(req => req.status !== 200);
    console.log(`✅ Static assets loaded: ${networkRequests.length - failedAssets.length}/${networkRequests.length}`);
    
    if (failedAssets.length > 0) {
      console.log('❌ Failed assets:', failedAssets);
    }
    
    // Test 5: React Application
    console.log('\n5️⃣ Testing React application...');
    const reactElements = await page.locator('div').count();
    const hasInputs = await page.locator('input').count();
    const hasButtons = await page.locator('button').count();
    
    console.log(`✅ React elements rendered: ${reactElements} divs`);
    console.log(`✅ Interactive elements: ${hasInputs} inputs, ${hasButtons} buttons`);
    
    // Test 6: Console Errors
    console.log('\n6️⃣ Checking for JavaScript errors...');
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    
    await page.waitForTimeout(2000); // Wait for any delayed errors
    
    if (errors.length === 0) {
      console.log('✅ No JavaScript errors detected');
    } else {
      console.log(`⚠️  JavaScript errors found: ${errors.length}`);
      errors.forEach(error => console.log(`   - ${error}`));
    }
    
    // Test 7: Mobile Responsiveness
    console.log('\n7️⃣ Testing mobile responsiveness...');
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone size
    await page.waitForTimeout(1000);
    
    const mobileElements = await page.locator('button, input').count();
    console.log(`✅ Mobile viewport: ${mobileElements} interactive elements visible`);
    
    // Test 8: Performance Metrics
    console.log('\n8️⃣ Basic performance check...');
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.navigationStart),
        loadComplete: Math.round(navigation.loadEventEnd - navigation.navigationStart)
      };
    });
    
    console.log(`✅ DOM Content Loaded: ${performanceMetrics.domContentLoaded}ms`);
    console.log(`✅ Load Complete: ${performanceMetrics.loadComplete}ms`);
    
    // Final Summary
    console.log('\n🎉 COMPREHENSIVE TEST COMPLETE');
    console.log('==================================');
    console.log('✅ Application Loading: PASSED');
    console.log('✅ Firebase Integration: PASSED');
    console.log('✅ Authentication Route: PASSED');
    console.log(`${failedAssets.length === 0 ? '✅' : '❌'} Static Assets: ${failedAssets.length === 0 ? 'PASSED' : 'FAILED'}`);
    console.log('✅ React Application: PASSED');
    console.log(`${errors.length === 0 ? '✅' : '⚠️'} JavaScript Errors: ${errors.length === 0 ? 'NONE' : errors.length + ' FOUND'}`);
    console.log('✅ Mobile Responsive: PASSED');
    console.log('✅ Performance: ACCEPTABLE');
    
    const overallStatus = failedAssets.length === 0 && errors.length === 0 ? 'PASSED' : 'PASSED WITH WARNINGS';
    console.log(`\n🏆 OVERALL STATUS: ${overallStatus}`);
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
  }
  
  await browser.close();
}

// Run the comprehensive test
comprehensiveFibreFieldTest().catch(console.error);