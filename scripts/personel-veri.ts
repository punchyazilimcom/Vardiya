/**
 * Personel kadrosu — TEK DOĞRULUK KAYNAĞI (curated/güncel liste).
 * Hem seed-personel.ts hem ornek-excel.ts kullanır. Yan etkisi yoktur.
 *
 * NOT: Bu liste bilerek düzenlendi — resmi PERSONELLER.xlsx'te olup burada
 * OLMAYANLAR (ör. ONUR KURNAZ, SEVDE, MELEK ÖZDEMİR, MAHİR KURNAZ, AZİZ,
 * KADRİ EREN, KEMAL YİĞİT, MUSTAFA ABDULSAMET, YAKUP DOĞUHAN, MERAL,
 * MUSTAFA SÖKMEN) kasıtlı olarak çıkarıldı. ➕ = eski çizelgede olan,
 * künyesi sonra doldurulacak kişiler.
 *
 * Görev: İMALAT → usta, TEZGAH/OFİS → tezgahtar (OFİS not'ta belirtilir).
 * iseGiris ISO (yyyy-mm-dd). izinGunu = haftalık boş gün.
 */
export type Rol = 'usta' | 'tezgahtar';
export type SubeKod = 'demetevler' | 'bahcelievler' | 'etlik' | 'batikent';

export interface Kisi {
  ad: string;
  sube: SubeKod;
  rol: Rol;
  izinGunu?: string;
  not?: string;
  telefon?: string;
  iban?: string;
  iseGiris?: string; // ISO
  tcKimlik?: string;
  maas?: string;
  yillik?: number;
  kullanilan?: number;
  kalan?: number;
  aktif?: boolean;
}

export const KISILER: Kisi[] = [
  // ---- DEMETEVLER ----
  { ad: 'SELÇUK BAŞARAN', sube: 'demetevler', rol: 'usta', tcKimlik: '17227017636', telefon: '537 221 5025', iseGiris: '2024-09-02', iban: 'TR95 0001 0009 0856 3728 7150 02' },
  { ad: 'HAKKI SARIKAŞ', sube: 'demetevler', rol: 'usta', tcKimlik: '19286331340', telefon: '530 307 6299', iseGiris: '2024-11-27', maas: '₺1,573', iban: 'TR29 0001 2009 3880 0001 0289 49', not: 'IBAN: FATMA SARIKAŞ · Çıkış 21.02.2026 - ?', yillik: 15, kullanilan: 10, kalan: 5 },
  { ad: 'ERCAN DEMİR', sube: 'demetevler', rol: 'usta', tcKimlik: '34453314872', telefon: '535 033 0184', iseGiris: '2026-01-23', maas: '₺11,800', iban: 'TR28 0006 2000 5110 0006 8356 77' },
  { ad: 'HAŞİM ZEYREK', sube: 'demetevler', rol: 'usta', tcKimlik: '10346119892', telefon: '536 224 9312', iseGiris: '2025-12-04', maas: '₺11,800', iban: 'TR28 0001 0090 1018 0632 4050 01' },
  { ad: 'ASIM', sube: 'demetevler', rol: 'usta', tcKimlik: '14065993580', telefon: '534 784 6324' },
  { ad: 'MEHMET SARI', sube: 'demetevler', rol: 'usta', tcKimlik: '11809049428', telefon: '538 845 15 91', iseGiris: '2024-10-02', maas: '₺786', iban: 'TR38 0006 2000 5330 0006 6481 77', not: 'İzin 03.03.2026 - 12.03.2026', yillik: 10, kullanilan: 10, kalan: 0 },
  { ad: 'ALPARSLAN', sube: 'demetevler', rol: 'usta', tcKimlik: '10090346452', telefon: '501 087 5906', iseGiris: '2025-02-28', maas: '₺11,800', iban: 'TR34 0006 2000 5300 0006 6400 19' },
  { ad: 'KEFAYET', sube: 'demetevler', rol: 'usta', telefon: '530 600 0686' },
  { ad: 'SEYMEN', sube: 'demetevler', rol: 'usta' }, // ➕
  { ad: 'YUSUF', sube: 'demetevler', rol: 'usta' }, // ➕
  { ad: 'HALİL İBRAHİM KIZILIRMAK', sube: 'demetevler', rol: 'tezgahtar', izinGunu: 'Pazar', not: 'OFİS', tcKimlik: '28280097848', telefon: '543 478 0640', iseGiris: '2025-01-28', maas: '₺11,800' },
  { ad: 'ZARİFE ŞEVVAL DAĞ', sube: 'demetevler', rol: 'tezgahtar', izinGunu: 'Perşembe', tcKimlik: '12208273544', telefon: '5344534920', iseGiris: '2026-02-01', maas: '₺11,800', iban: 'TR 6500 0100 9010 55087290 5001' },
  { ad: 'CİHAN BOZKURT', sube: 'demetevler', rol: 'tezgahtar', tcKimlik: '17158369910', telefon: '544 149 6536', iseGiris: '2024-11-27', maas: '₺11,800', iban: 'TR04 0001 0022 0195 7900 5450 01' },
  { ad: 'MELEK KARTAL', sube: 'demetevler', rol: 'tezgahtar', not: 'OFİS', tcKimlik: '10291274950', telefon: '505 716 2370', iseGiris: '2026-02-07', maas: '₺11,800', iban: 'TR31 0006 2001 3610 0006 6608 47' },
  { ad: 'BATUHAN YILDIZ', sube: 'demetevler', rol: 'tezgahtar', not: 'OFİS', tcKimlik: '15235449104', telefon: '552 836 8473', iseGiris: '2025-10-08', maas: '₺11,800', iban: 'TR69 0006 2001 0820 0006 8660 34' },
  { ad: 'FATMA', sube: 'demetevler', rol: 'tezgahtar', izinGunu: 'Cuma, Cumartesi, Pazar' }, // ➕
  { ad: 'GİZEM', sube: 'demetevler', rol: 'tezgahtar', izinGunu: 'Pazar' }, // ➕
  { ad: 'KEMAL', sube: 'demetevler', rol: 'tezgahtar', izinGunu: 'Çarşamba' }, // ➕

  // ---- BAHÇELİEVLER ----
  { ad: 'AYHAN', sube: 'bahcelievler', rol: 'usta' }, // ➕
  { ad: 'FURKAN AKTAŞ', sube: 'bahcelievler', rol: 'tezgahtar', izinGunu: 'Çarşamba', tcKimlik: '12850251532', telefon: '538 652 13 18', iseGiris: '2025-06-18', maas: '₺11,800', iban: 'TR98 0006 7010 0000 0027 0480 45' },
  { ad: 'AYŞEGÜL KAYĞUSUZ', sube: 'bahcelievler', rol: 'tezgahtar', izinGunu: 'Salı', tcKimlik: '37868187086', telefon: '533 191 5298', iseGiris: '2025-01-29', maas: '₺11,800', iban: 'TR51 0004 6013 2588 8000 0291 96' },
  { ad: 'MUHAMMED EMİR ÖZKARA', sube: 'bahcelievler', rol: 'tezgahtar', not: 'IBAN: ÖNDER ÖZKARA', tcKimlik: '11332156372', telefon: '535 361 0614', iseGiris: '2025-10-23', maas: '₺786', iban: 'TR12 0004 6006 6188 8000 2286 77' },

  // ---- ETLİK ----
  { ad: 'BERKAY', sube: 'etlik', rol: 'usta', tcKimlik: '10195262534', telefon: '536 589 7331', iseGiris: '2025-06-27', maas: '₺11,800', iban: 'TR03 0001 0090 1072 1912 3050 01' },
  { ad: 'KAMİL', sube: 'etlik', rol: 'usta', not: 'IBAN: SONGÜL SARICI · Çıkış 20.02.2026 - ?', tcKimlik: '31906917680', telefon: '546 785 0385', iseGiris: '2024-10-10', maas: '₺786', iban: 'TR 5800 0100 0508 8561 4039 5001', yillik: 15, kullanilan: 15, kalan: 0 },
  { ad: 'FADİME ÖZDEMİR', sube: 'etlik', rol: 'tezgahtar', izinGunu: 'Salı', tcKimlik: '13732179104', telefon: '507 667 1222', iban: 'TR75 0006 4000 0014 3920 1801 80' },
  { ad: 'HATİCE KAYA', sube: 'etlik', rol: 'tezgahtar', izinGunu: 'Çarşamba', tcKimlik: '10780259338', telefon: '551 363 9302', iseGiris: '2023-05-29', maas: '₺11,800', iban: 'TR96 0006 2000 7740 0006 8699 01' },
  { ad: 'DUA', sube: 'etlik', rol: 'tezgahtar', izinGunu: 'Perşembe' }, // ➕
  { ad: 'MENNA', sube: 'etlik', rol: 'tezgahtar', izinGunu: 'Cuma' }, // ➕

  // ---- BATIKENT ----
  { ad: 'CESUR GÜLER', sube: 'batikent', rol: 'usta', izinGunu: 'Perşembe', tcKimlik: '36181962264', telefon: '541 589 8357', iseGiris: '2024-10-02', maas: '₺11,800', iban: 'TR68 0004 6005 2288 8000 120159' },
  { ad: 'ERKAN BATUR', sube: 'batikent', rol: 'usta', tcKimlik: '69925103500', telefon: '555 037 2610', iseGiris: '2024-10-04', maas: '₺11,800', iban: 'TR20 0001 0014 2792 0191 7950 01' },
  { ad: 'İSMAİL', sube: 'batikent', rol: 'usta', izinGunu: 'Çarşamba' }, // ➕
  { ad: 'NEZİRE ÜNVER (İNCİ)', sube: 'batikent', rol: 'tezgahtar', izinGunu: 'Salı', tcKimlik: '62779239050', telefon: '546 767 0735', iseGiris: '2025-12-08', maas: '₺11,800', iban: 'TR97 0001 0012 2595 3918 2450 02' },
  { ad: 'YEŞİM DAĞDELEN', sube: 'batikent', rol: 'tezgahtar', izinGunu: 'Pazartesi', not: 'Sabit sabahçı', tcKimlik: '36286753224', telefon: '545 687 4142', iban: 'TR72 0011 1000 0000 0050 2738 27' },
  { ad: 'İLAYDA YILDIZ', sube: 'batikent', rol: 'tezgahtar', tcKimlik: '10027081784', telefon: '542 490 4658', iban: 'TR74 0011 1000 0000 0161 3888 43' },
  { ad: 'BERAT', sube: 'batikent', rol: 'tezgahtar', izinGunu: 'Perşembe' }, // ➕
  { ad: 'MELEK', sube: 'batikent', rol: 'tezgahtar', izinGunu: 'Çarşamba' }, // ➕ (MELEK KARTAL'dan ayrı)
];
