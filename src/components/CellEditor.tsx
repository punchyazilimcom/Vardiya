import { useState } from 'react';
import type { Hucre, Grup, Durum, SubeKod, Rol, SubeOnayar } from '../types';
import {
  GRUP_AD,
  GRUP_RENK,
  DURUM_AD,
  DURUM_RENK,
  SUBELER,
  subeAd,
} from '../constants';
import { cozSaat, saatMetin } from '../lib/presets';

interface Props {
  personelAd: string;
  gunAd: string;
  rol: Rol;
  sube: SubeKod;
  onayar: SubeOnayar;
  mevcut: Hucre | undefined;
  onSec: (h: Hucre) => void;
  onKapat: () => void;
}

type Sekme = 'grup' | 'ozel' | 'durum' | 'sube';

export default function CellEditor({
  personelAd,
  gunAd,
  rol,
  sube,
  onayar,
  mevcut,
  onSec,
  onKapat,
}: Props) {
  const [sekme, setSekme] = useState<Sekme>('grup');
  const [ozel, setOzel] = useState(mevcut?.tip === 'ozelSaat' ? mevcut.ozelSaat ?? '' : '');

  // başka şube alt durumu
  const [bsSube, setBsSube] = useState<SubeKod>(
    mevcut?.baskaSube?.sube ?? SUBELER.find((s) => s.kod !== sube)!.kod,
  );
  const [bsTip, setBsTip] = useState<'grup' | 'ozelSaat' | 'durum'>(
    mevcut?.baskaSube?.tip ?? 'ozelSaat',
  );
  const [bsGrup, setBsGrup] = useState<Grup>(mevcut?.baskaSube?.grup ?? 'acilis');
  const [bsOzel, setBsOzel] = useState(mevcut?.baskaSube?.ozelSaat ?? '');
  const [bsDurum, setBsDurum] = useState<Durum>(mevcut?.baskaSube?.durum ?? 'full');

  const gruplar: Grup[] = ['acilis', 'araci', 'kapanis'];
  const durumlar: Durum[] = ['izinli', 'senelik', 'bayram', 'full', 'hk', 'bos'];

  function secGrup(g: Grup) {
    onSec({ tip: 'grup', grup: g });
  }
  function secDurum(d: Durum) {
    if (d === 'bos') onSec({ tip: 'bos' });
    else onSec({ tip: 'durum', durum: d });
  }
  function kaydetOzel() {
    if (!ozel.trim()) return;
    onSec({ tip: 'ozelSaat', ozelSaat: ozel.trim() });
  }
  function kaydetSube() {
    const baskaSube: Hucre['baskaSube'] = { sube: bsSube, tip: bsTip };
    if (bsTip === 'grup') baskaSube.grup = bsGrup;
    else if (bsTip === 'ozelSaat') baskaSube.ozelSaat = bsOzel.trim() || GRUP_AD.acilis;
    else baskaSube.durum = bsDurum;
    onSec({ tip: 'baskaSube', baskaSube });
  }

  const sekmeler: { k: Sekme; ad: string }[] = [
    { k: 'grup', ad: 'Vardiya' },
    { k: 'ozel', ad: 'Özel Saat' },
    { k: 'durum', ad: 'Durum' },
    { k: 'sube', ad: 'Başka Şube' },
  ];

  return (
    <div className="ortu" onClick={onKapat}>
      <div className="sayfa" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 4 }}>
          <div>
            <h3 style={{ fontSize: 17 }}>{personelAd}</h3>
            <div style={{ color: '#888', fontSize: 13 }}>{gunAd}</div>
          </div>
          <button className="btn kucuk" onClick={onKapat}>
            Kapat
          </button>
        </div>

        <div style={st.sekmeler}>
          {sekmeler.map((sk) => (
            <button
              key={sk.k}
              onClick={() => setSekme(sk.k)}
              style={{ ...st.sekme, ...(sekme === sk.k ? st.sekmeAktif : {}) }}
            >
              {sk.ad}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 14 }}>
          {sekme === 'grup' && (
            <div style={st.dikey}>
              {gruplar.map((g) => {
                const r = GRUP_RENK[g];
                return (
                  <button
                    key={g}
                    onClick={() => secGrup(g)}
                    style={{ ...st.secim, background: r.bg, borderColor: r.border }}
                  >
                    <span style={{ color: r.fg, fontWeight: 700 }}>{GRUP_AD[g]}</span>
                    <span className="mono" style={{ color: r.fg }}>
                      {saatMetin(cozSaat(onayar, rol, g))}
                    </span>
                  </button>
                );
              })}
              <div style={st.notu}>Saatler ön ayardan otomatik gelir (Saat Ayarları'ndan değiştirilir).</div>
            </div>
          )}

          {sekme === 'ozel' && (
            <div style={st.dikey}>
              <label className="etiket">Serbest saat metni</label>
              <input
                className="giris mono"
                autoFocus
                placeholder="07:30-18:30 veya 16:00-KAPANIŞ"
                value={ozel}
                onChange={(e) => setOzel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && kaydetOzel()}
              />
              <div style={st.hizli}>
                {['07:00-FULL', '16:00-KAPANIŞ', '10:30-KAPANIŞ', '08:00-18:00'].map((x) => (
                  <button key={x} className="btn kucuk mono" onClick={() => setOzel(x)}>
                    {x}
                  </button>
                ))}
              </div>
              <button className="btn dolu" onClick={kaydetOzel}>
                Kaydet
              </button>
            </div>
          )}

          {sekme === 'durum' && (
            <div style={st.izgara}>
              {durumlar.map((d) => {
                const r = DURUM_RENK[d];
                return (
                  <button
                    key={d}
                    onClick={() => secDurum(d)}
                    style={{
                      ...st.durumBtn,
                      background: r.bg === 'transparent' ? '#161616' : r.bg,
                      color: r.fg,
                      borderColor: '#2c2c2c',
                    }}
                  >
                    {DURUM_AD[d]}
                  </button>
                );
              })}
            </div>
          )}

          {sekme === 'sube' && (
            <div style={st.dikey}>
              <label className="etiket">Hangi şube</label>
              <select className="giris" value={bsSube} onChange={(e) => setBsSube(e.target.value as SubeKod)}>
                {SUBELER.filter((s) => s.kod !== sube).map((s) => (
                  <option key={s.kod} value={s.kod}>
                    {s.ad}
                  </option>
                ))}
              </select>

              <label className="etiket">Değer tipi</label>
              <div style={st.hizli}>
                {(['ozelSaat', 'grup', 'durum'] as const).map((t) => (
                  <button
                    key={t}
                    className="btn kucuk"
                    style={bsTip === t ? { borderColor: '#F4DF16', color: '#F4DF16' } : {}}
                    onClick={() => setBsTip(t)}
                  >
                    {t === 'ozelSaat' ? 'Özel Saat' : t === 'grup' ? 'Vardiya' : 'Durum'}
                  </button>
                ))}
              </div>

              {bsTip === 'ozelSaat' && (
                <input
                  className="giris mono"
                  placeholder="08:00-18:00"
                  value={bsOzel}
                  onChange={(e) => setBsOzel(e.target.value)}
                />
              )}
              {bsTip === 'grup' && (
                <select className="giris" value={bsGrup} onChange={(e) => setBsGrup(e.target.value as Grup)}>
                  {gruplar.map((g) => (
                    <option key={g} value={g}>
                      {GRUP_AD[g]}
                    </option>
                  ))}
                </select>
              )}
              {bsTip === 'durum' && (
                <select className="giris" value={bsDurum} onChange={(e) => setBsDurum(e.target.value as Durum)}>
                  {durumlar.map((d) => (
                    <option key={d} value={d}>
                      {DURUM_AD[d]}
                    </option>
                  ))}
                </select>
              )}

              <div style={st.notu}>
                Önizleme: <b style={{ color: '#f0d96a' }}>{subeAd(bsSube).toLocaleUpperCase('tr-TR')}</b>{' '}
                <span className="mono">
                  {bsTip === 'ozelSaat' ? bsOzel : bsTip === 'grup' ? GRUP_AD[bsGrup] : DURUM_AD[bsDurum]}
                </span>
              </div>
              <button className="btn dolu" onClick={kaydetSube}>
                Kaydet
              </button>
            </div>
          )}
        </div>

        {mevcut && mevcut.tip !== 'bos' && (
          <button
            className="btn tehlike"
            style={{ marginTop: 16, width: '100%' }}
            onClick={() => onSec({ tip: 'bos' })}
          >
            Hücreyi Temizle
          </button>
        )}
      </div>
    </div>
  );
}

const st: Record<string, React.CSSProperties> = {
  sekmeler: { display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' },
  sekme: {
    flex: '1 1 0',
    padding: '8px 6px',
    background: '#161616',
    border: '1px solid #262626',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    color: '#aaa',
    minWidth: 70,
  },
  sekmeAktif: { borderColor: '#F4DF16', color: '#F4DF16', background: '#1c1a0e' },
  dikey: { display: 'flex', flexDirection: 'column', gap: 10 },
  secim: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px 16px',
    border: '1px solid',
    borderRadius: 10,
    fontSize: 15,
  },
  izgara: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 },
  durumBtn: {
    padding: '16px 6px',
    border: '1px solid',
    borderRadius: 10,
    fontWeight: 700,
    fontSize: 13,
  },
  hizli: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  notu: { color: '#777', fontSize: 12, lineHeight: 1.5 },
};
