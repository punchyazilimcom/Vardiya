import type {
  SubeKod,
  Gun,
  Grup,
  Durum,
  GrupPreset,
  SubeOnayar,
} from './types';

export interface SubeInfo {
  kod: SubeKod;
  ad: string;
  no: number;
}

// Kod sırasıyla
export const SUBELER: SubeInfo[] = [
  { kod: 'demetevler', ad: 'Demetevler', no: 1001 },
  { kod: 'bahcelievler', ad: 'Bahçelievler', no: 1002 },
  { kod: 'etlik', ad: 'Etlik', no: 1003 },
  { kod: 'batikent', ad: 'Batıkent', no: 1004 },
];

export const subeAd = (kod: SubeKod): string =>
  SUBELER.find((s) => s.kod === kod)?.ad ?? kod;

export const GUNLER: { kod: Gun; ad: string; kisa: string }[] = [
  { kod: 'pazartesi', ad: 'Pazartesi', kisa: 'PZT' },
  { kod: 'sali', ad: 'Salı', kisa: 'SAL' },
  { kod: 'carsamba', ad: 'Çarşamba', kisa: 'ÇAR' },
  { kod: 'persembe', ad: 'Perşembe', kisa: 'PER' },
  { kod: 'cuma', ad: 'Cuma', kisa: 'CUM' },
  { kod: 'cumartesi', ad: 'Cumartesi', kisa: 'CMT' },
  { kod: 'pazar', ad: 'Pazar', kisa: 'PAZ' },
];

export const GRUP_AD: Record<Grup, string> = {
  acilis: 'Açılış',
  araci: 'Aracı',
  kapanis: 'Kapanış',
};

// Grup renkleri — koyu zeminde okunur, sarı yalnız vurgu.
// { zemin (grid hücre), kenar, metin, pdf zemin (RGB) }
export const GRUP_RENK: Record<
  Grup,
  { bg: string; border: string; fg: string; pdf: [number, number, number] }
> = {
  // Açılış: soğuk mavi/teal
  acilis: { bg: '#13343b', border: '#2a6b78', fg: '#7fe3e3', pdf: [212, 234, 236] },
  // Aracı: mor/indigo
  araci: { bg: '#2a2350', border: '#5246a0', fg: '#b8aef5', pdf: [224, 220, 245] },
  // Kapanış: bordo/turuncu-kızıl
  kapanis: { bg: '#3a1f1a', border: '#8a4030', fg: '#f0a98c', pdf: [245, 222, 212] },
};

export const DURUM_AD: Record<Durum, string> = {
  izinli: 'İZİNLİ',
  senelik: 'SENELİK',
  bayram: 'BAYRAM',
  full: 'FULL',
  hk: 'H.K.',
  bos: '-',
};

export const DURUM_RENK: Record<
  Durum,
  { bg: string; fg: string; pdf: [number, number, number] }
> = {
  izinli: { bg: '#1c1c1c', fg: '#9a9a9a', pdf: [232, 232, 232] },
  senelik: { bg: '#1a2433', fg: '#8fb6e0', pdf: [221, 232, 245] },
  bayram: { bg: '#33261a', fg: '#e0b68f', pdf: [245, 235, 221] },
  full: { bg: '#2c2a14', fg: '#e7da6a', pdf: [247, 243, 200] },
  hk: { bg: '#1c1c1c', fg: '#7a7a7a', pdf: [235, 235, 235] },
  bos: { bg: 'transparent', fg: '#555', pdf: [255, 255, 255] },
};

// Çalışma zamanı durum renkleri (kullanıcı "Renk Ayarları"ndan değiştirebilir).
// Varsayılanların kopyası; Firestore'dan yüklenince güncellenir.
export type DurumRenkAyar = Partial<Record<Durum, { bg: string; fg: string }>>;

export const durumRenkAktif: Record<
  Durum,
  { bg: string; fg: string; pdf: [number, number, number] }
> = JSON.parse(JSON.stringify(DURUM_RENK));

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace('#', '');
  const n = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const num = parseInt(n, 16);
  if (Number.isNaN(num)) return [255, 255, 255];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function setTumDurumRenk(map: DurumRenkAyar) {
  (Object.keys(map) as Durum[]).forEach((d) => {
    const v = map[d];
    if (!v) return;
    durumRenkAktif[d] = {
      bg: v.bg,
      fg: v.fg,
      pdf: v.bg === 'transparent' ? [255, 255, 255] : hexToRgb(v.bg),
    };
  });
}

// Başka şube hücresi için çerçeve rengi (farklı çerçeve)
export const BASKA_SUBE_RENK = {
  bg: '#241a08',
  border: '#F4DF16',
  fg: '#f0d96a',
  pdf: [250, 246, 224] as [number, number, number],
  pdfBorder: [180, 150, 20] as [number, number, number],
};

// ---- Saat ön ayarları (seed varsayılanları) ----
// usta:   açılış 06:30-16:30 | aracı 08:00-18:00 | kapanış 09:30-19:30
// tezgah: açılış 07:00-17:30 | aracı 09:00-19:30 | kapanış 10:30-KAPANIŞ
export const GENEL_PRESET: GrupPreset = {
  usta: {
    acilis: { baslangic: '06:30', bitis: '16:30' },
    araci: { baslangic: '08:00', bitis: '18:00' },
    kapanis: { baslangic: '09:30', bitis: '19:30' },
  },
  tezgah: {
    acilis: { baslangic: '07:00', bitis: '17:30' },
    araci: { baslangic: '09:00', bitis: '19:30' },
    kapanis: { baslangic: '10:30', bitis: 'KAPANIŞ' },
  },
};

// BAHÇELİEVLER override:
// usta açılış 07:15-17:15 | tezgah açılış 08:00-18:00
export const BAHCELIEVLER_OVERRIDE: SubeOnayar['override'] = {
  usta: {
    acilis: { baslangic: '07:15', bitis: '17:15' },
  },
  tezgah: {
    acilis: { baslangic: '08:00', bitis: '18:00' },
  },
};

export const PIN_PATRON = '9999';
export const PIN_MUDUR = '1111';

// Müdür PIN'i ile giriş yapınca şube seçtirilir; her şubenin tek müdür PIN'i
// 1111 olduğundan giriş sonrası şube seçimi yapılır ve kilitlenir.
export const MARKA = {
  zemin: '#0D0D0D',
  kart: '#111111',
  sari: '#F4DF16',
};

// Build/sürüm damgası — hangi yapının yüklendiğini ekranda görmek için.
export const SURUM = 'b10-1957';
