/**
 * Gerçek personel künyesini (PERSONELLER.xlsx — resmi özlük) Firestore'a yükler.
 * Admin SDK ile doğrudan yazar. Kaynak: şirketin personel kayıt tablosu.
 *
 * Görev eşlemesi: İMALAT → usta, TEZGAH → tezgahtar, OFİS → tezgahtar (not: OFİS).
 *
 * Çalıştırma:
 *   GOOGLE_APPLICATION_CREDENTIALS=/yol/sa.json npx tsx scripts/seed-personel.ts
 *
 * VARSAYILAN: her şubenin personel koleksiyonunu TEMİZLEYİP bu listeyi yazar
 * (tek doğru liste; geçmiş haftalar personelSnapshot ile korunur).
 * Yalnızca eklemek için TEMIZLE=false yapın. ID'ler ada göre türetilir (idempotent).
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const NS = process.env.VITE_VARDIYA_NAMESPACE || 'vardiya';
const TEMIZLE = process.env.TEMIZLE !== 'false';

initializeApp({ credential: applicationDefault(), projectId: 'vardiya-9b064' });
const db = getFirestore();

type Rol = 'usta' | 'tezgahtar';
type SubeKod = 'demetevler' | 'bahcelievler' | 'etlik' | 'batikent';
interface Kisi {
  ad: string;
  sube: SubeKod;
  rol: Rol; // İMALAT->usta, TEZGAH/OFİS->tezgahtar
  tc?: string;
  telefon?: string;
  iseGiris?: string; // dd.mm.yyyy
  maas?: string;
  iban?: string;
  not?: string;
  yillik?: number;
  kullanilan?: number;
  kalan?: number;
  aktif?: boolean; // varsayılan true
}

// dd.mm.yyyy -> yyyy-mm-dd
function isoTarih(t?: string): string {
  if (!t) return '';
  const m = t.replace(/\s+/g, '').match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return '';
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

function slug(ad: string): string {
  return ad
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c')
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

// ---- Resmi özlük listesi (PERSONELLER.xlsx) ----
const KISILER: Kisi[] = [
  // DEMETEVLER — usta (İMALAT)
  { ad: 'SELÇUK BAŞARAN', sube: 'demetevler', rol: 'usta', tc: '17227017636', telefon: '537 221 5025', iseGiris: '02.09.2024', iban: 'TR95 0001 0009 0856 3728 7150 02' },
  { ad: 'HAKKI SARIKAŞ', sube: 'demetevler', rol: 'usta', tc: '19286331340', telefon: '530 307 6299', iseGiris: '27.11.2024', maas: '₺1,573', iban: 'TR29 0001 2009 3880 0001 0289 49', not: 'FATMA SARIKAŞ · Çıkış 21.02.2026 - ?', yillik: 15, kullanilan: 10, kalan: 5 },
  { ad: 'ERCAN DEMİR', sube: 'demetevler', rol: 'usta', tc: '34453314872', telefon: '535 033 0184', iseGiris: '23.01.2026', maas: '₺11,800', iban: 'TR28 0006 2000 5110 0006 8356 77' },
  { ad: 'ONUR KURNAZ', sube: 'demetevler', rol: 'usta', tc: '22639802114', telefon: '552 582 47 25', iban: 'TR440006200039200006288904' },
  { ad: 'HAŞİM ZEYREK', sube: 'demetevler', rol: 'usta', tc: '10346119892', telefon: '536 224 9312', iseGiris: '04.12.2025', maas: '₺11,800', iban: 'TR28 0001 0090 1018 0632 4050 01' },
  { ad: 'ASIM', sube: 'demetevler', rol: 'usta', tc: '14065993580', telefon: '534 784 6324' },
  { ad: 'MEHMET SARI', sube: 'demetevler', rol: 'usta', tc: '11809049428', telefon: '538 845 15 91', iseGiris: '02.10.2024', maas: '₺786', iban: 'TR38 0006 2000 5330 0006 6481 77', not: 'İzin 03.03.2026 - 12.03.2026', yillik: 10, kullanilan: 10, kalan: 0 },
  { ad: 'ALPARSLAN', sube: 'demetevler', rol: 'usta', tc: '10090346452', telefon: '501 087 5906', iseGiris: '28.02.2025', maas: '₺11,800', iban: 'TR34 0006 2000 5300 0006 6400 19' },
  { ad: 'KEFAYET', sube: 'demetevler', rol: 'usta', telefon: '530 600 0686' },
  // DEMETEVLER — tezgah
  { ad: 'SEVDE', sube: 'demetevler', rol: 'tezgahtar', tc: '13165945420', telefon: '507 963 9114', iseGiris: '27.12.2025', maas: '₺11,800', iban: 'TR3300 0100 1692 7142 1563 5001', not: 'ÖMER KARAKURT' },
  { ad: 'MELEK ÖZDEMİR', sube: 'demetevler', rol: 'tezgahtar', tc: '19012933176', telefon: '545 201 86 84', iseGiris: '22.09.2025', maas: '₺11,800' },
  { ad: 'ZARİFE ŞEVVAL DAĞ', sube: 'demetevler', rol: 'tezgahtar', tc: '12208273544', telefon: '5344534920', iseGiris: '01.02.2026', maas: '₺11,800', iban: 'TR 6500 0100 9010 55087290 5001' },
  { ad: 'CİHAN BOZKURT', sube: 'demetevler', rol: 'tezgahtar', tc: '17158369910', telefon: '544 149 6536', iseGiris: '27.11.2024', maas: '₺11,800', iban: 'TR04 0001 0022 0195 7900 5450 01' },
  // DEMETEVLER — ofis (tezgahtar sayıldı)
  { ad: 'HALİL İBRAHİM KIZILIRMAK', sube: 'demetevler', rol: 'tezgahtar', tc: '28280097848', telefon: '543 478 0640', iseGiris: '28.01.2025', maas: '₺11,800', not: 'OFİS' },
  { ad: 'MELEK KARTAL', sube: 'demetevler', rol: 'tezgahtar', tc: '10291274950', telefon: '505 716 2370', iseGiris: '07.02.2026', maas: '₺11,800', iban: 'TR31 0006 2001 3610 0006 6608 47', not: 'OFİS' },
  { ad: 'BATUHAN YILDIZ', sube: 'demetevler', rol: 'tezgahtar', tc: '15235449104', telefon: '552 836 8473', iseGiris: '08.10.2025', maas: '₺11,800', iban: 'TR69 0006 2001 0820 0006 8660 34', not: 'OFİS' },

  // BAHÇELİEVLER — usta
  { ad: 'KEMAL YİĞİT KÜÇÜKKAHRAMAN', sube: 'bahcelievler', rol: 'usta', telefon: '544 113 0636', iban: 'TR59 0006 2000 5300 0006 6246 31' },
  { ad: 'MUSTAFA ABDULSAMET BULUT', sube: 'bahcelievler', rol: 'usta', tc: '33112425584', telefon: '501 145 25 23', iban: 'TR95 0001 0003 5772 9753 5950 01', not: 'HÜRRİYET BULUT' },
  // BAHÇELİEVLER — tezgah
  { ad: 'FURKAN AKTAŞ', sube: 'bahcelievler', rol: 'tezgahtar', tc: '12850251532', telefon: '538 652 13 18', iseGiris: '18.06.2025', maas: '₺11,800', iban: 'TR98 0006 7010 0000 0027 0480 45' },
  { ad: 'AYŞEGÜL KAYĞUSUZ', sube: 'bahcelievler', rol: 'tezgahtar', tc: '37868187086', telefon: '533 191 5298', iseGiris: '29.01.2025', maas: '₺11,800', iban: 'TR51 0004 6013 2588 8000 0291 96' },
  { ad: 'YAKUP DOĞUHAN KAYA', sube: 'bahcelievler', rol: 'tezgahtar', tc: '11011226532', telefon: '533 494 69 72', iseGiris: '06.12.2025', maas: '₺11,800', iban: 'TR03 0004 6004 0288 8000 2239 41' },
  { ad: 'MUHAMMED EMİR ÖZKARA', sube: 'bahcelievler', rol: 'tezgahtar', tc: '11332156372', telefon: '535 361 0614', iseGiris: '23.10.2025', maas: '₺786', iban: 'TR12 0004 6006 6188 8000 2286 77', not: 'ÖNDER ÖZKARA' },

  // ETLİK — usta
  { ad: 'MAHİR KURNAZ', sube: 'etlik', rol: 'usta', tc: '10181218620', telefon: '533 471 2512', iseGiris: '08.12.2025', maas: '₺11,800', iban: 'TR49 0001 5001 5800 7365 4881 29' },
  { ad: 'BERKAY', sube: 'etlik', rol: 'usta', tc: '10195262534', telefon: '536 589 7331', iseGiris: '27.06.2025', maas: '₺11,800', iban: 'TR03 0001 0090 1072 1912 3050 01' },
  { ad: 'KAMİL', sube: 'etlik', rol: 'usta', tc: '31906917680', telefon: '546 785 0385', iseGiris: '10.10.2024', maas: '₺786', iban: 'TR 5800 0100 0508 8561 4039 5001', not: 'SONGÜL SARICI · Çıkış 20.02.2026 - ?', yillik: 15, kullanilan: 15, kalan: 0 },
  // ETLİK — tezgah
  { ad: 'FADİME ÖZDEMİR', sube: 'etlik', rol: 'tezgahtar', tc: '13732179104', telefon: '507 667 1222', iban: 'TR75 0006 4000 0014 3920 1801 80' },
  { ad: 'MERAL AYDOS', sube: 'etlik', rol: 'tezgahtar', tc: '15877112282', telefon: '501 011 7206', iban: 'TR34 0013 4000 0255 9658 3000 01' },
  { ad: 'HATİCE KAYA', sube: 'etlik', rol: 'tezgahtar', tc: '10780259338', telefon: '551 363 9302', iseGiris: '29.05.2023', maas: '₺11,800', iban: 'TR96 0006 2000 7740 0006 8699 01' },
  { ad: 'MUSTAFA SÖKMEN', sube: 'etlik', rol: 'tezgahtar', tc: '45049209946', telefon: '538 487 8316' },

  // BATIKENT — usta
  { ad: 'CESUR GÜLER', sube: 'batikent', rol: 'usta', tc: '36181962264', telefon: '541 589 8357', iseGiris: '02.10.2024', maas: '₺11,800', iban: 'TR68 0004 6005 2288 8000 120159' },
  { ad: 'AZİZ', sube: 'batikent', rol: 'usta', tc: '10150325366', telefon: '531 612 6289', iseGiris: '20.11.2025', maas: '₺11,800', iban: 'TR75 0006 2000 6820 0006 8744 25' },
  { ad: 'ERKAN BATUR', sube: 'batikent', rol: 'usta', tc: '69925103500', telefon: '555 037 2610', iseGiris: '04.10.2024', maas: '₺11,800', iban: 'TR20 0001 0014 2792 0191 7950 01' },
  // BATIKENT — tezgah
  { ad: 'NEZİRE ÜNVER (İNCİ)', sube: 'batikent', rol: 'tezgahtar', tc: '62779239050', telefon: '546 767 0735', iseGiris: '08.12.2025', maas: '₺11,800', iban: 'TR97 0001 0012 2595 3918 2450 02' },
  { ad: 'YEŞİM DAĞDELEN', sube: 'batikent', rol: 'tezgahtar', tc: '36286753224', telefon: '545 687 4142', iban: 'TR72 0011 1000 0000 0050 2738 27' },
  { ad: 'İLAYDA YILDIZ', sube: 'batikent', rol: 'tezgahtar', tc: '10027081784', telefon: '542 490 4658', iban: 'TR74 0011 1000 0000 0161 3888 43' },
  { ad: 'KADRİ EREN YILMAZ', sube: 'batikent', rol: 'tezgahtar', tc: '15265173932', iseGiris: '06.02.2026', maas: '₺11,800', iban: 'TR 1000 0100 9010 0242 0280 5001' },
];

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
    const id = slug(k.ad);
    await db.collection(NS).doc('personel').collection(k.sube).doc(id).set(
      {
        ad: k.ad,
        rol: k.rol,
        sira: sira[k.sube]++,
        aktif: k.aktif ?? true,
        izinGunu: '',
        not: k.not ?? '',
        telefon: k.telefon ?? '',
        iban: k.iban ?? '',
        iseGiris: isoTarih(k.iseGiris),
        tcKimlik: k.tc ?? '',
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
