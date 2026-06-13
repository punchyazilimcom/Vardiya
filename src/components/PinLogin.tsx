import { useState } from 'react';
import { PIN_PATRON, PIN_MUDUR, SUBELER, MARKA } from '../constants';
import { useStore } from '../store';
import type { SubeKod } from '../types';

export default function PinLogin() {
  const girisYap = useStore((s) => s.girisYap);
  const [pin, setPin] = useState('');
  const [hata, setHata] = useState('');
  const [mudurSubeSec, setMudurSubeSec] = useState(false);

  function bas(rakam: string) {
    setHata('');
    if (rakam === 'sil') {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (pin.length >= 4) return;
    const yeni = pin + rakam;
    setPin(yeni);
    if (yeni.length === 4) dogrula(yeni);
  }

  function dogrula(deger: string) {
    if (deger === PIN_PATRON) {
      girisYap('patron', null);
    } else if (deger === PIN_MUDUR) {
      setMudurSubeSec(true);
    } else {
      setHata('Hatalı PIN');
      setTimeout(() => setPin(''), 350);
    }
  }

  function mudurGir(sube: SubeKod) {
    girisYap('mudur', sube);
  }

  return (
    <div style={s.wrap}>
      <div style={s.box}>
        <div style={s.brand}>
          <div style={s.logo}>
            <span style={{ color: MARKA.sari }}>BAŞAK</span> VARDİYA
          </div>
          <div style={s.alt}>Haftalık Vardiya Yönetimi · 4 Şube</div>
        </div>

        {!mudurSubeSec ? (
          <>
            <div style={s.noktalar}>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    ...s.nokta,
                    background: i < pin.length ? MARKA.sari : 'transparent',
                    borderColor: i < pin.length ? MARKA.sari : '#333',
                  }}
                />
              ))}
            </div>
            <div style={{ ...s.hata, opacity: hata ? 1 : 0 }}>{hata || '·'}</div>
            <div style={s.pad}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
                <button key={n} style={s.tus} onClick={() => bas(n)}>
                  {n}
                </button>
              ))}
              <span />
              <button style={s.tus} onClick={() => bas('0')}>
                0
              </button>
              <button style={{ ...s.tus, ...s.tusSil }} onClick={() => bas('sil')}>
                ⌫
              </button>
            </div>
            <div style={s.ipucu}>PATRON 9999 · MÜDÜR 1111</div>
          </>
        ) : (
          <div>
            <div style={s.subeBaslik}>Şubenizi seçin</div>
            <div style={s.subeListe}>
              {SUBELER.map((sb) => (
                <button key={sb.kod} style={s.subeBtn} onClick={() => mudurGir(sb.kod)}>
                  <span style={{ fontWeight: 700 }}>{sb.ad}</span>
                  <span className="mono" style={{ color: '#666' }}>
                    {sb.no}
                  </span>
                </button>
              ))}
            </div>
            <button
              className="btn"
              style={{ marginTop: 14, width: '100%' }}
              onClick={() => {
                setMudurSubeSec(false);
                setPin('');
              }}
            >
              ← Geri
            </button>
          </div>
        )}
      </div>
      <div style={s.footer}>PUNCHYAZILIM</div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 18,
  },
  box: {
    width: '100%',
    maxWidth: 340,
    background: MARKA.kart,
    border: '1px solid #222',
    borderRadius: 16,
    padding: 26,
  },
  brand: { textAlign: 'center', marginBottom: 22 },
  logo: {
    fontFamily: 'Bricolage Grotesque, sans-serif',
    fontWeight: 800,
    fontSize: 26,
    letterSpacing: '-0.02em',
  },
  alt: { color: '#777', fontSize: 12, marginTop: 4 },
  noktalar: { display: 'flex', gap: 14, justifyContent: 'center', margin: '6px 0' },
  nokta: {
    width: 14,
    height: 14,
    borderRadius: '50%',
    border: '2px solid',
    transition: 'all .12s',
  },
  hata: { textAlign: 'center', color: '#e0533d', fontSize: 12, height: 16, transition: 'opacity .15s' },
  pad: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 10,
    marginTop: 6,
  },
  tus: {
    aspectRatio: '1.6',
    background: '#161616',
    border: '1px solid #262626',
    borderRadius: 10,
    fontSize: 22,
    fontFamily: 'JetBrains Mono, monospace',
    color: '#ededed',
  },
  tusSil: { fontSize: 18, color: '#999' },
  ipucu: { textAlign: 'center', color: '#555', fontSize: 11, marginTop: 16, letterSpacing: '0.04em' },
  subeBaslik: { fontWeight: 700, fontSize: 16, marginBottom: 12, fontFamily: 'Bricolage Grotesque, sans-serif' },
  subeListe: { display: 'flex', flexDirection: 'column', gap: 8 },
  subeBtn: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    background: '#161616',
    border: '1px solid #262626',
    borderRadius: 10,
    fontSize: 15,
  },
  footer: { color: '#888', fontSize: 11, letterSpacing: '0.1em' },
};
