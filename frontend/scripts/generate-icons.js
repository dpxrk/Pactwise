const fs = require('fs');
const path = require('path');

// Simple placeholder icon generator
// For production, use proper tools like sharp or canvas

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 SIZE SIZE" fill="none">
  <rect width="SIZE" height="SIZE" fill="#111827"/>
  <text x="50%" y="50%" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif" font-size="FONTSIZE" text-anchor="middle" dominant-baseline="middle" fill="white">
    <tspan font-weight="400">P</tspan><tspan font-weight="200">w</tspan>
  </text>
</svg>`;

sizes.forEach(size => {
  const fontSize = Math.floor(size * 0.33);
  const svg = svgContent.replace(/SIZE/g, size).replace(/FONTSIZE/g, fontSize);
  
  // For now, save as SVG files with PNG extension (browser will handle)
  // In production, use a proper SVG to PNG converter
  fs.writeFileSync(
    path.join(__dirname, '..', 'public', 'icons', `icon-${size}x${size}.svg`),
    svg
  );
  
  console.log(`Created icon-${size}x${size}.svg`);
});

console.log('Icon placeholders created. For production, convert SVGs to PNGs.');