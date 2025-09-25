// Simple Playwright crawler test
const { chromium } = require('playwright');

async function testCrawler() {
  console.log('🚀 Starting Playwright Crawler Test...');
  
  try {
    // Launch browser
    const browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    console.log('✅ Browser launched successfully');
    
    // Create a new page
    const page = await browser.newPage();
    console.log('✅ New page created');
    
    // Navigate to a test page
    await page.goto('https://httpbin.org/get');
    console.log('✅ Navigated to test page');
    
    // Get page title
    const title = await page.title();
    console.log('📄 Page title:', title);
    
    // Get page content
    const content = await page.content();
    console.log('📝 Content length:', content.length, 'characters');
    
    // Close browser
    await browser.close();
    console.log('✅ Browser closed');
    console.log('🎉 Crawler test completed successfully!');
    
  } catch (error) {
    console.error('❌ Crawler test failed:', error.message);
    process.exit(1);
  }
}

testCrawler();
