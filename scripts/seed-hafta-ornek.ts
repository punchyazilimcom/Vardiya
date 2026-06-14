/**
 * Örnek dolu hafta üretir: her şube için bu haftanın gridini Akıllı Otomatik
 * Doldur motoruyla kurar (izin günleri + 2 açılış/2 kapanış + FULL telafisi)
 * ve Firestore'a yazar. Personel ID'leri seed-personel ile aynı (slug).
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=/yol/sa.json npx tsx scripts/seed-hafta-ornek.ts
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { KISILER, type SubeKod } from './personel-veri';
import { otomatikDoldur } from '../src/lib/otomatik';
import { haftaAralik } from '../src/lib/week';
import { GENEL_PRESET, BAHCELIEVLER_OVERRIDE } from '../src/constants';
import type { Personel, SubeOnayar } from '../src/types';

const NS = process.env.VITE_VARDIYA_NAMESPACE || 'vardiya';
initializeApp({ credential: applicationDefault(), projectId: 'vardiya-9b064' });
const db = getFirestore();

function slug(ad: string): string {
  return ad
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c')
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

const onayar = (sube: SubeKod): SubeOnayar => ({
  genel: GENEL_PRESET,
  override: sube === 'bahcelievler' ? BAHCELIEVLER_OVERRIDE : undefined,
});

async function main() {
  const tarih = new Date();
  const iso = haftaAralik(tarih).anahtar;
  const subeler: SubeKod[] = ['demetevler', 'bahcelievler', 'etlik', 'batikent'];

  for (const sube of subeler) {
    let sira = 0;
    const personeller: Personel[] = KISILER.filter((k) => k.sube === sube).map((k) => ({
      id: slug(k.ad),
      ad: k.ad,
      rol: k.rol,
      sira: sira++,
      aktif: true,
      izinGunu: k.izinGunu ?? '',
      not: k.not ?? '',
    }));

    const sonuc = otomatikDoldur({
      sube,
      tarih,
      personeller,
      mevcut: null,
      onceki: null,
      onayar: onayar(sube),
    });

    await db.collection(NS).doc('haftalar').collection(sube).doc(iso).set({
      ...sonuc.hafta,
      guncelleyen: 'ornek',
      guncelTarih: new Date().toISOString(),
    });
    console.log(`  ✓ ${sube} (${iso}): ${personeller.length} kişi · ${sonuc.uyarilar.length} uyarı`);
  }
  console.log(`\nÖrnek hafta hazır ✓  (${iso})`);
  process.exit(0);
}

main().catch((e) => {
  console.error('Hata:', e);
  process.exit(1);
});
