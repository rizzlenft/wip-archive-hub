import sharp from 'sharp';
import fs from 'fs';

const tasks = [
  // hero-bg: large jpeg → smaller webp + jpg fallback at sane width
  { src: 'src/assets/hero-bg.jpg', out: 'src/assets/hero-bg.jpg', op: s => s.resize({ width: 1600, withoutEnlargement: true }).jpeg({ quality: 72, mozjpeg: true }) },
  // wip-logo-static: 936x936 → 256 (used at 40-70px)
  { src: 'src/assets/wip-logo-static.png', out: 'src/assets/wip-logo-static.png', op: s => s.resize({ width: 256 }).png({ compressionLevel: 9, palette: true }) },
  // rizzle-pfp: 1050x1050 → 320
  { src: 'src/assets/rizzle-pfp.jpeg', out: 'src/assets/rizzle-pfp.jpeg', op: s => s.resize({ width: 320 }).jpeg({ quality: 78, mozjpeg: true }) },
  { src: 'src/assets/rizzle-pfp-3.jpeg', out: 'src/assets/rizzle-pfp-3.jpeg', op: s => s.resize({ width: 320 }).jpeg({ quality: 78, mozjpeg: true }) },
  // nft-gift-1: 800 → 360
  { src: 'src/assets/nft-gift-1.jpeg', out: 'src/assets/nft-gift-1.jpeg', op: s => s.resize({ width: 360 }).jpeg({ quality: 78, mozjpeg: true }) },
];

for (const t of tasks) {
  const before = fs.statSync(t.src).size;
  const buf = await t.op(sharp(t.src)).toBuffer();
  fs.writeFileSync(t.out, buf);
  const after = fs.statSync(t.out).size;
  console.log(`${t.src}: ${(before/1024).toFixed(0)}KB -> ${(after/1024).toFixed(0)}KB`);
}
