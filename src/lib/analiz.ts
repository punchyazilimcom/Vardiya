import type {
  Gun,
  Hucre,
  Personel,
  PersonelHaftaSatiri,
  Hafta,
  SubeKod,
} from '../types';
import { GUNLER } from '../constants';
import { hucreBosMu } from './cell';

// Bir hücrenin belirli bir gruba ait olup olmadığını (kendi şubesinde) söyler.
function hucreGrup(h: Hucre | undefined): 'acilis' | 'araci' | 'kapanis' | null {
  if (!h) return null;
  if (h.tip === 'grup' && h.grup) return h.grup;
  return null;
}

export interface GunUyari {
  gun: Gun;
  acilisUstaYok: boolean;
  kapanisTezgahYok: boolean;
}

// Kapsam kontrolü: her gün açılışta usta + kapanışta tezgahtar var mı?
export function gunUyarilari(
  hafta: Hafta | null,
  personeller: Personel[],
): Record<Gun, GunUyari> {
  const sonuc = {} as Record<Gun, GunUyari>;
  for (const g of GUNLER) {
    let acilisUsta = false;
    let kapanisTezgah = false;
    for (const p of personeller) {
      if (!p.aktif) continue;
      const satir = hafta?.hucreler?.[p.id];
      const h = satir?.[g.kod];
      const grup = hucreGrup(h);
      if (p.rol === 'usta' && grup === 'acilis') acilisUsta = true;
      if (p.rol === 'tezgahtar' && grup === 'kapanis') kapanisTezgah = true;
    }
    sonuc[g.kod] = {
      gun: g.kod,
      acilisUstaYok: !acilisUsta,
      kapanisTezgahYok: !kapanisTezgah,
    };
  }
  return sonuc;
}

export interface PersonelOzet {
  calismaGun: number;
  izinGun: number;
}

// Haftalık özet: çalışma günü (dolu vardiya) ve izin sayısı.
export function personelOzet(satir: PersonelHaftaSatiri | undefined): PersonelOzet {
  let calisma = 0;
  let izin = 0;
  for (const g of GUNLER) {
    const h = satir?.[g.kod];
    if (!h || hucreBosMu(h)) continue;
    if (h.tip === 'durum' && (h.durum === 'izinli' || h.durum === 'senelik')) {
      izin += 1;
    } else if (h.tip === 'durum' && h.durum === 'bayram') {
      // bayram = çalışma sayılmaz, izin de değil
    } else {
      calisma += 1;
    }
  }
  return { calismaGun: calisma, izinGun: izin };
}

export interface BaskaSubeGelen {
  personelAd: string;
  rol: string;
  gun: Gun;
  gunAd: string;
  kaynakSube: SubeKod; // gelen personelin asıl şubesi (görüntülenen şube)
  deger: string;
}

// Başka şubeden gelenler: TÜM şubelerin bu haftaki gridlerinde, hedefi
// `hedefSube` olan `baskaSube` hücrelerini topla.
export function baskaSubedenGelenler(
  hedefSube: SubeKod,
  // her şube için: { sube, hafta, personeller }
  veriler: {
    sube: SubeKod;
    hafta: Hafta | null;
    personeller: Personel[];
  }[],
  cozDeger: (h: Hucre) => string,
): BaskaSubeGelen[] {
  const list: BaskaSubeGelen[] = [];
  for (const v of veriler) {
    if (v.sube === hedefSube || !v.hafta) continue;
    for (const p of v.personeller) {
      const satir = v.hafta.hucreler?.[p.id];
      if (!satir) continue;
      for (const g of GUNLER) {
        const h = satir[g.kod];
        if (h?.tip === 'baskaSube' && h.baskaSube?.sube === hedefSube) {
          list.push({
            personelAd: p.ad,
            rol: p.rol,
            gun: g.kod,
            gunAd: g.ad,
            kaynakSube: v.sube,
            deger: cozDeger(h),
          });
        }
      }
    }
  }
  return list;
}
