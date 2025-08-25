#!/usr/bin/env node

// Simple script to document which screenshots we need
// The actual screenshots will be taken using Playwright MCP

const screenshotsNeeded = [
  {
    name: '01-dashboard',
    url: 'https://pole-planting-app.web.app',
    description: 'Main dashboard showing project selection',
    waitFor: 'text=Select a project'
  },
  {
    name: '02-project-selector',
    url: 'https://pole-planting-app.web.app',
    description: 'Project selector dropdown expanded',
    actions: ['click on project selector'],
    waitFor: 'project list visible'
  },
  {
    name: '03-wizard-start',
    url: 'https://pole-planting-app.web.app',
    description: 'Wizard capture flow - first step',
    actions: ['select project', 'click start new capture'],
    waitFor: 'text=Before Installation'
  },
  {
    name: '04-photo-capture',
    url: 'https://pole-planting-app.web.app',
    description: 'Photo capture interface',
    actions: ['navigate to photo step'],
    waitFor: 'camera button visible'
  },
  {
    name: '05-form-inputs',
    url: 'https://pole-planting-app.web.app',
    description: 'Form input fields',
    actions: ['show any form fields'],
    waitFor: 'input fields visible'
  }
];

console.log('Screenshots needed for PolePlantingApp mobile review:');
console.log('='.repeat(50));
screenshotsNeeded.forEach((screenshot, index) => {
  console.log(`\n${index + 1}. ${screenshot.name}`);
  console.log(`   URL: ${screenshot.url}`);
  console.log(`   Description: ${screenshot.description}`);
  if (screenshot.actions) {
    console.log(`   Actions: ${screenshot.actions.join(', ')}`);
  }
  console.log(`   Wait for: ${screenshot.waitFor}`);
});

console.log('\n\nMobile viewport configuration:');
console.log('- Width: 360px');
console.log('- Height: 640px');
console.log('- Device scale factor: 2');
console.log('- User agent: Mobile');
console.log('- Has touch: true');