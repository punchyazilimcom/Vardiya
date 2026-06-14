/**
 * Resmi personel künyesini Firestore'a yükler (Admin SDK ile doğrudan).
 * Kadro tek kaynaktan gelir: scripts/personel-veri.ts
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=/yol/sa.json npx tsx scripts/seed-personel.ts
 *
 * VARSAYILAN: her şubenin personel koleksiyonunu TEMİZLEYİP listeyi yazar
 * (tek doğru liste; geçmiş haftalar personelSnapshot ile korunur).
 * Sadece eklemek için TEMIZLE=false. ID'ler ada göre türetilir (idempotent).
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { KISILER, type SubeKod } from './personel-veri';

const NS = process.env.VITE_VARDIYA_NAMESPACE || 'vardiya';
const TEMIZLE = process.env.TEMIZLE !== 'false';

initializeApp({ credential: applicationDefault(), projectId: 'vardiya-9b064' });
const db = getFirestore();

function slug(ad: string): string {
  return ad
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c')
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

async function temizleSube(sube: SubeKod) {
  const col = db.collection(NS).doc('personel').collection(sube);
  const snap = await col.get();
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  if (snap.size) await batch.commit();
}

async function main() {
  const subeler: SubeKod[] = ['demetevler', 'bahcelievler', 'etlik', 'batikent'];
  if (TEMIZLE) {
    for (const s of subeler) await temizleSube(s);
    console.log('  (eski personel kayıtları temizlendi)');
  }
  const sira: Record<string, number> = {};
  for (const k of KISILER) {
    sira[k.sube] = sira[k.sube] ?? 0;
    await db.collection(NS).doc('personel').collection(k.sube).doc(slug(k.ad)).set(
      {
        ad: k.ad,
        rol: k.rol,
        sira: sira[k.sube]++,
        aktif: k.aktif ?? true,
        izinGunu: k.izinGunu ?? '',
        not: k.not ?? '',
        telefon: k.telefon ?? '',
        iban: k.iban ?? '',
        iseGiris: k.iseGiris ?? '',
        tcKimlik: k.tcKimlik ?? '',
        dogumTarihi: '',
        maas: k.maas ?? '',
        yillikIzin: k.yillik ?? 0,
        kullanilanIzin: k.kullanilan ?? 0,
        kalanIzin: k.kalan ?? 0,
      },
      { merge: true },
    );
  }
  for (const s of subeler) {
    console.log(`  ✓ ${s}: ${KISILER.filter((k) => k.sube === s).length} personel`);
  }
  console.log('\nÖzlük yükleme tamam ✓');
  process.exit(0);
}

main().catch((e) => {
  console.error('Hata:', e);
  process.exit(1);
});
