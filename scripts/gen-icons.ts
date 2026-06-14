/**
 * resources/icon-master.svg'den tüm platform ikonlarını üretir.
 *   npx tsx scripts/gen-icons.ts
 * Üretilenler: web PWA/apple ikonları (public/), Electron (build/icon.png|ico),
 * Capacitor kaynağı (resources/icon.png).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const master = readFileSync(new URL('../resources/icon-master.svg', import.meta.url));

async function png(size: number, out: string) {
  mkdirSync(out.replace(/\/[^/]+$/, ''), { recursive: true });
  await sharp(master, { density: 384 }).resize(size, size).png().toFile(out);
  console.log('  ✓', out, `(${size})`);
}

async function main() {
  // Web (public/)
  await png(512, 'public/pwa-512.png');
  await png(192, 'public/pwa-192.png');
  await png(180, 'public/apple-touch-icon.png');
  await png(32, 'public/favicon-32.png');
  await png(16, 'public/favicon-16.png');
  // Electron (build/)
  await png(1024, 'build/icon.png');
  // Capacitor kaynağı (resources/)
  await png(1024, 'resources/icon.png');

  // Windows .ico (çok boyutlu)
  const boyutlar = await Promise.all(
    [16, 24, 32, 48, 64, 128, 256].map((s) =>
      sharp(master, { density: 384 }).resize(s, s).png().toBuffer(),
    ),
  );
  const ico = await pngToIco(boyutlar);
  writeFileSync('build/icon.ico', ico);
  console.log('  ✓ build/icon.ico');

  console.log('\nİkonlar üretildi ✓');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
