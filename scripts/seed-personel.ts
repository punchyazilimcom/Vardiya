/**
 * Gerçek personeli Firestore'a yükler (Başak Vardiya).
 *
 * Servis hesabıyla (Admin SDK) doğrudan yazar — kurallardan/anonim girişten
 * bağımsızdır. Kadro, eski vardiya listesi (gerçek kadro) referans alınarak
 * belirlendi; özlük bilgileri (telefon/IBAN/TC/işe giriş) PERSONELLER.xlsx'ten
 * korunur. Ayrılanlar (ör. MELEK ÖZDEMİR) çıkarıldı; eski listede olup özlüğü
 * bulunmayanlar boş alanlarla eklendi (sonradan doldurulur). Çapraz şube
 * çalışan kişiler ev şubesinde tek kayıttır; diğer şube günleri vardiyada
 * "BATIKENT 06:30…" gibi hücreyle belirtilir.
 *
 * Kadro verisi scripts/personel-veri.ts içindedir (seed + örnek-excel paylaşır).
 * Görev eşlemesi: İMALAT → usta, TEZGAH → tezgahtar, OFİS → tezgahtar (not: OFİS).
 *
 * Çalıştırma:
 *   GOOGLE_APPLICATION_CREDENTIALS=/yol/sa.json \
 *   npx tsx scripts/seed-personel.ts
 *
 * ID'ler ada göre türetilir (slug), bu yüzden tekrar çalıştırmak kopya
 * oluşturmaz; aynı kişinin kaydını günceller. Listede olmayan (ayrılan)
 * personel her şubeden TEMİZLENİR — geçmiş haftalar personelSnapshot ile korunur.
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { VERI } from './personel-veri';

const NS = process.env.VITE_VARDIYA_NAMESPACE || 'vardiya';

initializeApp({ credential: applicationDefault(), projectId: 'vardiya-9b064' });
const db = getFirestore();

function slug(ad: string): string {
  return ad
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

async function main() {
  let toplam = 0;
  for (const [sube, kisiler] of Object.entries(VERI)) {
    const subeRef = db.collection(NS).doc('personel').collection(sube);

    // Final liste id'leri (slug)
    const guncelIdler = new Set(kisiler.map((k) => slug(k.ad)));

    // Listede olmayan (ayrılan/şube değiştiren) personeli temizle.
    const mevcut = await subeRef.get();
    let silinen = 0;
    for (const d of mevcut.docs) {
      if (!guncelIdler.has(d.id)) {
        await d.ref.delete();
        silinen++;
      }
    }

    // sıra: önce ustalar, sonra tezgahtar (listedeki sıraya göre)
    let sira = 0;
    for (const k of kisiler) {
      const id = slug(k.ad);
      await subeRef.doc(id).set(
        {
          ad: k.ad,
          rol: k.rol,
          sira: sira++,
          aktif: true,
          izinGunu: k.izinGunu ?? '',
          not: k.not ?? '',
          telefon: k.telefon ?? '',
          iban: k.iban ?? '',
          iseGiris: k.iseGiris ?? '',
          tcKimlik: k.tcKimlik ?? '',
          dogumTarihi: '',
          maas: k.maas ?? '',
          izinHakki: k.izinHakki ?? '',
        },
        { merge: true },
      );
    }
    toplam += kisiler.length;
    console.log(
      `  ✓ ${sube}: ${kisiler.length} personel${silinen ? `  (− ${silinen} ayrılan temizlendi)` : ''}`,
    );
  }
  console.log(`\nPersonel yükleme tamam ✓  (toplam ${toplam} kişi)`);
  process.exit(0);
}

main().catch((e) => {
  console.error('Hata:', e);
  process.exit(1);
});
