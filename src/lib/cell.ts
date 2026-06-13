import type { Hucre, Rol, SubeOnayar } from '../types';
import {
  GRUP_RENK,
  GRUP_AD,
  DURUM_AD,
  DURUM_RENK,
  BASKA_SUBE_RENK,
  subeAd,
} from '../constants';
import { cozSaat, saatMetin } from './presets';

export interface HucreGorunum {
  ust?: string; // başka şube etiketi gibi üst satır
  metin: string; // ana metin (saat / durum)
  bg: string;
  border: string;
  fg: string;
  bos: boolean;
}

// Bir hücrenin ekranda nasıl gösterileceğini çözer (saat ön ayardan çözülür).
export function hucreGorunum(
  hucre: Hucre | undefined,
  rol: Rol,
  onayar: SubeOnayar,
): HucreGorunum {
  if (!hucre || hucre.tip === 'bos') {
    return { metin: '–', bg: 'transparent', border: '#222', fg: '#444', bos: true };
  }

  if (hucre.tip === 'grup' && hucre.grup) {
    const r = GRUP_RENK[hucre.grup];
    return {
      metin: saatMetin(cozSaat(onayar, rol, hucre.grup)),
      bg: r.bg,
      border: r.border,
      fg: r.fg,
      bos: false,
    };
  }

  if (hucre.tip === 'ozelSaat' && hucre.ozelSaat) {
    return {
      metin: hucre.ozelSaat,
      bg: '#191919',
      border: '#3a3a3a',
      fg: '#e8e8e8',
      bos: false,
    };
  }

  if (hucre.tip === 'durum' && hucre.durum) {
    const r = DURUM_RENK[hucre.durum];
    return {
      metin: DURUM_AD[hucre.durum],
      bg: r.bg,
      border: '#2a2a2a',
      fg: r.fg,
      bos: hucre.durum === 'bos',
    };
  }

  if (hucre.tip === 'baskaSube' && hucre.baskaSube) {
    const bs = hucre.baskaSube;
    let deg = '';
    if (bs.tip === 'grup' && bs.grup) {
      // başka şubenin saatini, o şubenin ön ayarına değil; burada sadece
      // grup adıyla gösteriyoruz çünkü hedef şube ön ayarı yüklü olmayabilir.
      deg = GRUP_AD[bs.grup];
    } else if (bs.tip === 'ozelSaat' && bs.ozelSaat) {
      deg = bs.ozelSaat;
    } else if (bs.tip === 'durum' && bs.durum) {
      deg = DURUM_AD[bs.durum];
    }
    return {
      ust: subeAd(bs.sube).toLocaleUpperCase('tr-TR'),
      metin: deg,
      bg: BASKA_SUBE_RENK.bg,
      border: BASKA_SUBE_RENK.border,
      fg: BASKA_SUBE_RENK.fg,
      bos: false,
    };
  }

  return { metin: '–', bg: 'transparent', border: '#222', fg: '#444', bos: true };
}

// PDF için düz metin (tek/iki satır) ve zemin rengi
export interface HucrePdf {
  metin: string;
  fill: [number, number, number];
}

export function hucrePdf(
  hucre: Hucre | undefined,
  rol: Rol,
  onayar: SubeOnayar,
): HucrePdf {
  if (!hucre || hucre.tip === 'bos') return { metin: '–', fill: [255, 255, 255] };

  if (hucre.tip === 'grup' && hucre.grup) {
    return {
      metin: saatMetin(cozSaat(onayar, rol, hucre.grup)),
      fill: GRUP_RENK[hucre.grup].pdf,
    };
  }
  if (hucre.tip === 'ozelSaat' && hucre.ozelSaat) {
    return { metin: hucre.ozelSaat, fill: [245, 245, 245] };
  }
  if (hucre.tip === 'durum' && hucre.durum) {
    return { metin: DURUM_AD[hucre.durum], fill: DURUM_RENK[hucre.durum].pdf };
  }
  if (hucre.tip === 'baskaSube' && hucre.baskaSube) {
    const bs = hucre.baskaSube;
    let deg = '';
    if (bs.tip === 'grup' && bs.grup) deg = GRUP_AD[bs.grup];
    else if (bs.tip === 'ozelSaat' && bs.ozelSaat) deg = bs.ozelSaat;
    else if (bs.tip === 'durum' && bs.durum) deg = DURUM_AD[bs.durum];
    return {
      metin: `${subeAd(bs.sube).toLocaleUpperCase('tr-TR')}\n${deg}`,
      fill: BASKA_SUBE_RENK.pdf,
    };
  }
  return { metin: '–', fill: [255, 255, 255] };
}

export function hucreBosMu(h: Hucre | undefined): boolean {
  return !h || h.tip === 'bos' || (h.tip === 'durum' && h.durum === 'bos');
}
