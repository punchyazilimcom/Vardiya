import { create } from 'zustand';
import type {
  Oturum,
  SubeKod,
  Personel,
  SubeOnayar,
  Hafta,
  Gun,
  Hucre,
  PersonelHaftaSatiri,
  RolYetki,
} from './types';
import {
  SUBELER,
  setTumDurumRenk,
  setTumGrupRenk,
  type DurumRenkAyar,
  type GrupRenkAyar,
} from './constants';
import { haftaAralik, haftaKaydir } from './lib/week';
import * as repo from './lib/repo';
import { otomatikDoldur as motorDoldur } from './lib/otomatik';
import { ensureAuth, authYenidenDene, authDurum } from './firebase';
import type { Unsubscribe } from 'firebase/firestore';

export type KayitDurumu = 'idle' | 'kaydediliyor' | 'kaydedildi' | 'hata';

interface State {
  oturum: Oturum | null;
  aktifSube: SubeKod;
  aktifTarih: Date;
  personeller: Personel[];
  onayar: SubeOnayar;
  hafta: Hafta | null;
  yukleniyor: boolean;
  kayitDurumu: KayitDurumu;
  taniUid: string | null; // teşhis: anonim giriş uid
  taniHata: string | null; // teşhis: son dinleyici hata kodu
  renkNesil: number; // durum renkleri değişince artar (yeniden render)

  girisYap: (yetki: RolYetki, sube: SubeKod | null) => void;
  cikis: () => void;
  setSube: (sube: SubeKod) => void;
  haftaIleri: () => void;
  haftaGeri: () => void;
  buHafta: () => void;
  yenidenBaglan: () => void;

  hucreYaz: (personelId: string, gun: Gun, hucre: Hucre) => void;
  satirAlanYaz: (personelId: string, alan: 'izinGunu' | 'not', deger: string) => void;
  geceniHaftayiKopyala: () => Promise<boolean>;
  haftayiOtomatikDoldur: () => Promise<string[]>;

  kaydetOnayar: (o: SubeOnayar) => Promise<void>;
  kaydetPersonel: (p: Personel) => Promise<void>;
  silPersonel: (id: string) => Promise<void>;
  yenidenSirala: (sirali: Personel[]) => Promise<void>;
  personeleSubeEkle: (
    hedefSube: SubeKod,
    p: Personel,
    tasi: boolean,
    kaynakSube?: SubeKod,
  ) => Promise<void>;
  kaydetDurumRenkAyar: (map: DurumRenkAyar) => Promise<void>;
  kaydetGrupRenkAyar: (map: GrupRenkAyar) => Promise<void>;
}

let unsubPersonel: Unsubscribe | null = null;
let unsubOnayar: Unsubscribe | null = null;
let unsubHafta: Unsubscribe | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let bekleyenHafta: { sube: SubeKod; iso: string } | null = null;
let aboneNesil = 0; // her aboneOl çağrısı için artan kuşak
let yenidenDeneme = 0; // hata sonrası yeniden bağlanma sayacı

function temizleAbonelikler() {
  unsubPersonel?.();
  unsubOnayar?.();
  unsubHafta?.();
  unsubPersonel = unsubOnayar = unsubHafta = null;
}

export const useStore = create<State>((set, get) => {
  // Aktif şube + hafta için Firestore aboneliklerini kurar.
  // Önce anonim giriş beklenir (dinleyiciler kimlik gelmeden kurulup
  // "permission-denied" ile ölmesin); hata olursa kimliği bekleyip yeniden bağlanır.
  function aboneOl() {
    temizleAbonelikler();
    const nesil = ++aboneNesil;
    const { aktifSube, aktifTarih } = get();
    const iso = haftaAralik(aktifTarih).anahtar;
    set({ yukleniyor: true });

    const onErr = (etiket: string) => (e: Error) => {
      const kod = (e as { code?: string }).code || e.message;
      console.warn(`[${etiket}] dinleyici hatası:`, kod);
      set({ taniHata: `${etiket}: ${kod}` });
      if (nesil !== aboneNesil || yenidenDeneme >= 5) return;
      yenidenDeneme++;
      ensureAuth().then(() => {
        setTimeout(() => {
          if (nesil === aboneNesil) aboneOl();
        }, 600);
      });
    };

    ensureAuth().then(() => {
      if (nesil !== aboneNesil) return; // bu arada şube/hafta değişti
      set({
        taniUid: authDurum.uid?.slice(0, 8) ?? null,
        taniHata: authDurum.hata ? `giriş: ${authDurum.hata}` : null,
      });
      unsubPersonel = repo.dinlePersonel(
        aktifSube,
        (liste) => {
          yenidenDeneme = 0;
          set({ personeller: liste, taniHata: null });
        },
        onErr('personel'),
      );
      unsubOnayar = repo.dinleOnayar(aktifSube, (o) => set({ onayar: o }), onErr('onayar'));
      unsubHafta = repo.dinleHafta(
        aktifSube,
        iso,
        (h) => {
          if (!bekleyenHafta) set({ hafta: h, yukleniyor: false });
          else set({ yukleniyor: false });
        },
        onErr('hafta'),
      );
    });
  }

  // Debounce'lu kayıt
  function planlaKayit() {
    const { aktifSube, aktifTarih } = get();
    const iso = haftaAralik(aktifTarih).anahtar;
    bekleyenHafta = { sube: aktifSube, iso };
    set({ kayitDurumu: 'kaydediliyor' });
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      const h = get().hafta;
      const hedef = bekleyenHafta;
      bekleyenHafta = null;
      if (!h || !hedef) return;
      try {
        await repo.kaydetHafta(hedef.sube, hedef.iso, {
          ...h,
          guncelleyen: get().oturum?.yetki ?? 'patron',
          guncelTarih: new Date().toISOString(),
        });
        set({ kayitDurumu: 'kaydedildi' });
        setTimeout(() => {
          if (get().kayitDurumu === 'kaydedildi') set({ kayitDurumu: 'idle' });
        }, 1800);
      } catch (e) {
        console.error('Hafta kaydı başarısız', e);
        set({ kayitDurumu: 'hata' });
      }
    }, 700);
  }

  // Boş hafta iskeleti oluştur (snapshot dahil).
  function bosHafta(): Hafta {
    const { aktifTarih, personeller } = get();
    const a = haftaAralik(aktifTarih);
    const snap: Hafta['personelSnapshot'] = {};
    for (const p of personeller) {
      snap[p.id] = { ad: p.ad, rol: p.rol, sira: p.sira };
    }
    return {
      baslangic: a.baslangicISO,
      bitis: a.bitisISO,
      hucreler: {},
      personelSnapshot: snap,
    };
  }

  return {
    oturum: null,
    aktifSube: SUBELER[0].kod,
    aktifTarih: new Date(),
    personeller: [],
    onayar: repo.varsayilanOnayar(SUBELER[0].kod),
    hafta: null,
    yukleniyor: false,
    kayitDurumu: 'idle',
    taniUid: null,
    taniHata: null,
    renkNesil: 0,

    girisYap: (yetki, sube) => {
      ensureAuth();
      const aktifSube = yetki === 'mudur' && sube ? sube : SUBELER[0].kod;
      set({
        oturum: { yetki, sube: yetki === 'mudur' ? sube : null },
        aktifSube,
      });
      aboneOl();
      // Renk ayarlarını yükle (durum + grup, genel ayar)
      ensureAuth()
        .then(() => Promise.all([repo.getDurumRenk(), repo.getGrupRenk()]))
        .then(([d, g]) => {
          if (d) setTumDurumRenk(d);
          if (g) setTumGrupRenk(g);
          if (d || g) set({ renkNesil: get().renkNesil + 1 });
        })
        .catch(() => {});
    },

    cikis: () => {
      temizleAbonelikler();
      set({ oturum: null, hafta: null, personeller: [] });
    },

    setSube: (sube) => {
      const { oturum } = get();
      if (oturum?.yetki === 'mudur' && oturum.sube !== sube) return; // kilitli
      set({ aktifSube: sube });
      aboneOl();
    },

    haftaIleri: () => {
      set({ aktifTarih: haftaKaydir(get().aktifTarih, 1) });
      aboneOl();
    },
    haftaGeri: () => {
      set({ aktifTarih: haftaKaydir(get().aktifTarih, -1) });
      aboneOl();
    },
    buHafta: () => {
      set({ aktifTarih: new Date() });
      aboneOl();
    },
    yenidenBaglan: () => {
      yenidenDeneme = 0;
      authYenidenDene().finally(() => aboneOl());
    },

    hucreYaz: (personelId, gun, hucre) => {
      const mevcut = get().hafta ?? bosHafta();
      const satir: PersonelHaftaSatiri = { ...(mevcut.hucreler[personelId] ?? {}) };
      satir[gun] = hucre;
      const yeni: Hafta = {
        ...mevcut,
        hucreler: { ...mevcut.hucreler, [personelId]: satir },
      };
      set({ hafta: yeni });
      planlaKayit();
    },

    satirAlanYaz: (personelId, alan, deger) => {
      const mevcut = get().hafta ?? bosHafta();
      const satir: PersonelHaftaSatiri = { ...(mevcut.hucreler[personelId] ?? {}) };
      satir[alan] = deger;
      const yeni: Hafta = {
        ...mevcut,
        hucreler: { ...mevcut.hucreler, [personelId]: satir },
      };
      set({ hafta: yeni });
      planlaKayit();
    },

    geceniHaftayiKopyala: async () => {
      const { aktifSube, aktifTarih } = get();
      const oncekiTarih = haftaKaydir(aktifTarih, -1);
      const oncekiIso = haftaAralik(oncekiTarih).anahtar;
      const onceki = await repo.getHafta(aktifSube, oncekiIso);
      if (!onceki) return false;
      const a = haftaAralik(aktifTarih);
      const yeni: Hafta = {
        baslangic: a.baslangicISO,
        bitis: a.bitisISO,
        hucreler: JSON.parse(JSON.stringify(onceki.hucreler)),
        personelSnapshot: onceki.personelSnapshot,
      };
      set({ hafta: yeni });
      await repo.kaydetHafta(aktifSube, a.anahtar, {
        ...yeni,
        guncelleyen: get().oturum?.yetki ?? 'patron',
        guncelTarih: new Date().toISOString(),
      });
      set({ kayitDurumu: 'kaydedildi' });
      return true;
    },

    haftayiOtomatikDoldur: async () => {
      const { aktifSube, aktifTarih, personeller, hafta, onayar } = get();
      const oncekiIso = haftaAralik(haftaKaydir(aktifTarih, -1)).anahtar;
      const onceki = await repo.getHafta(aktifSube, oncekiIso);
      const sonuc = motorDoldur({
        sube: aktifSube,
        tarih: aktifTarih,
        personeller: personeller.filter((p) => p.aktif),
        mevcut: hafta,
        onceki,
        onayar,
      });
      set({ hafta: sonuc.hafta, kayitDurumu: 'kaydediliyor' });
      await repo.kaydetHafta(aktifSube, haftaAralik(aktifTarih).anahtar, {
        ...sonuc.hafta,
        guncelleyen: get().oturum?.yetki ?? 'patron',
        guncelTarih: new Date().toISOString(),
      });
      set({ kayitDurumu: 'kaydedildi' });
      setTimeout(() => {
        if (get().kayitDurumu === 'kaydedildi') set({ kayitDurumu: 'idle' });
      }, 1800);
      return sonuc.uyarilar;
    },

    kaydetOnayar: async (o) => {
      await repo.kaydetOnayar(get().aktifSube, o);
    },
    kaydetPersonel: async (p) => {
      await repo.kaydetPersonel(get().aktifSube, p);
    },
    silPersonel: async (id) => {
      await repo.silPersonel(get().aktifSube, id);
    },
    yenidenSirala: async (sirali) => {
      await repo.siraGuncelle(
        get().aktifSube,
        sirali.map((p, i) => ({ id: p.id, sira: i })),
      );
    },
    personeleSubeEkle: async (hedefSube, p, tasi, kaynakSube) => {
      // Hedef şubeye ekle (kopya). Taşıma ise kaynaktan sil.
      const kaynak = kaynakSube ?? get().aktifSube;
      if (hedefSube === kaynak) return;
      const hedef = await repo.getPersonel(hedefSube);
      await repo.kaydetPersonel(hedefSube, { ...p, sira: hedef.length });
      if (tasi) await repo.silPersonel(kaynak, p.id);
    },
    kaydetDurumRenkAyar: async (map) => {
      setTumDurumRenk(map);
      set({ renkNesil: get().renkNesil + 1 });
      await repo.kaydetDurumRenk(map);
    },
    kaydetGrupRenkAyar: async (map) => {
      setTumGrupRenk(map);
      set({ renkNesil: get().renkNesil + 1 });
      await repo.kaydetGrupRenk(map);
    },
  };
});
