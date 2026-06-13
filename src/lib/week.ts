// ISO hafta yardımcıları. Hafta başı Pazartesi. Anahtar: "2026-W21".

const DAY_MS = 86400000;

function atMidnight(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Verilen tarihin haftasının Pazartesi'sini döndürür.
export function haftaBasi(date: Date): Date {
  const d = atMidnight(date);
  const gun = d.getDay(); // 0=Pazar ... 6=Cumartesi
  const fark = gun === 0 ? -6 : 1 - gun; // Pazartesi'ye kaydır
  return new Date(d.getTime() + fark * DAY_MS);
}

// ISO 8601 hafta numarası ve yıl.
export function isoHaftaAnahtar(date: Date): string {
  const d = atMidnight(date);
  // ISO: Perşembe'ye göre yıl belirlenir.
  const target = new Date(d);
  const dayNr = (d.getDay() + 6) % 7; // Pazartesi=0
  target.setDate(target.getDate() - dayNr + 3); // o haftanın Perşembe'si
  const yil = target.getFullYear();
  const ilkPersembe = new Date(yil, 0, 4);
  const ilkDayNr = (ilkPersembe.getDay() + 6) % 7;
  ilkPersembe.setDate(ilkPersembe.getDate() - ilkDayNr + 3);
  const hafta =
    1 +
    Math.round(
      (target.getTime() - ilkPersembe.getTime()) / (7 * DAY_MS),
    );
  return `${yil}-W${String(hafta).padStart(2, '0')}`;
}

export function isoTarih(date: Date): string {
  const d = atMidnight(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const g = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${g}`;
}

export interface HaftaAralik {
  anahtar: string;
  pazartesi: Date;
  pazar: Date;
  baslangicISO: string;
  bitisISO: string;
}

export function haftaAralik(date: Date): HaftaAralik {
  const pzt = haftaBasi(date);
  const paz = new Date(pzt.getTime() + 6 * DAY_MS);
  return {
    anahtar: isoHaftaAnahtar(pzt),
    pazartesi: pzt,
    pazar: paz,
    baslangicISO: isoTarih(pzt),
    bitisISO: isoTarih(paz),
  };
}

export function haftaKaydir(date: Date, haftaSayisi: number): Date {
  const pzt = haftaBasi(date);
  return new Date(pzt.getTime() + haftaSayisi * 7 * DAY_MS);
}

const AYLAR = [
  'Oca',
  'Şub',
  'Mar',
  'Nis',
  'May',
  'Haz',
  'Tem',
  'Ağu',
  'Eyl',
  'Eki',
  'Kas',
  'Ara',
];

export function tarihEtiket(d: Date): string {
  return `${d.getDate()} ${AYLAR[d.getMonth()]}`;
}

// "18 May – 24 May 2026" gibi
export function aralikEtiket(a: HaftaAralik): string {
  return `${tarihEtiket(a.pazartesi)} – ${tarihEtiket(a.pazar)} ${a.pazar.getFullYear()}`;
}

// Hücre başlığı için gün tarihleri
export function gunTarihleri(date: Date): Date[] {
  const pzt = haftaBasi(date);
  return Array.from({ length: 7 }, (_, i) => new Date(pzt.getTime() + i * DAY_MS));
}
