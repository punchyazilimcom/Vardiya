/**
 * Gerçek personeli Firestore'a yükler (Başak Vardiya).
 *
 * Servis hesabıyla (Admin SDK) doğrudan yazar — kurallardan/anonim girişten
 * bağımsızdır. Kaynak: PERSONELLER.xlsx (PERSONEL BİLGİ KAYIT) — güncel/final
 * liste. Eski seed'deki şube değiştiren kişiler yeni şubelerine taşındı,
 * işten ayrılanlar listeden çıkarıldı. İzin günleri, eski vardiya
 * listesinden ad eşleşmesiyle eklendi (şube/ad değişen kişiler onaylı).
 *
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

const NS = process.env.VITE_VARDIYA_NAMESPACE || 'vardiya';

initializeApp({ credential: applicationDefault(), projectId: 'vardiya-9b064' });
const db = getFirestore();

type Rol = 'usta' | 'tezgahtar';
interface Kisi {
  ad: string;
  rol: Rol;
  izinGunu?: string;
  not?: string;
  telefon?: string;
  iban?: string;
  iseGiris?: string; // ISO "2024-09-02"
  tcKimlik?: string;
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

// ---- Şubelere göre gerçek personel (PERSONELLER.xlsx — final liste) ----
const VERI: Record<string, Kisi[]> = {
  demetevler: [
    { ad: 'SELÇUK BAŞARAN', rol: 'usta', telefon: '537 221 5025', iban: 'TR95 0001 0009 0856 3728 7150 02', tcKimlik: '17227017636', iseGiris: '2024-09-02' },
    { ad: 'HAKKI SARIKAŞ', rol: 'usta', not: 'IBAN sahibi: FATMA SARIKAŞ', telefon: '530 307 6299', iban: 'TR29 0001 2009 3880 0001 0289 49', tcKimlik: '19286331340', iseGiris: '2024-11-27' },
    { ad: 'ERCAN DEMİR', rol: 'usta', telefon: '535 033 0184', iban: 'TR28 0006 2000 5110 0006 8356 77', tcKimlik: '34453314872', iseGiris: '2026-01-23' },
    { ad: 'ONUR KURNAZ', rol: 'usta', telefon: '552 582 47 25', iban: 'TR440006200039200006288904', tcKimlik: '22639802114' },
    { ad: 'HAŞİM ZEYREK', rol: 'usta', telefon: '536 224 9312', iban: 'TR28 0001 0090 1018 0632 4050 01', tcKimlik: '10346119892', iseGiris: '2025-12-04' },
    { ad: 'ASIM', rol: 'usta', telefon: '534 784 6324', tcKimlik: '14065993580' },
    { ad: 'MEHMET SARI', rol: 'usta', telefon: '538 845 15 91', iban: 'TR38 0006 2000 5330 0006 6481 77', tcKimlik: '11809049428', iseGiris: '2024-10-02' },
    { ad: 'ALPARSLAN', rol: 'usta', telefon: '501 087 5906', iban: 'TR34 0006 2000 5300 0006 6400 19', tcKimlik: '10090346452', iseGiris: '2025-02-28' },
    { ad: 'KEFAYET', rol: 'usta', telefon: '530 600 0686' },
    { ad: 'HALİL İBRAHİM KIZILIRMAK', rol: 'tezgahtar', izinGunu: 'Pazar', not: 'OFİS', telefon: '543 478 0640', tcKimlik: '28280097848', iseGiris: '2025-01-28' },
    { ad: 'SEVDE', rol: 'tezgahtar', not: 'IBAN sahibi: ÖMER KARAKURT', telefon: '507 963 9114', iban: 'TR3300 0100 1692 7142 1563 5001', tcKimlik: '13165945420', iseGiris: '2025-12-27' },
    { ad: 'MELEK ÖZDEMİR', rol: 'tezgahtar', izinGunu: 'Pazar', telefon: '545 201 86 84', tcKimlik: '19012933176', iseGiris: '2025-09-22' },
    { ad: 'ZARİFE ŞEVVAL DAĞ', rol: 'tezgahtar', izinGunu: 'Perşembe', telefon: '5344534920', iban: 'TR 6500 0100 9010 55087290 5001', tcKimlik: '12208273544', iseGiris: '2026-02-01' },
    { ad: 'CİHAN BOZKURT', rol: 'tezgahtar', telefon: '544 149 6536', iban: 'TR04 0001 0022 0195 7900 5450 01', tcKimlik: '17158369910', iseGiris: '2024-11-27' },
    { ad: 'MELEK KARTAL', rol: 'tezgahtar', not: 'OFİS', telefon: '505 716 2370', iban: 'TR31 0006 2001 3610 0006 6608 47', tcKimlik: '10291274950', iseGiris: '2026-02-07' },
    { ad: 'BATUHAN YILDIZ', rol: 'tezgahtar', not: 'OFİS', telefon: '552 836 8473', iban: 'TR69 0006 2001 0820 0006 8660 34', tcKimlik: '15235449104', iseGiris: '2025-10-08' },
  ],
  bahcelievler: [
    { ad: 'KEMAL YİĞİT KÜÇÜKKAHRAMAN', rol: 'usta', telefon: '544 113 0636', iban: 'TR59 0006 2000 5300 0006 6246 31' },
    { ad: 'MUSTAFA ABDULSAMET BULUT', rol: 'usta', not: 'IBAN sahibi: HÜRRİYET BULUT', telefon: '501 145 25 23', iban: 'TR95 0001 0003 5772 9753 5950 01', tcKimlik: '33112425584' },
    { ad: 'FURKAN AKTAŞ', rol: 'tezgahtar', izinGunu: 'Çarşamba', telefon: '538 652 13 18', iban: 'TR98 0006 7010 0000 0027 0480 45', tcKimlik: '12850251532', iseGiris: '2025-06-18' },
    { ad: 'AYŞEGÜL KAYĞUSUZ', rol: 'tezgahtar', izinGunu: 'Salı', telefon: '533 191 5298', iban: 'TR51 0004 6013 2588 8000 0291 96', tcKimlik: '37868187086', iseGiris: '2025-01-29' },
    { ad: 'YAKUP DOĞUHAN KAYA', rol: 'tezgahtar', telefon: '533 494 69 72', iban: 'TR03 0004 6004 0288 8000 2239 41', tcKimlik: '11011226532', iseGiris: '2025-12-06' },
    { ad: 'MUHAMMED EMİR ÖZKARA', rol: 'tezgahtar', not: 'IBAN sahibi: ÖNDER ÖZKARA', telefon: '535 361 0614', iban: 'TR12 0004 6006 6188 8000 2286 77', tcKimlik: '11332156372', iseGiris: '2025-10-23' },
  ],
  etlik: [
    { ad: 'MAHİR KURNAZ', rol: 'usta', telefon: '533 471 2512', iban: 'TR49 0001 5001 5800 7365 4881 29', tcKimlik: '10181218620', iseGiris: '2025-12-08' },
    { ad: 'BERKAY', rol: 'usta', telefon: '536 589 7331', iban: 'TR03 0001 0090 1072 1912 3050 01', tcKimlik: '10195262534', iseGiris: '2025-06-27' },
    { ad: 'KAMİL', rol: 'usta', not: 'IBAN sahibi: SONGÜL SARICI', telefon: '546 785 0385', iban: 'TR 5800 0100 0508 8561 4039 5001', tcKimlik: '31906917680', iseGiris: '2024-10-10' },
    { ad: 'FADİME ÖZDEMİR', rol: 'tezgahtar', telefon: '507 667 1222', iban: 'TR75 0006 4000 0014 3920 1801 80', tcKimlik: '13732179104' },
    { ad: 'MERAL AYDOS', rol: 'tezgahtar', telefon: '501 011 7206', iban: 'TR34 0013 4000 0255 9658 3000 01', tcKimlik: '15877112282' },
    { ad: 'HATİCE KAYA', rol: 'tezgahtar', izinGunu: 'Çarşamba', telefon: '551 363 9302', iban: 'TR96 0006 2000 7740 0006 8699 01', tcKimlik: '10780259338', iseGiris: '2023-05-29' },
    { ad: 'MUSTAFA SÖKMEN', rol: 'tezgahtar', telefon: '538 487 8316', tcKimlik: '45049209946' },
  ],
  batikent: [
    { ad: 'CESUR GÜLER', rol: 'usta', izinGunu: 'Perşembe', telefon: '541 589 8357', iban: 'TR68 0004 6005 2288 8000 120159', tcKimlik: '36181962264', iseGiris: '2024-10-02' },
    { ad: 'AZİZ', rol: 'usta', telefon: '531 612 6289', iban: 'TR75 0006 2000 6820 0006 8744 25', tcKimlik: '10150325366', iseGiris: '2025-11-20' },
    { ad: 'ERKAN BATUR', rol: 'usta', telefon: '555 037 2610', iban: 'TR20 0001 0014 2792 0191 7950 01', tcKimlik: '69925103500', iseGiris: '2024-10-04' },
    { ad: 'NEZİRE ÜNVER (İNCİ)', rol: 'tezgahtar', izinGunu: 'Salı', telefon: '546 767 0735', iban: 'TR97 0001 0012 2595 3918 2450 02', tcKimlik: '62779239050', iseGiris: '2025-12-08' },
    { ad: 'YEŞİM DAĞDELEN', rol: 'tezgahtar', izinGunu: 'Pazartesi', not: 'Sabit sabahçı', telefon: '545 687 4142', iban: 'TR72 0011 1000 0000 0050 2738 27', tcKimlik: '36286753224' },
    { ad: 'İLAYDA YILDIZ', rol: 'tezgahtar', telefon: '542 490 4658', iban: 'TR74 0011 1000 0000 0161 3888 43', tcKimlik: '10027081784' },
    { ad: 'KADRİ EREN YILMAZ', rol: 'tezgahtar', iban: 'TR 1000 0100 9010 0242 0280 5001', tcKimlik: '15265173932', iseGiris: '2026-02-06' },
  ],
};

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
