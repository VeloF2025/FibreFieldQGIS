// Generate placeholder PWA icons
const fs = require('fs');
const path = require('path');

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Icon sizes needed
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Simple 1x1 transparent PNG (base64 encoded)
const transparentPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

// Create each icon size
sizes.forEach(size => {
  const filename = `icon-${size}x${size}.png`;
  const filepath = path.join(iconsDir, filename);
  
  // Write the placeholder PNG data
  fs.writeFileSync(filepath, Buffer.from(transparentPng, 'base64'));
  console.log(`Created ${filename}`);
});

// Create shortcut icons
const shortcuts = ['shortcut-capture.png', 'shortcut-assignments.png', 'shortcut-sync.png'];
shortcuts.forEach(filename => {
  const filepath = path.join(iconsDir, filename);
  fs.writeFileSync(filepath, Buffer.from(transparentPng, 'base64'));
  console.log(`Created ${filename}`);
});

console.log('✅ All PWA icons created successfully!');