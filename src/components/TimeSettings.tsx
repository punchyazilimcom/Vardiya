import { useEffect, useState } from 'react';
import { useStore } from '../store';
import type { SubeOnayar, Grup, SaatAraligi } from '../types';
import { GRUP_AD, subeAd, GRUP_RENK } from '../constants';

interface Props {
  onKapat: () => void;
}

const GRUPLAR: Grup[] = ['acilis', 'araci', 'kapanis'];

export default function TimeSettings({ onKapat }: Props) {
  const { onayar, aktifSube, kaydetOnayar } = useStore();
  const [taslak, setTaslak] = useState<SubeOnayar>(() => JSON.parse(JSON.stringify(onayar)));
  const [kaydedildi, setKaydedildi] = useState(false);

  // Şube/onayar değişince taslağı tazele
  useEffect(() => {
    setTaslak(JSON.parse(JSON.stringify(onayar)));
  }, [onayar, aktifSube]);

  function deger(rol: 'usta' | 'tezgah', g: Grup): SaatAraligi {
    const ovr = taslak.override?.[rol]?.[g];
    return ovr ?? taslak.genel[rol][g];
  }
  function overrideVarMi(rol: 'usta' | 'tezgah', g: Grup): boolean {
    return !!taslak.override?.[rol]?.[g];
  }

  function yaz(rol: 'usta' | 'tezgah', g: Grup, alan: keyof SaatAraligi, v: string) {
    setTaslak((t) => {
      const kopya: SubeOnayar = JSON.parse(JSON.stringify(t));
      const hedef = overrideVarMi(rol, g) ? kopya.override![rol]![g]! : kopya.genel[rol][g];
      hedef[alan] = v;
      if (overrideVarMi(rol, g)) {
        kopya.override![rol]![g] = hedef;
      } else {
        kopya.genel[rol][g] = hedef;
      }
      return kopya;
    });
  }

  function overrideAc(rol: 'usta' | 'tezgah', g: Grup) {
    setTaslak((t) => {
      const k: SubeOnayar = JSON.parse(JSON.stringify(t));
      if (!k.override) k.override = {};
      if (!k.override[rol]) k.override[rol] = {};
      k.override[rol]![g] = { ...k.genel[rol][g] };
      return k;
    });
  }
  function overrideKaldir(rol: 'usta' | 'tezgah', g: Grup) {
    setTaslak((t) => {
      const k: SubeOnayar = JSON.parse(JSON.stringify(t));
      if (k.override?.[rol]) {
        delete k.override[rol]![g];
        if (Object.keys(k.override[rol]!).length === 0) delete k.override[rol];
        if (k.override && Object.keys(k.override).length === 0) delete k.override;
      }
      return k;
    });
  }

  async function kaydet() {
    await kaydetOnayar(taslak);
    setKaydedildi(true);
    setTimeout(() => setKaydedildi(false), 1600);
  }

  function tablo(rol: 'usta' | 'tezgah', baslik: string) {
    return (
      <div style={{ marginBottom: 18 }}>
        <div style={s.blokBaslik}>{baslik}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 8 }}>
          {GRUPLAR.map((g) => {
            const v = deger(rol, g);
            const ovr = overrideVarMi(rol, g);
            const r = GRUP_RENK[g];
            return (
              <div key={g} style={{ ...s.satir, borderColor: ovr ? '#F4DF16' : '#242424' }}>
                <span style={{ ...s.grupEtiket, color: r.fg }}>{GRUP_AD[g]}</span>
                <input
                  className="giris mono"
                  style={s.saat}
                  value={v.baslangic}
                  onChange={(e) => yaz(rol, g, 'baslangic', e.target.value)}
                />
                <span style={{ color: '#555' }}>–</span>
                <input
                  className="giris mono"
                  style={s.saat}
                  value={v.bitis}
                  onChange={(e) => yaz(rol, g, 'bitis', e.target.value)}
                />
                {ovr ? (
                  <button className="btn kucuk" title="Şubeye özel kaydı kaldır, genele dön" onClick={() => overrideKaldir(rol, g)}>
                    Genele dön
                  </button>
                ) : (
                  <button className="btn kucuk" title="Bu şubeye özel saat tanımla" onClick={() => overrideAc(rol, g)}>
                    Özelleştir
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="ortu" onClick={onKapat}>
      <div className="sayfa" onClick={(e) => e.stopPropagation()}>
        <div style={s.ust}>
          <div>
            <h3 style={{ fontSize: 18 }}>Saat Ayarları</h3>
            <div style={{ color: '#888', fontSize: 13 }}>{subeAd(aktifSube)} · vardiya saat ön ayarları</div>
          </div>
          <button className="btn kucuk" onClick={onKapat}>
            Kapat
          </button>
        </div>

        <p style={s.aciklama}>
          Sarı çerçeve = bu şubeye özel saat (override). "Genele dön" ile tüm şubelerin ortak ön ayarına
          dönülür. Bahçelievler'de usta açılış ve tezgah açılış varsayılan olarak özelleştirilmiştir.
        </p>

        <div style={{ marginTop: 14 }}>
          {tablo('usta', 'USTA')}
          {tablo('tezgah', 'TEZGAHTAR')}
        </div>

        <button className="btn dolu" style={{ width: '100%' }} onClick={kaydet}>
          {kaydedildi ? '✓ Kaydedildi' : 'Kaydet'}
        </button>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  ust: { display: 'flex', justifyContent: 'space-between', alignItems: 'start' },
  blokBaslik: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.12em',
    color: '#F4DF16',
    fontFamily: 'Bricolage Grotesque, sans-serif',
  },
  aciklama: { color: '#888', fontSize: 12, lineHeight: 1.55, marginTop: 12 },
  satir: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 10px',
    background: '#161616',
    border: '1px solid',
    borderRadius: 9,
  },
  grupEtiket: { width: 64, fontWeight: 700, fontSize: 13 },
  saat: { width: 92, textAlign: 'center', padding: '7px 6px' },
};
