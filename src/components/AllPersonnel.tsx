import { useEffect, useState, useMemo } from 'react';
import { useStore } from '../store';
import { SUBELER, subeAd } from '../constants';
import * as repo from '../lib/repo';
import type { Personel, SubeKod } from '../types';

interface Props {
  onKapat: () => void;
}

interface SubeListe {
  sube: SubeKod;
  personeller: Personel[];
}

export default function AllPersonnel({ onKapat }: Props) {
  const personeleSubeEkle = useStore((s) => s.personeleSubeEkle);
  const [veri, setVeri] = useState<SubeListe[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [ara, setAra] = useState('');
  const [tasi, setTasi] = useState<{ p: Personel; kaynak: SubeKod } | null>(null);
  const [mesaj, setMesaj] = useState('');

  async function yukle() {
    setYukleniyor(true);
    setVeri(await repo.getTumPersonel());
    setYukleniyor(false);
  }
  useEffect(() => {
    yukle();
  }, []);

  const toplam = useMemo(() => veri.reduce((n, v) => n + v.personeller.length, 0), [veri]);
  const q = ara.toLocaleLowerCase('tr-TR').trim();

  async function uygula(hedef: SubeKod, modKopya: boolean) {
    if (!tasi) return;
    await personeleSubeEkle(hedef, tasi.p, !modKopya, tasi.kaynak);
    setTasi(null);
    setMesaj(`${tasi.p.ad} → ${subeAd(hedef)} (${modKopya ? 'kopyalandı' : 'taşındı'})`);
    setTimeout(() => setMesaj(''), 2500);
    await yukle();
  }

  return (
    <div className="ortu" onClick={onKapat}>
      <div className="sayfa" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 18 }}>Tüm Personeller{!yukleniyor && ` (${toplam})`}</h3>
          <button className="btn kucuk" onClick={onKapat}>
            Kapat
          </button>
        </div>

        <input
          className="giris"
          placeholder="Ara: ad / şube…"
          value={ara}
          onChange={(e) => setAra(e.target.value)}
          style={{ marginTop: 12 }}
        />

        {mesaj && (
          <div style={{ marginTop: 10, color: '#4caf7d', fontSize: 13 }}>✓ {mesaj}</div>
        )}

        <div style={{ marginTop: 12 }}>
          {yukleniyor ? (
            <div style={{ color: '#777', padding: 20, textAlign: 'center' }}>Yükleniyor…</div>
          ) : (
            veri.map((v) => {
              const liste = v.personeller.filter(
                (p) =>
                  !q ||
                  p.ad.toLocaleLowerCase('tr-TR').includes(q) ||
                  subeAd(v.sube).toLocaleLowerCase('tr-TR').includes(q),
              );
              if (liste.length === 0) return null;
              return (
                <div key={v.sube} style={{ marginBottom: 16 }}>
                  <div style={st.subeBaslik}>
                    {subeAd(v.sube).toLocaleUpperCase('tr-TR')} · {liste.length}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 6 }}>
                    {liste.map((p) => (
                      <div key={p.id} style={{ ...st.satir, opacity: p.aktif ? 1 : 0.5 }}>
                        <span style={st.rolNok(p.rol === 'usta')} />
                        <span style={{ flex: 1, fontWeight: 600 }}>
                          {p.ad}
                          {p.telefon && (
                            <span className="mono" style={st.tel}> · {p.telefon}</span>
                          )}
                        </span>
                        <button
                          className="btn kucuk"
                          onClick={() => setTasi({ p, kaynak: v.sube })}
                        >
                          → Şube
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {tasi && (
          <div className="ortu" onClick={() => setTasi(null)}>
            <div className="sayfa" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380 }}>
              <h3 style={{ fontSize: 16 }}>{tasi.p.ad}</h3>
              <div style={{ color: '#888', fontSize: 13, marginTop: 2 }}>
                Şu an: {subeAd(tasi.kaynak)} · Hedef şubeyi seç
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
                {SUBELER.filter((sb) => sb.kod !== tasi.kaynak).map((sb) => (
                  <div key={sb.kod} style={st.hedefSatir}>
                    <span style={{ flex: 1, fontWeight: 600 }}>{sb.ad}</span>
                    <button className="btn kucuk" onClick={() => uygula(sb.kod, true)}>
                      Kopyala
                    </button>
                    <button className="btn kucuk vurgu" onClick={() => uygula(sb.kod, false)}>
                      Taşı
                    </button>
                  </div>
                ))}
              </div>
              <p style={st.not}>
                <b>Kopyala:</b> kişi iki şubede de listelenir. <b>Taşı:</b> bu şubeden
                çıkarılır, hedefe geçer. (Geçmiş haftalar bozulmaz.)
              </p>
              <button className="btn" style={{ width: '100%', marginTop: 8 }} onClick={() => setTasi(null)}>
                Vazgeç
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const st = {
  subeBaslik: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.1em',
    color: '#F4DF16',
    fontFamily: 'Bricolage Grotesque, sans-serif',
  } as React.CSSProperties,
  satir: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    padding: '8px 10px',
    background: '#161616',
    border: '1px solid #242424',
    borderRadius: 9,
  } as React.CSSProperties,
  rolNok: (usta: boolean): React.CSSProperties => ({
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: usta ? '#F4DF16' : '#5a8',
    flexShrink: 0,
  }),
  tel: { color: '#666', fontWeight: 400, fontSize: 12 } as React.CSSProperties,
  hedefSatir: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 10px',
    background: '#161616',
    border: '1px solid #242424',
    borderRadius: 9,
  } as React.CSSProperties,
  not: { color: '#777', fontSize: 12, lineHeight: 1.5, marginTop: 12 } as React.CSSProperties,
};
