import type {
  Hafta,
  Personel,
  SubeKod,
  Gun,
  Hucre,
  Grup,
  Rol,
  SubeOnayar,
  PersonelHaftaSatiri,
} from '../types';
import { GUNLER } from '../constants';
import { cozSaat } from './presets';
import { haftaAralik } from './week';

// ---- Kapsam hedefleri (kullanıcı kuralları) ----
export interface KapsamHedef {
  acilis: number;
  araci: number;
  kapanis: number;
}

export function hedefAl(sube: SubeKod, rol: Rol): KapsamHedef {
  if (rol === 'tezgahtar') return { acilis: 2, araci: 0, kapanis: 2 };
  // usta
  return sube === 'bahcelievler'
    ? { acilis: 1, araci: 0, kapanis: 1 }
    : { acilis: 1, araci: 1, kapanis: 1 };
}

// ---- Yardımcılar ----
function normTr(s: string): string {
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

const GUN_KOD: Record<string, Gun> = {};
GUNLER.forEach((g) => {
  GUN_KOD[normTr(g.ad)] = g.kod;
});

function izinGunleri(text?: string): Gun[] {
  if (!text) return [];
  return text
    .split(/[,;/]|\bve\b/i)
    .map((s) => GUN_KOD[normTr(s)])
    .filter(Boolean) as Gun[];
}

function fullSaat(onayar: SubeOnayar, rol: Rol): string {
  return `${cozSaat(onayar, rol, 'acilis').baslangic}-FULL`;
}

// Usta için: haftanın bir günü (Cumartesi) kapanış ustasına +1 saat.
const EK_SAAT_GUN: Gun = 'cumartesi';

function saatArti(hhmm: string, saat: number): string {
  const m = hhmm.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return hhmm; // KAPANIŞ/FULL gibi metinlerde dokunma
  const h = (Number(m[1]) + saat) % 24;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}

// Usta kapanış hücresi, Cumartesi ise +1 saatlik özel saat üretir.
function ustaKapanisCumartesi(onayar: SubeOnayar): string | null {
  const ka = cozSaat(onayar, 'usta', 'kapanis');
  if (!/^\d{1,2}:\d{2}$/.test(ka.bitis)) return null;
  return `${ka.baslangic}-${saatArti(ka.bitis, 1)}`;
}

const TURLER: Grup[] = ['acilis', 'araci', 'kapanis'];

// Bir satırın geçen haftaki baskın grubunu bul (rotasyon için).
function baskinGrup(satir: PersonelHaftaSatiri | undefined): Grup | null {
  if (!satir) return null;
  const say: Record<Grup, number> = { acilis: 0, araci: 0, kapanis: 0 };
  for (const g of GUNLER) {
    const h = satir[g.kod];
    if (h?.tip === 'grup' && h.grup) say[h.grup]++;
  }
  let best: Grup | null = null;
  let bestN = 0;
  for (const k of TURLER) {
    if (say[k] > bestN) {
      bestN = say[k];
      best = k;
    }
  }
  return best;
}

// Bu haftanın baz grubu: geçen haftadan döndür; yoksa sıraya göre tohumla.
function bazGrup(
  onceki: Grup | null,
  rol: Rol,
  sube: SubeKod,
  idx: number,
): Grup {
  const ustaUclu = rol === 'usta' && sube !== 'bahcelievler';
  if (onceki == null) {
    if (ustaUclu) return TURLER[idx % 3];
    return idx % 2 === 0 ? 'acilis' : 'kapanis';
  }
  if (ustaUclu) {
    const i = TURLER.indexOf(onceki);
    return TURLER[(i + 1) % 3];
  }
  // tezgah veya bahçelievler usta: açılış↔kapanış
  return onceki === 'acilis' ? 'kapanis' : 'acilis';
}

// Bir hücrenin "müsait değil" (izin/senelik/bayram) durumunu söyler.
function izinDurumMu(h: Hucre | undefined): boolean {
  return (
    h?.tip === 'durum' &&
    (h.durum === 'izinli' || h.durum === 'senelik' || h.durum === 'bayram' || h.durum === 'hk')
  );
}

// Önceden elle yazılmış FULL (hem açılış hem kapanış) hücresi mi?
function elleFullMu(h: Hucre | undefined): boolean {
  if (h?.tip === 'durum' && h.durum === 'full') return true;
  if (h?.tip === 'ozelSaat' && h.ozelSaat && /FULL/i.test(h.ozelSaat)) return true;
  return false;
}

export interface DoldurSonuc {
  hafta: Hafta;
  uyarilar: string[];
}

interface GunAtama {
  pid: string;
  grup: Grup;
  full: boolean;
  kilitli: boolean; // elle ayarlanmış, dokunma
}

// ---- ANA MOTOR ----
export function otomatikDoldur(opts: {
  sube: SubeKod;
  tarih: Date;
  personeller: Personel[]; // aktifler
  mevcut: Hafta | null;
  onceki: Hafta | null;
  onayar: SubeOnayar;
}): DoldurSonuc {
  const { sube, tarih, personeller, mevcut, onceki, onayar } = opts;
  const a = haftaAralik(tarih);
  const uyarilar: string[] = [];

  // Snapshot ve satır meta korunur
  const snap: Hafta['personelSnapshot'] = {};
  personeller.forEach((p) => (snap[p.id] = { ad: p.ad, rol: p.rol, sira: p.sira }));

  const yeniHucreler: Hafta['hucreler'] = {};

  // Her personel için baz grup (rotasyon)
  const ustalar = personeller.filter((p) => p.rol === 'usta');
  const tezgahlar = personeller.filter((p) => p.rol === 'tezgahtar');
  const bazMap = new Map<string, Grup>();
  [ustalar, tezgahlar].forEach((liste) => {
    liste.forEach((p, idx) => {
      const onc = baskinGrup(onceki?.hucreler?.[p.id]);
      bazMap.set(p.id, bazGrup(onc, p.rol, sube, idx));
    });
  });

  // Hafta boyunca FULL yükünü dağıtmak için sayaç
  const fullYuk = new Map<string, number>();
  personeller.forEach((p) => fullYuk.set(p.id, 0));

  // Satır iskeleti (izinGunu/not korunur)
  for (const p of personeller) {
    const eski = mevcut?.hucreler?.[p.id];
    yeniHucreler[p.id] = {
      izinGunu: eski?.izinGunu ?? p.izinGunu ?? '',
      not: eski?.not ?? p.not ?? '',
    };
  }

  for (const gun of GUNLER) {
    // Rol bazında ayrı kapsam
    for (const rol of ['usta', 'tezgahtar'] as Rol[]) {
      const liste = rol === 'usta' ? ustalar : tezgahlar;
      const hedef = hedefAl(sube, rol);
      const atamalar: GunAtama[] = [];

      for (const p of liste) {
        const eskiH = mevcut?.hucreler?.[p.id]?.[gun.kod];
        const izinGun = izinGunleri(yeniHucreler[p.id].izinGunu);

        // 1) Korunan izin/durum
        if (izinDurumMu(eskiH)) {
          yeniHucreler[p.id][gun.kod] = eskiH!;
          continue;
        }
        // 2) İzin günü → izinli
        if (izinGun.includes(gun.kod)) {
          yeniHucreler[p.id][gun.kod] = { tip: 'durum', durum: 'izinli' };
          continue;
        }
        // 3) Elle FULL → kilitli, hem açılış hem kapanış say
        if (elleFullMu(eskiH)) {
          atamalar.push({ pid: p.id, grup: 'acilis', full: true, kilitli: true });
          continue;
        }
        // 4) Başka şube görevlendirmesi → koru, kapsama sayma
        if (eskiH?.tip === 'baskaSube') {
          yeniHucreler[p.id][gun.kod] = eskiH;
          continue;
        }
        // 5) Otomatik atanabilir → baz grubu
        atamalar.push({ pid: p.id, grup: bazMap.get(p.id)!, full: false, kilitli: false });
      }

      // ---- Kapsam sayaçları (FULL hem açılış hem kapanış) ----
      const acilisSay = () => atamalar.filter((x) => x.grup === 'acilis' || x.full).length;
      const kapanisSay = () => atamalar.filter((x) => x.grup === 'kapanis' || x.full).length;
      const araciSay = () => atamalar.filter((x) => x.grup === 'araci' && !x.full).length;

      const enAzYuklu = (aday: GunAtama[]) =>
        aday.sort((m, n) => (fullYuk.get(m.pid)! - fullYuk.get(n.pid)!))[0];

      // Açılış eksikse: bir kapanışçıyı FULL yap
      let guard = 0;
      while (acilisSay() < hedef.acilis && guard++ < 20) {
        const aday = atamalar.filter((x) => !x.full && !x.kilitli && x.grup === 'kapanis');
        const sec = aday.length ? enAzYuklu(aday) : atamalar.find((x) => !x.full && !x.kilitli);
        if (!sec) break;
        sec.full = true;
        fullYuk.set(sec.pid, fullYuk.get(sec.pid)! + 1);
      }
      // Kapanış eksikse: bir açılışçıyı FULL yap
      guard = 0;
      while (kapanisSay() < hedef.kapanis && guard++ < 20) {
        const aday = atamalar.filter((x) => !x.full && !x.kilitli && x.grup === 'acilis');
        const sec = aday.length ? enAzYuklu(aday) : atamalar.find((x) => !x.full && !x.kilitli);
        if (!sec) break;
        sec.full = true;
        fullYuk.set(sec.pid, fullYuk.get(sec.pid)! + 1);
      }
      // Aracı eksikse: fazlalık olan gruptan birini aracıya kaydır
      guard = 0;
      while (hedef.araci > 0 && araciSay() < hedef.araci && guard++ < 20) {
        const acFazla = acilisSay() > hedef.acilis;
        const kaFazla = kapanisSay() > hedef.kapanis;
        let sec: GunAtama | undefined;
        if (kaFazla) sec = atamalar.find((x) => !x.full && !x.kilitli && x.grup === 'kapanis');
        if (!sec && acFazla) sec = atamalar.find((x) => !x.full && !x.kilitli && x.grup === 'acilis');
        if (!sec) sec = atamalar.find((x) => !x.full && !x.kilitli && x.grup !== 'araci');
        if (!sec) break;
        sec.grup = 'araci';
      }

      // ---- Hücreleri yaz ----
      for (const at of atamalar) {
        if (at.kilitli) {
          // elle FULL hücresini olduğu gibi bırak
          const eskiH = mevcut?.hucreler?.[at.pid]?.[gun.kod];
          yeniHucreler[at.pid][gun.kod] = eskiH ?? {
            tip: 'ozelSaat',
            ozelSaat: fullSaat(onayar, rol),
          };
          continue;
        }
        if (at.full) {
          yeniHucreler[at.pid][gun.kod] = { tip: 'ozelSaat', ozelSaat: fullSaat(onayar, rol) };
        } else if (rol === 'usta' && gun.kod === EK_SAAT_GUN && at.grup === 'kapanis') {
          // Cumartesi kapanış ustasına +1 saat (kapsam yine "kapanış" sayılır)
          const ek = ustaKapanisCumartesi(onayar);
          yeniHucreler[at.pid][gun.kod] = ek
            ? { tip: 'ozelSaat', ozelSaat: ek }
            : { tip: 'grup', grup: at.grup };
        } else {
          yeniHucreler[at.pid][gun.kod] = { tip: 'grup', grup: at.grup };
        }
      }

      // ---- Uyarı: hedef hâlâ tutmuyorsa ----
      if (acilisSay() < hedef.acilis)
        uyarilar.push(`${gun.ad}: ${rolAd(rol)} açılış ${acilisSay()}/${hedef.acilis} (personel yetersiz)`);
      if (kapanisSay() < hedef.kapanis)
        uyarilar.push(`${gun.ad}: ${rolAd(rol)} kapanış ${kapanisSay()}/${hedef.kapanis} (personel yetersiz)`);
      if (hedef.araci > 0 && araciSay() < hedef.araci)
        uyarilar.push(`${gun.ad}: ${rolAd(rol)} aracı ${araciSay()}/${hedef.araci} (personel yetersiz)`);
    }
  }

  // Rotasyon hatırlatması: geçen haftayla aynı baskın grupta kalanlar
  if (onceki) {
    for (const p of personeller) {
      const onc = baskinGrup(onceki.hucreler?.[p.id]);
      const yeni = baskinGrup(yeniHucreler[p.id]);
      if (onc && yeni && onc === yeni && !(p.rol === 'usta' && sube !== 'bahcelievler')) {
        uyarilar.push(`${p.ad}: geçen hafta da ${grupAd(onc)} idi — rotasyon dönmedi (izin/eksik personel olabilir).`);
      }
    }
  }

  return {
    hafta: {
      baslangic: a.baslangicISO,
      bitis: a.bitisISO,
      hucreler: yeniHucreler,
      personelSnapshot: snap,
    },
    uyarilar,
  };
}

function rolAd(r: Rol): string {
  return r === 'usta' ? 'Usta' : 'Tezgah';
}
function grupAd(g: Grup): string {
  return g === 'acilis' ? 'açılış' : g === 'araci' ? 'aracı' : 'kapanış';
}

// ---- Kapsam denetimi (grid rozetleri + kurallar paneli için) ----
export interface GunKapsam {
  gun: Gun;
  eksikler: string[]; // insan-okur kısa açıklamalar
}

function grupSay(
  hafta: Hafta | null,
  liste: Personel[],
  gun: Gun,
  rol: Rol,
  onayar: SubeOnayar,
): { acilis: number; araci: number; kapanis: number } {
  let ac = 0,
    ar = 0,
    ka = 0;
  const sAc = cozSaat(onayar, rol, 'acilis').baslangic;
  const sAr = cozSaat(onayar, rol, 'araci').baslangic;
  const sKa = cozSaat(onayar, rol, 'kapanis').baslangic;
  for (const p of liste) {
    const h = hafta?.hucreler?.[p.id]?.[gun];
    if (!h) continue;
    const full =
      (h.tip === 'durum' && h.durum === 'full') ||
      (h.tip === 'ozelSaat' && !!h.ozelSaat && /FULL/i.test(h.ozelSaat));
    if (full) {
      ac++;
      ka++;
      continue;
    }
    if (h.tip === 'grup' && h.grup) {
      if (h.grup === 'acilis') ac++;
      else if (h.grup === 'araci') ar++;
      else ka++;
    } else if (h.tip === 'ozelSaat' && h.ozelSaat) {
      // Özel saat (örn. +1 saatlik kapanış) başlangıcına göre gruba say
      const start = h.ozelSaat.split('-')[0].trim();
      if (start === sAc) ac++;
      else if (start === sKa) ka++;
      else if (start === sAr) ar++;
    }
  }
  return { acilis: ac, araci: ar, kapanis: ka };
}

export function gunKapsam(
  sube: SubeKod,
  hafta: Hafta | null,
  personeller: Personel[],
  onayar: SubeOnayar,
): Record<Gun, GunKapsam> {
  const ustalar = personeller.filter((p) => p.aktif && p.rol === 'usta');
  const tezgahlar = personeller.filter((p) => p.aktif && p.rol === 'tezgahtar');
  const sonuc = {} as Record<Gun, GunKapsam>;
  for (const g of GUNLER) {
    const eksikler: string[] = [];
    for (const [rol, liste] of [
      ['usta', ustalar],
      ['tezgahtar', tezgahlar],
    ] as [Rol, Personel[]][]) {
      if (liste.length === 0) continue;
      const hedef = hedefAl(sube, rol);
      const say = grupSay(hafta, liste, g.kod, rol, onayar);
      if (say.acilis < hedef.acilis)
        eksikler.push(`${rolAd(rol)} açılış ${say.acilis}/${hedef.acilis}`);
      if (say.kapanis < hedef.kapanis)
        eksikler.push(`${rolAd(rol)} kapanış ${say.kapanis}/${hedef.kapanis}`);
      if (hedef.araci > 0 && say.araci < hedef.araci)
        eksikler.push(`${rolAd(rol)} aracı ${say.araci}/${hedef.araci}`);
    }
    sonuc[g.kod] = { gun: g.kod, eksikler };
  }
  return sonuc;
}
