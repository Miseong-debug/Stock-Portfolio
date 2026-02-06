const fs = require('fs');
const path = require('path');

// Simple PNG generator for placeholder icons
// Creates a solid color square with a centered letter

function createPNG(size, bgColor, textColor, text) {
  // PNG header and IHDR chunk
  const width = size;
  const height = size;

  // Create raw pixel data (RGBA)
  const pixels = [];
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.35; // Circle radius

  // Parse hex colors
  const bg = hexToRgb(bgColor);
  const fg = hexToRgb(textColor);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Simple circle in center
      if (dist < radius) {
        pixels.push(fg.r, fg.g, fg.b, 255);
      } else {
        pixels.push(bg.r, bg.g, bg.b, 255);
      }
    }
  }

  return createPNGBuffer(width, height, pixels);
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

function createPNGBuffer(width, height, pixels) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = createIHDRChunk(width, height);

  // IDAT chunk (image data)
  const idat = createIDATChunk(width, height, pixels);

  // IEND chunk
  const iend = createIENDChunk();

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function createIHDRChunk(width, height) {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(width, 0);
  data.writeUInt32BE(height, 4);
  data.writeUInt8(8, 8);  // bit depth
  data.writeUInt8(6, 9);  // color type (RGBA)
  data.writeUInt8(0, 10); // compression
  data.writeUInt8(0, 11); // filter
  data.writeUInt8(0, 12); // interlace

  return createChunk('IHDR', data);
}

function createIDATChunk(width, height, pixels) {
  const zlib = require('zlib');

  // Add filter byte (0 = None) at start of each row
  const raw = [];
  for (let y = 0; y < height; y++) {
    raw.push(0); // filter byte
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      raw.push(pixels[idx], pixels[idx + 1], pixels[idx + 2], pixels[idx + 3]);
    }
  }

  const compressed = zlib.deflateSync(Buffer.from(raw), { level: 9 });
  return createChunk('IDAT', compressed);
}

function createIENDChunk() {
  return createChunk('IEND', Buffer.alloc(0));
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type);
  const crc = crc32(Buffer.concat([typeBuffer, data]));
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);

  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

// CRC32 implementation
function crc32(buf) {
  let crc = 0xffffffff;
  const table = getCRC32Table();

  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }

  return (crc ^ 0xffffffff) >>> 0;
}

let crcTable = null;
function getCRC32Table() {
  if (crcTable) return crcTable;

  crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[i] = c;
  }
  return crcTable;
}

// Generate icons
const publicDir = path.join(__dirname, '..', 'public');

// Dark background with green accent
const bgColor = '#0a0f14';
const accentColor = '#22c55e';

// Generate 192x192 icon
const icon192 = createPNG(192, bgColor, accentColor, 'P');
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), icon192);
console.log('Created icon-192.png');

// Generate 512x512 icon
const icon512 = createPNG(512, bgColor, accentColor, 'P');
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), icon512);
console.log('Created icon-512.png');

// Generate apple-touch-icon (180x180)
const appleIcon = createPNG(180, bgColor, accentColor, 'P');
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleIcon);
console.log('Created apple-touch-icon.png');

// Generate favicon (32x32)
const favicon = createPNG(32, bgColor, accentColor, 'P');
fs.writeFileSync(path.join(publicDir, 'favicon.png'), favicon);
console.log('Created favicon.png');

console.log('All icons generated!');
