// ---- Sabit alanlar ----
export type SubeKod = 'demetevler' | 'bahcelievler' | 'etlik' | 'batikent';
export type Rol = 'usta' | 'tezgahtar';
export type Grup = 'acilis' | 'araci' | 'kapanis';
export type Gun =
  | 'pazartesi'
  | 'sali'
  | 'carsamba'
  | 'persembe'
  | 'cuma'
  | 'cumartesi'
  | 'pazar';

export type Durum = 'izinli' | 'senelik' | 'bayram' | 'full' | 'hk' | 'bos';

// ---- Hücre değer tipleri ----
export type HucreTip = 'grup' | 'ozelSaat' | 'durum' | 'baskaSube' | 'bos';

export interface BaskaSubeDeger {
  sube: SubeKod;
  // Başka şubedeki değer: grup | özel saat | durum
  tip: 'grup' | 'ozelSaat' | 'durum';
  grup?: Grup;
  ozelSaat?: string;
  durum?: Durum;
}

export interface Hucre {
  tip: HucreTip;
  grup?: Grup; // tip === 'grup'
  ozelSaat?: string; // tip === 'ozelSaat'
  durum?: Durum; // tip === 'durum'
  baskaSube?: BaskaSubeDeger; // tip === 'baskaSube'
}

// ---- Personel ----
export interface Personel {
  id: string;
  ad: string;
  rol: Rol;
  sira: number;
  aktif: boolean;
  izinGunu: string; // örn "Pazartesi" veya "Salı, Çarşamba"
  not: string;
  // Özlük bilgileri (opsiyonel)
  telefon?: string;
  iban?: string;
  iseGiris?: string; // ISO tarih "2024-03-01"
  tcKimlik?: string;
  dogumTarihi?: string; // ISO tarih
  maas?: string; // aylık net maaş (serbest metin, örn "45000")
  izinHakki?: string; // yıllık izin hakkı (gün), örn "14"
}

// ---- Saat ön ayarları ----
export interface SaatAraligi {
  baslangic: string; // "06:30"
  bitis: string; // "16:30" veya "KAPANIŞ" / "FULL"
}

// rol bazlı grup -> saat
export interface RolPresetler {
  acilis: SaatAraligi;
  araci: SaatAraligi;
  kapanis: SaatAraligi;
}

export interface GrupPreset {
  usta: RolPresetler;
  tezgah: RolPresetler;
}

export interface SubeOnayar {
  genel: GrupPreset; // tüm şubeler için temel (genelde GENEL_PRESET kopyası)
  override?: Partial<{
    usta: Partial<RolPresetler>;
    tezgah: Partial<RolPresetler>;
  }>;
}

// ---- Haftalık grid ----
export type GunHucreler = Partial<Record<Gun, Hucre>>;

export interface PersonelHaftaSatiri extends GunHucreler {
  izinGunu?: string;
  not?: string;
}

export interface Hafta {
  baslangic: string; // ISO tarih "2026-05-18"
  bitis: string; // "2026-05-24"
  hucreler: Record<string, PersonelHaftaSatiri>; // personelId -> satır
  guncelleyen?: string;
  guncelTarih?: string; // ISO datetime
  // Silinmiş personelin geçmişte kalması için ad anlık görüntüsü
  personelSnapshot?: Record<string, { ad: string; rol: Rol; sira: number }>;
}

// ---- Oturum ----
export type RolYetki = 'patron' | 'mudur';
export interface Oturum {
  yetki: RolYetki;
  // mudur ise kilitli şube
  sube: SubeKod | null;
}
