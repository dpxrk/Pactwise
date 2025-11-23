/**
 * Texture Generation Script for Pactwise WebGL Landing Page
 *
 * Generates:
 * - Bayer 8x8 dithering matrix
 * - Purple/Pink gradient LUT
 * - Perlin noise texture
 *
 * Run with: npx tsx scripts/generate-textures.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Purple/Pink brand colors
const BRAND_COLORS = {
  purple: {
    950: { r: 26, g: 13, b: 24 },
    900: { r: 41, g: 21, b: 40 },
    800: { r: 83, g: 62, b: 82 },
    700: { r: 100, g: 72, b: 98 },
    600: { r: 125, g: 92, b: 123 },
    500: { r: 158, g: 130, b: 156 },
    400: { r: 195, g: 136, b: 187 },
    300: { r: 218, g: 181, b: 213 },
    200: { r: 234, g: 214, b: 231 },
    100: { r: 245, g: 235, b: 243 },
  },
  ghost: {
    100: { r: 240, g: 239, b: 244 },
  },
};

/**
 * Ensure directory exists
 */
function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Generate 8x8 Bayer matrix texture
 */
function generateBayerMatrix(): Buffer {
  const size = 8;
  const totalPixels = size * size;
  const buffer = Buffer.alloc(totalPixels);

  const bayerMatrix = [
    [0, 32, 8, 40, 2, 34, 10, 42],
    [48, 16, 56, 24, 50, 18, 58, 26],
    [12, 44, 4, 36, 14, 46, 6, 38],
    [60, 28, 52, 20, 62, 30, 54, 22],
    [3, 35, 11, 43, 1, 33, 9, 41],
    [51, 19, 59, 27, 49, 17, 57, 25],
    [15, 47, 7, 39, 13, 45, 5, 37],
    [63, 31, 55, 23, 61, 29, 53, 21],
  ];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const index = y * size + x;
      buffer[index] = Math.floor((bayerMatrix[y][x] / 64) * 255);
    }
  }

  return buffer;
}

/**
 * Linear interpolation between two colors
 */
function lerpColor(
  color1: { r: number; g: number; b: number },
  color2: { r: number; g: number; b: number },
  t: number
): { r: number; g: number; b: number } {
  return {
    r: Math.round(color1.r + (color2.r - color1.r) * t),
    g: Math.round(color1.g + (color2.g - color1.g) * t),
    b: Math.round(color1.b + (color2.b - color1.b) * t),
  };
}

/**
 * Generate Purple/Pink gradient LUT
 */
function generateGradientLUT(width: number = 256, height: number = 16): Buffer {
  const buffer = Buffer.alloc(width * height * 3); // RGB

  // Gradient stops
  const gradientStops = [
    { stop: 0.0, color: BRAND_COLORS.purple[950] },
    { stop: 0.2, color: BRAND_COLORS.purple[900] },
    { stop: 0.4, color: BRAND_COLORS.purple[600] },
    { stop: 0.6, color: BRAND_COLORS.purple[500] },
    { stop: 0.8, color: BRAND_COLORS.purple[300] },
    { stop: 1.0, color: BRAND_COLORS.ghost[100] },
  ];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const t = x / (width - 1);

      // Find gradient segment
      let color1 = gradientStops[0].color;
      let color2 = gradientStops[1].color;
      let segmentT = 0;

      for (let i = 0; i < gradientStops.length - 1; i++) {
        const stop1 = gradientStops[i];
        const stop2 = gradientStops[i + 1];

        if (t >= stop1.stop && t <= stop2.stop) {
          color1 = stop1.color;
          color2 = stop2.color;
          segmentT = (t - stop1.stop) / (stop2.stop - stop1.stop);
          break;
        }
      }

      const color = lerpColor(color1, color2, segmentT);

      const index = (y * width + x) * 3;
      buffer[index] = color.r;
      buffer[index + 1] = color.g;
      buffer[index + 2] = color.b;
    }
  }

  return buffer;
}

/**
 * Simple Perlin-like noise generator
 */
function generateNoise(width: number = 256, height: number = 256): Buffer {
  const buffer = Buffer.alloc(width * height);

  // Generate random noise
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      buffer[index] = Math.floor(Math.random() * 255);
    }
  }

  return buffer;
}

/**
 * Write raw buffer to file (for use with DataTexture)
 */
function writeRawTexture(
  buffer: Buffer,
  filename: string,
  width: number,
  height: number,
  channels: number = 1
): void {
  const metadata = {
    width,
    height,
    channels,
    format: channels === 1 ? 'Luminance' : 'RGB',
  };

  const outputDir = path.join(process.cwd(), 'public', 'textures');
  ensureDir(outputDir);

  // Write metadata JSON
  const metadataPath = path.join(outputDir, `${filename}.json`);
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

  // Write raw buffer
  const bufferPath = path.join(outputDir, `${filename}.bin`);
  fs.writeFileSync(bufferPath, buffer);

  console.log(`✓ Generated ${filename} (${width}x${height}, ${channels} channel${channels > 1 ? 's' : ''})`);
}

/**
 * Main generation function
 */
function main(): void {
  console.log('Generating textures for Pactwise WebGL Landing Page...\n');

  // Generate Bayer matrix (8x8, single channel)
  const bayerMatrix = generateBayerMatrix();
  writeRawTexture(bayerMatrix, 'bayer-matrix-8x8', 8, 8, 1);

  // Generate gradient LUT (256x16, RGB)
  const gradientLUT = generateGradientLUT(256, 16);
  writeRawTexture(gradientLUT, 'gradient-lut-purple-pink', 256, 16, 3);

  // Generate noise texture (256x256, single channel)
  const noise = generateNoise(256, 256);
  writeRawTexture(noise, 'noise-tile', 256, 256, 1);

  console.log('\n✓ All textures generated successfully!');
  console.log('\nTextures location: public/textures/');
  console.log('\nUsage:');
  console.log('  - Load with TextureLoader (frontend/src/components/webgl/utils/texture-loader.ts)');
  console.log('  - Apply to shaders via uniforms');
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { generateBayerMatrix, generateGradientLUT, generateNoise };
