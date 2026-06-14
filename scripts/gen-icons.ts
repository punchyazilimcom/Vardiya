/**
 * Uygulama ikonlarını üretir. Kaynak: resources/logo-source.png (gerçek Başak
 * Kır Pidesi logosu, siyah zemin + sarı). Yoksa resources/icon-master.svg.
 *   npx tsx scripts/gen-icons.ts
 * Üretilenler: web PWA/apple ikonları (public/), Electron (build/icon.png|ico),
 * Capacitor kaynağı (resources/icon.png).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const LOGO = new URL('../resources/logo-source.png', import.meta.url);
const SVG = new URL('../resources/icon-master.svg', import.meta.url);
const kaynakPng = existsSync(LOGO);
const master = kaynakPng ? readFileSync(LOGO) : readFileSync(SVG);

// Siyah zemine oturt (logonun kendi zemini siyah; dikiş olmaz) ve kareye getir.
function base(size: number) {
  return sharp(master, { density: 512 })
    .flatten({ background: '#000000' })
    .resize(size, size, { fit: 'cover', position: 'center' });
}

async function png(size: number, out: string) {
  mkdirSync(out.replace(/\/[^/]+$/, ''), { recursive: true });
  await base(size).png().toFile(out);
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
    [16, 24, 32, 48, 64, 128, 256].map((s) => base(s).png().toBuffer()),
  );
  const ico = await pngToIco(boyutlar);
  writeFileSync('build/icon.ico', ico);
  console.log('  ✓ build/icon.ico');

  console.log('\nİkonlar üretildi ✓ (kaynak: ' + (kaynakPng ? 'logo-source.png' : 'icon-master.svg') + ')');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
