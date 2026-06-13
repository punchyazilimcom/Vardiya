import type {
  Grup,
  Rol,
  SaatAraligi,
  SubeOnayar,
  RolPresetler,
} from '../types';

// Rol -> preset anahtarı (tezgahtar -> tezgah)
function presetKey(rol: Rol): 'usta' | 'tezgah' {
  return rol === 'usta' ? 'usta' : 'tezgah';
}

// Override mantığı: şubeye özel kayıt varsa onu, yoksa genel ön ayarı kullan.
export function cozSaat(
  onayar: SubeOnayar,
  rol: Rol,
  grup: Grup,
): SaatAraligi {
  const key = presetKey(rol);
  const genel = onayar.genel[key][grup];
  const ovr = onayar.override?.[key]?.[grup];
  return ovr ?? genel;
}

export function saatMetin(s: SaatAraligi): string {
  return `${s.baslangic}-${s.bitis}`;
}

// Bir rol için efektif (override uygulanmış) preset tablosu — Saat Ayarları
// ekranında göstermek için.
export function efektifRolPreset(
  onayar: SubeOnayar,
  rol: Rol,
): RolPresetler {
  const key = presetKey(rol);
  const g = onayar.genel[key];
  const o = onayar.override?.[key];
  return {
    acilis: o?.acilis ?? g.acilis,
    araci: o?.araci ?? g.araci,
    kapanis: o?.kapanis ?? g.kapanis,
  };
}
