/**
 * Gerçek personeli Firestore'a yükler (Başak Vardiya).
 *
 * Servis hesabıyla (Admin SDK) doğrudan yazar — kurallardan/anonim girişten
 * bağımsızdır. Kaynak: şubelerin mevcut haftalık vardiya tabloları.
 *
 * Çalıştırma:
 *   GOOGLE_APPLICATION_CREDENTIALS=/yol/sa.json \
 *   npx tsx scripts/seed-personel.ts
 *
 * ID'ler ada göre türetilir (slug), bu yüzden tekrar çalıştırmak kopya
 * oluşturmaz; aynı kişinin kaydını günceller.
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const NS = process.env.VITE_VARDIYA_NAMESPACE || 'vardiya';

initializeApp({ credential: applicationDefault(), projectId: 'vardiya-9b064' });
const db = getFirestore();

type Rol = 'usta' | 'tezgahtar';
interface Kisi {
  ad: string;
  rol: Rol;
  izinGunu?: string;
  not?: string;
}

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

// ---- Şubelere göre gerçek personel (vardiya tablolarından) ----
const VERI: Record<string, Kisi[]> = {
  demetevler: [
    { ad: 'HAŞİM', rol: 'usta' },
    { ad: 'MEHMET', rol: 'usta' },
    { ad: 'ALPASLAN', rol: 'usta' },
    { ad: 'SELÇUK', rol: 'usta' },
    { ad: 'SEYMEN', rol: 'usta' },
    { ad: 'ASIM', rol: 'usta' },
    { ad: 'YUSUF', rol: 'usta' },
    { ad: 'KEFO', rol: 'usta', not: 'H.K.' },
    { ad: 'ŞEVVAL', rol: 'tezgahtar', izinGunu: 'Perşembe' },
    { ad: 'FATMA', rol: 'tezgahtar', izinGunu: 'Cuma, Cumartesi, Pazar' },
    { ad: 'KEMAL', rol: 'tezgahtar', izinGunu: 'Çarşamba' },
    { ad: 'CİHAN', rol: 'tezgahtar' },
    { ad: 'GİZEM', rol: 'tezgahtar', izinGunu: 'Pazar' },
    { ad: 'BATUHAN', rol: 'tezgahtar' },
    { ad: 'MELEK', rol: 'tezgahtar', izinGunu: 'Pazar' },
  ],
  bahcelievler: [
    { ad: 'HAKKI', rol: 'usta' },
    { ad: 'AYHAN', rol: 'usta' },
    { ad: 'AYŞEGÜL', rol: 'tezgahtar', izinGunu: 'Salı' },
    { ad: 'EMİR', rol: 'tezgahtar' },
    { ad: 'ZEYNEP', rol: 'tezgahtar' },
    { ad: 'FURKAN', rol: 'tezgahtar', izinGunu: 'Çarşamba' },
    { ad: 'HALİL', rol: 'tezgahtar', izinGunu: 'Pazar' },
    { ad: 'BATUHAN', rol: 'tezgahtar' },
  ],
  etlik: [
    { ad: 'KAMİL', rol: 'usta' },
    { ad: 'BERKAY', rol: 'usta' },
    { ad: 'ERKAN', rol: 'usta' },
    { ad: 'DUA', rol: 'tezgahtar', izinGunu: 'Perşembe' },
    { ad: 'FATMA', rol: 'tezgahtar', izinGunu: 'Salı' },
    { ad: 'MENNA', rol: 'tezgahtar', izinGunu: 'Cuma' },
    { ad: 'HATİCE', rol: 'tezgahtar', izinGunu: 'Çarşamba' },
    { ad: 'İLAYDA', rol: 'tezgahtar' },
  ],
  batikent: [
    { ad: 'ERCAN', rol: 'usta' },
    { ad: 'İSMAİL', rol: 'usta', izinGunu: 'Çarşamba' },
    { ad: 'CESUR', rol: 'usta', izinGunu: 'Perşembe' },
    { ad: 'ALPASLAN', rol: 'usta' },
    { ad: 'HAŞİM', rol: 'usta' },
    { ad: 'YEŞİL', rol: 'tezgahtar', izinGunu: 'Pazartesi', not: 'Sabit sabahçı' },
    { ad: 'MELEK', rol: 'tezgahtar', izinGunu: 'Çarşamba' },
    { ad: 'İNCİ', rol: 'tezgahtar', izinGunu: 'Salı' },
    { ad: 'BERAT', rol: 'tezgahtar', izinGunu: 'Perşembe' },
    { ad: 'MELEK KARTAL', rol: 'tezgahtar' },
  ],
};

async function main() {
  for (const [sube, kisiler] of Object.entries(VERI)) {
    // sıra: önce ustalar, sonra tezgahtar (listedeki sıraya göre)
    let sira = 0;
    for (const k of kisiler) {
      const id = slug(k.ad);
      await db
        .collection(NS)
        .doc('personel')
        .collection(sube)
        .doc(id)
        .set(
          {
            ad: k.ad,
            rol: k.rol,
            sira: sira++,
            aktif: true,
            izinGunu: k.izinGunu ?? '',
            not: k.not ?? '',
            telefon: '',
            iban: '',
            iseGiris: '',
            tcKimlik: '',
            dogumTarihi: '',
          },
          { merge: true },
        );
    }
    console.log(`  ✓ ${sube}: ${kisiler.length} personel`);
  }
  console.log('\nPersonel yükleme tamam ✓');
  process.exit(0);
}

main().catch((e) => {
  console.error('Hata:', e);
  process.exit(1);
});
