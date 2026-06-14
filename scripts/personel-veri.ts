/**
 * Personel kadro verisi (tek doğruluk kaynağı).
 * Hem seed-personel.ts (Firestore'a yükler) hem ornek-excel.ts (örnek dışa
 * aktarma) bu listeyi kullanır. Kaynak: eski vardiya kadrosu referans;
 * özlük (telefon/IBAN/TC/işe giriş) PERSONELLER.xlsx'ten korunur.
 */
export type Rol = 'usta' | 'tezgahtar';

export interface Kisi {
  ad: string;
  rol: Rol;
  izinGunu?: string;
  not?: string;
  telefon?: string;
  iban?: string;
  iseGiris?: string; // ISO "2024-09-02"
  tcKimlik?: string;
  maas?: string;
  izinHakki?: string;
}

// ➕ = eski listede vardı, özlüğü yok (sonra doldurulacak).
export const VERI: Record<string, Kisi[]> = {
  demetevler: [
    { ad: 'SELÇUK BAŞARAN', rol: 'usta', telefon: '537 221 5025', iban: 'TR95 0001 0009 0856 3728 7150 02', tcKimlik: '17227017636', iseGiris: '2024-09-02' },
    { ad: 'HAKKI SARIKAŞ', rol: 'usta', not: 'IBAN sahibi: FATMA SARIKAŞ', telefon: '530 307 6299', iban: 'TR29 0001 2009 3880 0001 0289 49', tcKimlik: '19286331340', iseGiris: '2024-11-27' },
    { ad: 'ERCAN DEMİR', rol: 'usta', telefon: '535 033 0184', iban: 'TR28 0006 2000 5110 0006 8356 77', tcKimlik: '34453314872', iseGiris: '2026-01-23' },
    { ad: 'HAŞİM ZEYREK', rol: 'usta', telefon: '536 224 9312', iban: 'TR28 0001 0090 1018 0632 4050 01', tcKimlik: '10346119892', iseGiris: '2025-12-04' },
    { ad: 'ASIM', rol: 'usta', telefon: '534 784 6324', tcKimlik: '14065993580' },
    { ad: 'MEHMET SARI', rol: 'usta', telefon: '538 845 15 91', iban: 'TR38 0006 2000 5330 0006 6481 77', tcKimlik: '11809049428', iseGiris: '2024-10-02' },
    { ad: 'ALPARSLAN', rol: 'usta', telefon: '501 087 5906', iban: 'TR34 0006 2000 5300 0006 6400 19', tcKimlik: '10090346452', iseGiris: '2025-02-28' },
    { ad: 'KEFAYET', rol: 'usta', telefon: '530 600 0686' },
    { ad: 'SEYMEN', rol: 'usta' }, // ➕
    { ad: 'YUSUF', rol: 'usta' }, // ➕
    { ad: 'HALİL İBRAHİM KIZILIRMAK', rol: 'tezgahtar', izinGunu: 'Pazar', not: 'OFİS', telefon: '543 478 0640', tcKimlik: '28280097848', iseGiris: '2025-01-28' },
    { ad: 'ZARİFE ŞEVVAL DAĞ', rol: 'tezgahtar', izinGunu: 'Perşembe', telefon: '5344534920', iban: 'TR 6500 0100 9010 55087290 5001', tcKimlik: '12208273544', iseGiris: '2026-02-01' },
    { ad: 'CİHAN BOZKURT', rol: 'tezgahtar', telefon: '544 149 6536', iban: 'TR04 0001 0022 0195 7900 5450 01', tcKimlik: '17158369910', iseGiris: '2024-11-27' },
    { ad: 'MELEK KARTAL', rol: 'tezgahtar', not: 'OFİS', telefon: '505 716 2370', iban: 'TR31 0006 2001 3610 0006 6608 47', tcKimlik: '10291274950', iseGiris: '2026-02-07' },
    { ad: 'BATUHAN YILDIZ', rol: 'tezgahtar', not: 'OFİS', telefon: '552 836 8473', iban: 'TR69 0006 2001 0820 0006 8660 34', tcKimlik: '15235449104', iseGiris: '2025-10-08' },
    { ad: 'FATMA', rol: 'tezgahtar', izinGunu: 'Cuma, Cumartesi, Pazar' }, // ➕
    { ad: 'GİZEM', rol: 'tezgahtar', izinGunu: 'Pazar' }, // ➕
    { ad: 'KEMAL', rol: 'tezgahtar', izinGunu: 'Çarşamba' }, // ➕
  ],
  bahcelievler: [
    { ad: 'AYHAN', rol: 'usta' }, // ➕
    { ad: 'FURKAN AKTAŞ', rol: 'tezgahtar', izinGunu: 'Çarşamba', telefon: '538 652 13 18', iban: 'TR98 0006 7010 0000 0027 0480 45', tcKimlik: '12850251532', iseGiris: '2025-06-18' },
    { ad: 'AYŞEGÜL KAYĞUSUZ', rol: 'tezgahtar', izinGunu: 'Salı', telefon: '533 191 5298', iban: 'TR51 0004 6013 2588 8000 0291 96', tcKimlik: '37868187086', iseGiris: '2025-01-29' },
    { ad: 'MUHAMMED EMİR ÖZKARA', rol: 'tezgahtar', not: 'IBAN sahibi: ÖNDER ÖZKARA', telefon: '535 361 0614', iban: 'TR12 0004 6006 6188 8000 2286 77', tcKimlik: '11332156372', iseGiris: '2025-10-23' },
  ],
  etlik: [
    { ad: 'BERKAY', rol: 'usta', telefon: '536 589 7331', iban: 'TR03 0001 0090 1072 1912 3050 01', tcKimlik: '10195262534', iseGiris: '2025-06-27' },
    { ad: 'KAMİL', rol: 'usta', not: 'IBAN sahibi: SONGÜL SARICI', telefon: '546 785 0385', iban: 'TR 5800 0100 0508 8561 4039 5001', tcKimlik: '31906917680', iseGiris: '2024-10-10' },
    { ad: 'FADİME ÖZDEMİR', rol: 'tezgahtar', izinGunu: 'Salı', telefon: '507 667 1222', iban: 'TR75 0006 4000 0014 3920 1801 80', tcKimlik: '13732179104' },
    { ad: 'HATİCE KAYA', rol: 'tezgahtar', izinGunu: 'Çarşamba', telefon: '551 363 9302', iban: 'TR96 0006 2000 7740 0006 8699 01', tcKimlik: '10780259338', iseGiris: '2023-05-29' },
    { ad: 'DUA', rol: 'tezgahtar', izinGunu: 'Perşembe' }, // ➕
    { ad: 'MENNA', rol: 'tezgahtar', izinGunu: 'Cuma' }, // ➕
  ],
  batikent: [
    { ad: 'CESUR GÜLER', rol: 'usta', izinGunu: 'Perşembe', telefon: '541 589 8357', iban: 'TR68 0004 6005 2288 8000 120159', tcKimlik: '36181962264', iseGiris: '2024-10-02' },
    { ad: 'ERKAN BATUR', rol: 'usta', telefon: '555 037 2610', iban: 'TR20 0001 0014 2792 0191 7950 01', tcKimlik: '69925103500', iseGiris: '2024-10-04' },
    { ad: 'İSMAİL', rol: 'usta', izinGunu: 'Çarşamba' }, // ➕
    { ad: 'NEZİRE ÜNVER (İNCİ)', rol: 'tezgahtar', izinGunu: 'Salı', telefon: '546 767 0735', iban: 'TR97 0001 0012 2595 3918 2450 02', tcKimlik: '62779239050', iseGiris: '2025-12-08' },
    { ad: 'YEŞİM DAĞDELEN', rol: 'tezgahtar', izinGunu: 'Pazartesi', not: 'Sabit sabahçı', telefon: '545 687 4142', iban: 'TR72 0011 1000 0000 0050 2738 27', tcKimlik: '36286753224' },
    { ad: 'İLAYDA YILDIZ', rol: 'tezgahtar', telefon: '542 490 4658', iban: 'TR74 0011 1000 0000 0161 3888 43', tcKimlik: '10027081784' },
    { ad: 'BERAT', rol: 'tezgahtar', izinGunu: 'Perşembe' }, // ➕
    { ad: 'MELEK', rol: 'tezgahtar', izinGunu: 'Çarşamba' }, // ➕ yeni gelen (MELEK KARTAL'dan ayrı)
  ],
};
