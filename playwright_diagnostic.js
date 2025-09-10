const { chromium } = require('playwright');

async function diagnoseFibreFieldApp() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Track all network requests and responses
  const networkLog = [];
  const errors = [];
  
  page.on('request', request => {
    networkLog.push({
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      timestamp: new Date().toISOString()
    });
  });
  
  page.on('response', response => {
    const request = networkLog.find(req => req.url === response.url());
    if (request) {
      request.status = response.status();
      request.statusText = response.statusText();
      request.contentType = response.headers()['content-type'] || 'unknown';
      request.size = response.headers()['content-length'] || 'unknown';
    }
  });
  
  page.on('pageerror', error => {
    errors.push({
      type: 'PageError',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  });
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push({
        type: 'ConsoleError',
        message: msg.text(),
        timestamp: new Date().toISOString()
      });
    }
  });

  try {
    console.log('🔍 FIBREFIELD DIAGNOSTIC TEST STARTING...\n');
    console.log('Testing app at: http://localhost:3023');
    
    // Navigate to the app with extended timeout
    const startTime = Date.now();
    await page.goto('http://localhost:3023', { 
      waitUntil: 'domcontentloaded',
      timeout: 10000 
    });
    const loadTime = Date.now() - startTime;
    
    console.log(`✅ Page loaded in ${loadTime}ms\n`);
    
    // Get basic page info
    const title = await page.title();
    const url = page.url();
    
    console.log('📄 PAGE INFORMATION:');
    console.log(`Title: ${title}`);
    console.log(`Final URL: ${url}\n`);
    
    // Wait for Next.js to fully load
    await page.waitForTimeout(2000);
    
    // Check for React root
    const reactRoot = await page.locator('#__next, [data-reactroot]').count();
    console.log(`React Root Elements: ${reactRoot}`);
    
    // Analyze network requests
    console.log('\n🌐 NETWORK ANALYSIS:');
    console.log(`Total Requests: ${networkLog.length}`);
    
    const staticAssets = networkLog.filter(req => 
      req.resourceType === 'stylesheet' || 
      req.resourceType === 'script' || 
      req.url.includes('_next/static')
    );
    
    const failed404 = networkLog.filter(req => req.status === 404);
    const mimeIssues = networkLog.filter(req => 
      req.resourceType === 'script' && 
      req.contentType && 
      !req.contentType.includes('javascript')
    );
    
    console.log(`Static Assets: ${staticAssets.length}`);
    console.log(`404 Errors: ${failed404.length}`);
    console.log(`MIME Type Issues: ${mimeIssues.length}\n`);
    
    // Show detailed analysis of problematic requests
    if (failed404.length > 0) {
      console.log('❌ 404 ERRORS:');
      failed404.forEach(req => {
        console.log(`  ${req.method} ${req.status} ${req.resourceType} - ${req.url}`);
      });
      console.log();
    }
    
    if (mimeIssues.length > 0) {
      console.log('⚠️  MIME TYPE ISSUES:');
      mimeIssues.forEach(req => {
        console.log(`  ${req.url}`);
        console.log(`    Expected: JavaScript, Got: ${req.contentType}`);
      });
      console.log();
    }
    
    // Show all static asset requests
    console.log('📦 STATIC ASSETS ANALYSIS:');
    staticAssets.forEach(req => {
      const status = req.status || 'pending';
      const icon = status === 200 ? '✅' : status === 404 ? '❌' : '⏳';
      console.log(`  ${icon} ${status} ${req.resourceType} - ${req.url.split('/').pop()}`);
      if (req.contentType && req.contentType !== 'unknown') {
        console.log(`      Content-Type: ${req.contentType}`);
      }
    });
    
    // Show JavaScript errors
    if (errors.length > 0) {
      console.log('\n🚨 JAVASCRIPT ERRORS:');
      errors.forEach(error => {
        console.log(`  [${error.type}] ${error.message}`);
      });
    }
    
    // Test PWA Service Worker
    console.log('\n🔧 PWA SERVICE WORKER TEST:');
    const swRegistered = await page.evaluate(() => {
      return 'serviceWorker' in navigator;
    });
    console.log(`Service Worker API Available: ${swRegistered}`);
    
    if (swRegistered) {
      const swActive = await page.evaluate(() => {
        return navigator.serviceWorker.controller ? 'Active' : 'Not Active';
      });
      console.log(`Service Worker Status: ${swActive}`);
    }
    
    // Test Next.js routing
    console.log('\n🛤️  NEXT.JS ROUTING TEST:');
    const nextData = await page.evaluate(() => {
      return window.__NEXT_DATA__ ? 'Available' : 'Missing';
    });
    console.log(`Next.js Data: ${nextData}`);
    
    console.log('\n✅ DIAGNOSTIC COMPLETE');
    
  } catch (error) {
    console.error('\n❌ NAVIGATION ERROR:', error.message);
    
    // Still show network log even if navigation failed
    if (networkLog.length > 0) {
      console.log('\n🌐 NETWORK LOG (Partial):');
      networkLog.forEach(req => {
        console.log(`  ${req.method} ${req.status || 'pending'} - ${req.url}`);
      });
    }
  }
  
  await browser.close();
}

// Run the diagnostic
diagnoseFibreFieldApp().catch(console.error);