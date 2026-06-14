import { useState } from 'react';
import { useStore } from '../store';
import { DURUM_AD, durumRenkAktif } from '../constants';
import type { Durum } from '../types';

interface Props {
  onKapat: () => void;
}

const DUZENLENEBILIR: Durum[] = ['izinli', 'senelik', 'bayram', 'full', 'hk'];

// Zemin parlaklığına göre okunur metin rengi
function metinRengi(bg: string): string {
  const m = bg.replace('#', '');
  const n = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const num = parseInt(n, 16);
  if (Number.isNaN(num)) return '#ededed';
  const r = (num >> 16) & 255,
    g = (num >> 8) & 255,
    b = num & 255;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? '#141414' : '#f2f2f2';
}

export default function ColorSettings({ onKapat }: Props) {
  const kaydetDurumRenkAyar = useStore((s) => s.kaydetDurumRenkAyar);
  const [taslak, setTaslak] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {};
    DUZENLENEBILIR.forEach((d) => {
      o[d] = durumRenkAktif[d].bg === 'transparent' ? '#1c1c1c' : durumRenkAktif[d].bg;
    });
    return o;
  });
  const [kaydedildi, setKaydedildi] = useState(false);

  async function kaydet() {
    const map: Record<string, { bg: string; fg: string }> = {};
    DUZENLENEBILIR.forEach((d) => {
      map[d] = { bg: taslak[d], fg: metinRengi(taslak[d]) };
    });
    await kaydetDurumRenkAyar(map);
    setKaydedildi(true);
    setTimeout(() => setKaydedildi(false), 1600);
  }

  return (
    <div className="ortu" onClick={onKapat}>
      <div className="sayfa" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 18 }}>Renk Ayarları</h3>
          <button className="btn kucuk" onClick={onKapat}>
            Kapat
          </button>
        </div>
        <p style={{ color: '#888', fontSize: 12, marginTop: 8, lineHeight: 1.5 }}>
          Durum etiketlerinin (İZİNLİ, FULL vb.) renklerini özelleştir. Metin rengi
          otomatik ayarlanır. Değişiklik tüm cihazlara yansır.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 14 }}>
          {DUZENLENEBILIR.map((d) => (
            <div key={d} style={s.satir}>
              <span
                style={{
                  ...s.onizleme,
                  background: taslak[d],
                  color: metinRengi(taslak[d]),
                }}
              >
                {DURUM_AD[d]}
              </span>
              <input
                type="color"
                value={taslak[d]}
                onChange={(e) => setTaslak({ ...taslak, [d]: e.target.value })}
                style={s.renkGiris}
                aria-label={`${DURUM_AD[d]} rengi`}
              />
              <span className="mono" style={{ color: '#777', fontSize: 12, width: 72 }}>
                {taslak[d]}
              </span>
            </div>
          ))}
        </div>

        <button className="btn dolu" style={{ width: '100%', marginTop: 16 }} onClick={kaydet}>
          {kaydedildi ? '✓ Kaydedildi' : 'Kaydet'}
        </button>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  satir: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 10px',
    background: '#161616',
    border: '1px solid #242424',
    borderRadius: 9,
  },
  onizleme: {
    flex: 1,
    textAlign: 'center',
    fontWeight: 700,
    fontSize: 13,
    padding: '10px 6px',
    borderRadius: 7,
  },
  renkGiris: {
    width: 44,
    height: 38,
    border: '1px solid #2c2c2c',
    borderRadius: 8,
    background: 'transparent',
    padding: 2,
    cursor: 'pointer',
  },
};
