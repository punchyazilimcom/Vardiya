import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { SUBELER, subeAd } from '../constants';
import { haftaAralik } from '../lib/week';
import { baskaSubedenGelenler, type BaskaSubeGelen } from '../lib/analiz';
import { hucreGorunum } from '../lib/cell';
import * as repo from '../lib/repo';
import { varsayilanOnayar } from '../lib/repo';
import type { Hucre } from '../types';

interface Props {
  onKapat: () => void;
}

export default function CrossBranchPanel({ onKapat }: Props) {
  const { aktifSube, aktifTarih } = useStore();
  const [yukleniyor, setYukleniyor] = useState(true);
  const [gelenler, setGelenler] = useState<BaskaSubeGelen[]>([]);
  const iso = haftaAralik(aktifTarih).anahtar;

  useEffect(() => {
    let iptal = false;
    (async () => {
      setYukleniyor(true);
      const veriler = await Promise.all(
        SUBELER.map(async (sb) => ({
          sube: sb.kod,
          hafta: await repo.getHafta(sb.kod, iso),
          personeller: await repo.getPersonel(sb.kod),
          onayar: await repo.getOnayar(sb.kod).catch(() => varsayilanOnayar(sb.kod)),
        })),
      );
      const onayarMap = Object.fromEntries(veriler.map((v) => [v.sube, v.onayar]));
      const list = baskaSubedenGelenler(aktifSube, veriler, (h: Hucre) => {
        // Kaynak personelin rolü bilinmediği için gösterimde rolü usta varsay;
        // başka şube hücresi genelde özel saat/durum içerir, gruplar nadir.
        const g = hucreGorunum(h, 'usta', onayarMap[h.baskaSube!.sube]);
        return g.metin;
      });
      if (!iptal) {
        setGelenler(list);
        setYukleniyor(false);
      }
    })();
    return () => {
      iptal = true;
    };
  }, [aktifSube, iso]);

  // Personele göre grupla
  const grupli = gelenler.reduce<Record<string, BaskaSubeGelen[]>>((acc, g) => {
    const k = `${g.personelAd}__${g.kaynakSube}`;
    (acc[k] ||= []).push(g);
    return acc;
  }, {});

  return (
    <div className="ortu" onClick={onKapat}>
      <div className="sayfa" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div>
            <h3 style={{ fontSize: 18 }}>Başka Şubeden Gelenler</h3>
            <div style={{ color: '#888', fontSize: 13 }}>
              {subeAd(aktifSube)} · {iso}
            </div>
          </div>
          <button className="btn kucuk" onClick={onKapat}>
            Kapat
          </button>
        </div>

        <p style={{ color: '#888', fontSize: 12, marginTop: 12, lineHeight: 1.5 }}>
          Bu hafta diğer şubelerden <b>{subeAd(aktifSube)}</b> şubesine görevlendirilen personeller.
        </p>

        <div style={{ marginTop: 12 }}>
          {yukleniyor ? (
            <div style={{ color: '#777', padding: 20, textAlign: 'center' }}>Yükleniyor…</div>
          ) : Object.keys(grupli).length === 0 ? (
            <div style={{ color: '#777', padding: 20, textAlign: 'center' }}>
              Bu hafta başka şubeden gelen yok.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.values(grupli).map((grup, i) => (
                <div key={i} style={st.kart}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700 }}>{grup[0].personelAd}</span>
                    <span style={st.kaynak}>{subeAd(grup[0].kaynakSube)}</span>
                  </div>
                  <div style={st.gunler}>
                    {grup.map((g, j) => (
                      <span key={j} style={st.gun}>
                        <b>{g.gunAd.slice(0, 3)}</b> <span className="mono">{g.deger}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const st: Record<string, React.CSSProperties> = {
  kart: { background: '#161616', border: '1px solid #2a2208', borderRadius: 10, padding: '11px 13px' },
  kaynak: { fontSize: 11, color: '#f0d96a', fontWeight: 700 },
  gunler: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 7 },
  gun: {
    fontSize: 11.5,
    background: '#241a08',
    border: '1px solid #4a3a10',
    borderRadius: 6,
    padding: '3px 7px',
    color: '#e8d98a',
  },
};
