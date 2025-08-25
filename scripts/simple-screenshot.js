// Simple script to check if we can access the app
import fetch from 'node-fetch';

async function checkApp() {
  try {
    const response = await fetch('http://localhost:5173');
    console.log('App status:', response.status);
    console.log('App is running:', response.ok);
    
    // Check different routes
    const routes = [
      '/',
      '/dashboard',
      '/capture',
      '/my-poles',
      '/offline-queue',
      '/settings'
    ];
    
    console.log('\nChecking routes:');
    for (const route of routes) {
      const res = await fetch(`http://localhost:5173${route}`);
      console.log(`${route}: ${res.status} ${res.ok ? '✓' : '✗'}`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkApp();