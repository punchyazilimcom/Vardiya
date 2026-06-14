import * as XLSX from 'xlsx';
import type {
  SubeKod,
  Rol,
  Hucre,
  Durum,
  Personel,
  Hafta,
  SubeOnayar,
} from '../types';
import { SUBELER, subeAd, GUNLER, DURUM_AD } from '../constants';
import { cozSaat, saatMetin } from './presets';
import { hucrePdf } from './cell';
import { haftaAralik } from './week';

// ---- Yardımcılar ----
function norm(s: string): string {
  return (s || '')
    .toLocaleUpperCase('tr-TR')
    .replace(/İ/g, 'I')
    .replace(/Ş/g, 'S')
    .replace(/Ç/g, 'C')
    .replace(/Ğ/g, 'G')
    .replace(/Ü/g, 'U')
    .replace(/Ö/g, 'O')
    .trim();
}

function subeBul(metin: string): SubeKod | null {
  const n = norm(metin);
  if (n.startsWith('DEMETEVLER') || n.startsWith('DEMET')) return 'demetevler';
  if (n.startsWith('BAHCELIEVLER') || n.startsWith('BAHCELI') || n.startsWith('BAHCE'))
    return 'bahcelievler';
  if (n.startsWith('ETLIK')) return 'etlik';
  if (n.startsWith('BATIKENT') || n.startsWith('BATI')) return 'batikent';
  return null;
}

const DURUM_ANAHTAR: Record<string, Durum> = {
  IZINLI: 'izinli',
  IZIN: 'izinli',
  SENELIK: 'senelik',
  BAYRAM: 'bayram',
  FULL: 'full',
  MESAI: 'full',
  'H.K.': 'hk',
  HK: 'hk',
  'H K': 'hk',
};

const SAAT_RE = /(\d{1,2}[:.]\d{2})\s*[-–]\s*([\dKAPANIŞFULkapanışful:.]+)/;

// Bir hücre metnini Hucre'ye çevir.
export function metniHucreCoz(ham: string): Hucre {
  const metin = (ham || '').toString().trim();
  if (!metin || metin === '-' || metin === '–') return { tip: 'bos' };

  // Başka şube etiketi var mı? (örn "BATIKENT 08:00-18:00")
  const sube = subeBul(metin);
  if (sube) {
    // şube adını at, kalanı değer olarak çöz
    const kalan = metin.replace(/^[^\s]+\s*/, '').trim();
    const ic = metniHucreCozIc(kalan || metin);
    const baskaSube: Hucre['baskaSube'] = { sube, tip: 'ozelSaat' };
    if (ic.tip === 'durum' && ic.durum) {
      baskaSube.tip = 'durum';
      baskaSube.durum = ic.durum;
    } else if (ic.tip === 'ozelSaat' && ic.ozelSaat) {
      baskaSube.tip = 'ozelSaat';
      baskaSube.ozelSaat = ic.ozelSaat;
    } else {
      baskaSube.tip = 'ozelSaat';
      baskaSube.ozelSaat = kalan || metin;
    }
    return { tip: 'baskaSube', baskaSube };
  }
  return metniHucreCozIc(metin);
}

function metniHucreCozIc(metin: string): Hucre {
  const n = norm(metin);
  // Durum?
  for (const [anahtar, durum] of Object.entries(DURUM_ANAHTAR)) {
    if (n === anahtar) return { tip: 'durum', durum };
  }
  // Saat aralığı? (07:00-FULL dahil özel saat olarak)
  if (SAAT_RE.test(metin) || /KAPAN|FULL/i.test(metin)) {
    return { tip: 'ozelSaat', ozelSaat: metin.replace(/\s+/g, '') };
  }
  // İçinde durum geçiyorsa
  for (const [anahtar, durum] of Object.entries(DURUM_ANAHTAR)) {
    if (n.includes(anahtar)) return { tip: 'durum', durum };
  }
  // Tanınmadı → özel saat/serbest metin
  return { tip: 'ozelSaat', ozelSaat: metin };
}

// İçe aktarılan bir şube verisi
export interface ImportSube {
  sube: SubeKod;
  personeller: Personel[];
  hafta: Hafta;
}

// Bir hücre metnini, mümkünse gruba eşitleyerek çöz (renk için).
function hucreGrupEsle(h: Hucre, rol: Rol, onayar: SubeOnayar): Hucre {
  if (h.tip !== 'ozelSaat' || !h.ozelSaat) return h;
  const hedef = h.ozelSaat.replace(/\s+/g, '');
  for (const g of ['acilis', 'araci', 'kapanis'] as const) {
    const ps = saatMetin(cozSaat(onayar, rol, g)).replace(/\s+/g, '');
    if (norm(ps) === norm(hedef)) return { tip: 'grup', grup: g };
  }
  return h;
}

// Çalışma kitabını içe aktar. Her sayfa = bir şube.
export function iceAktar(
  buf: ArrayBuffer,
  tarih: Date,
  onayarlar: Record<SubeKod, SubeOnayar>,
): ImportSube[] {
  const wb = XLSX.read(buf, { type: 'array' });
  const a = haftaAralik(tarih);
  const sonuc: ImportSube[] = [];

  for (const sheetName of wb.SheetNames) {
    const sube = subeBul(sheetName);
    if (!sube) continue; // şube adı eşleşmeyen sayfaları atla
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, raw: false, defval: '' });

    const personeller: Personel[] = [];
    const hucreler: Hafta['hucreler'] = {};
    let aktifRol: Rol = 'usta';
    let sira = 0;

    for (const row of rows) {
      const adHam = (row[0] ?? '').toString().trim();
      if (!adHam) continue;
      const adNorm = norm(adHam);

      // Blok başlığı?
      if (adNorm.includes('USTA') && adHam.length < 14) {
        aktifRol = 'usta';
        continue;
      }
      if ((adNorm.includes('TEZGAH') || adNorm.includes('TEZGAHTAR')) && adHam.length < 16) {
        aktifRol = 'tezgahtar';
        continue;
      }
      // Başlık satırı (PERSONEL / PAZARTESI ...) atla
      if (adNorm === 'PERSONEL' || adNorm === 'AD' || adNorm === 'ISIM' || adNorm === 'AD SOYAD') {
        continue;
      }

      const id = 'imp_' + Math.random().toString(36).slice(2, 9);
      const izin = (row[9] ?? '').toString().trim();
      const not = (row[10] ?? '').toString().trim();
      const p: Personel = {
        id,
        ad: adHam,
        rol: aktifRol,
        sira: sira++,
        aktif: true,
        izinGunu: izin,
        not,
      };
      personeller.push(p);

      const satir: Hafta['hucreler'][string] = { izinGunu: izin, not };
      GUNLER.forEach((g, i) => {
        const cellMetin = (row[2 + i] ?? '').toString().trim(); // C..I
        const h = metniHucreCoz(cellMetin);
        if (h.tip !== 'bos') {
          satir[g.kod] = hucreGrupEsle(h, aktifRol, onayarlar[sube]);
        }
      });
      hucreler[id] = satir;
    }

    if (personeller.length === 0) continue;
    const snap: Hafta['personelSnapshot'] = {};
    personeller.forEach((p) => (snap[p.id] = { ad: p.ad, rol: p.rol, sira: p.sira }));

    sonuc.push({
      sube,
      personeller,
      hafta: {
        baslangic: a.baslangicISO,
        bitis: a.bitisISO,
        hucreler,
        personelSnapshot: snap,
        guncelleyen: 'excel-import',
        guncelTarih: new Date().toISOString(),
      },
    });
  }

  return sonuc;
}

// ---- Dışa aktar ----
export interface ExportSube {
  sube: SubeKod;
  personeller: Personel[];
  hafta: Hafta | null;
  onayar: SubeOnayar;
}

// ISO "2024-09-02" -> "02.09.2024"
function tarihTR(iso?: string): string {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
}

// Tüm şubelerin özlük bilgilerini tek "PERSONEL" sayfasında topla.
function ozlukSayfasi(wb: XLSX.WorkBook, veriler: ExportSube[]) {
  const basliklar = [
    'ŞUBE', 'AD SOYAD', 'GÖREV', 'İZİN GÜNÜ', 'İZİN HAKKI (gün)', 'MAAŞ',
    'TELEFON', 'IBAN', 'T.C. KİMLİK', 'İŞE GİRİŞ', 'DOĞUM', 'NOT',
  ];
  const aoa: (string | number)[][] = [basliklar];
  for (const v of veriler) {
    const liste = v.personeller
      .filter((p) => p.aktif)
      .slice()
      .sort((a, b) => a.sira - b.sira);
    for (const p of liste) {
      aoa.push([
        subeAd(v.sube).toLocaleUpperCase('tr-TR'),
        p.ad,
        p.rol === 'usta' ? 'USTA' : 'TEZGAH',
        p.izinGunu ?? '',
        p.izinHakki ?? '',
        p.maas ?? '',
        p.telefon ?? '',
        p.iban ?? '',
        p.tcKimlik ?? '',
        tarihTR(p.iseGiris),
        tarihTR(p.dogumTarihi),
        p.not ?? '',
      ]);
    }
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [
    { wch: 13 }, { wch: 24 }, { wch: 8 }, { wch: 16 }, { wch: 14 }, { wch: 10 },
    { wch: 15 }, { wch: 30 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'PERSONEL');
}

export function disaAktar(veriler: ExportSube[]): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const basliklar = ['PERSONEL', '', ...GUNLER.map((g) => g.ad), 'İZİN GÜNÜ', 'NOT'];

  for (const v of veriler) {
    const aoa: (string | number)[][] = [];
    aoa.push(basliklar);

    function blok(baslik: string, rol: Rol) {
      const liste = v.personeller.filter((p) => p.aktif && p.rol === rol);
      if (liste.length === 0) return;
      aoa.push([baslik]);
      for (const p of liste) {
        const satir = v.hafta?.hucreler?.[p.id];
        const gunler = GUNLER.map((g) => {
          const h = satir?.[g.kod];
          if (!h || h.tip === 'bos') return '';
          // baskaSube ise "ŞUBE deger" formatında düz metin
          if (h.tip === 'baskaSube' && h.baskaSube) {
            const bs = h.baskaSube;
            let d = '';
            if (bs.tip === 'durum' && bs.durum) d = DURUM_AD[bs.durum];
            else if (bs.tip === 'ozelSaat') d = bs.ozelSaat ?? '';
            else if (bs.tip === 'grup') d = saatMetin(cozSaat(v.onayar, p.rol, bs.grup!));
            return `${subeAd(bs.sube).toLocaleUpperCase('tr-TR')} ${d}`.trim();
          }
          return hucrePdf(h, p.rol, v.onayar).metin;
        });
        aoa.push([
          p.ad,
          '',
          ...gunler,
          satir?.izinGunu ?? p.izinGunu ?? '',
          satir?.not ?? p.not ?? '',
        ]);
      }
    }

    blok('USTALAR', 'usta');
    blok('TEZGAHTAR', 'tezgahtar');

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{ wch: 20 }, { wch: 3 }, ...GUNLER.map(() => ({ wch: 14 })), { wch: 16 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws, subeAd(v.sube).toLocaleUpperCase('tr-TR').slice(0, 31));
  }

  // Tüm şubelerin özlük bilgileri ayrı "PERSONEL" sayfasında
  ozlukSayfasi(wb, veriler);

  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

export const TUM_SUBELER = SUBELER.map((s) => s.kod);
