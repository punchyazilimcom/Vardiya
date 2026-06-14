import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { GUNLER } from '../constants';
import { gunTarihleri, tarihEtiket, haftaAralik } from '../lib/week';
import { hucreGorunum } from '../lib/cell';
import { personelOzet } from '../lib/analiz';
import { gunKapsam } from '../lib/otomatik';
import type { Gun, Hucre, Personel } from '../types';
import CellEditor from './CellEditor';

export default function ShiftTable() {
  const {
    personeller,
    hafta,
    onayar,
    aktifSube,
    aktifTarih,
    hucreYaz,
    satirAlanYaz,
    yenidenBaglan,
    yukleniyor,
  } = useStore();
  const [aktifHucre, setAktifHucre] = useState<{ p: Personel; gun: Gun } | null>(null);

  const aktifler = useMemo(() => personeller.filter((p) => p.aktif), [personeller]);
  const ustalar = aktifler.filter((p) => p.rol === 'usta');
  const tezgahlar = aktifler.filter((p) => p.rol === 'tezgahtar');
  const gunler = gunTarihleri(aktifTarih);
  const uyarilar = useMemo(
    () => gunKapsam(aktifSube, hafta, aktifler, onayar),
    [aktifSube, hafta, aktifler, onayar],
  );
  const a = haftaAralik(aktifTarih);

  function hucreTik(p: Personel, gun: Gun) {
    setAktifHucre({ p, gun });
  }

  function blok(baslik: string, liste: Personel[]) {
    if (liste.length === 0) return null;
    return (
      <>
        <tr>
          <td colSpan={GUNLER.length + 3} style={st.blokBaslik}>
            {baslik}
          </td>
        </tr>
        {liste.map((p) => {
          const satir = hafta?.hucreler?.[p.id];
          const ozet = personelOzet(satir);
          return (
            <tr key={p.id}>
              <th style={st.adHucre} scope="row">
                <span style={st.ad}>{p.ad}</span>
                <span style={st.ozet}>
                  {ozet.calismaGun}g · {ozet.izinGun}i
                </span>
              </th>
              {GUNLER.map((g) => {
                const h = satir?.[g.kod] as Hucre | undefined;
                const gv = hucreGorunum(h, p.rol, onayar);
                return (
                  <td
                    key={g.kod}
                    style={{
                      ...st.hucre,
                      background: gv.bos ? 'transparent' : gv.bg,
                      borderColor: gv.bos ? '#1d1d1d' : gv.border,
                    }}
                    onClick={() => hucreTik(p, g.kod)}
                  >
                    {gv.ust && <span style={st.hucreUst}>{gv.ust}</span>}
                    <span
                      className="mono"
                      style={{ color: gv.fg, fontSize: gv.ust ? 10.5 : 11.5, lineHeight: 1.15 }}
                    >
                      {gv.metin}
                    </span>
                  </td>
                );
              })}
              <td style={st.metaHucre}>
                <input
                  className="meta-giris"
                  style={st.metaGiris}
                  value={satir?.izinGunu ?? p.izinGunu ?? ''}
                  placeholder="—"
                  onChange={(e) => satirAlanYaz(p.id, 'izinGunu', e.target.value)}
                />
              </td>
              <td style={st.metaHucre}>
                <input
                  className="meta-giris"
                  style={st.metaGiris}
                  value={satir?.not ?? p.not ?? ''}
                  placeholder="—"
                  onChange={(e) => satirAlanYaz(p.id, 'not', e.target.value)}
                />
              </td>
            </tr>
          );
        })}
      </>
    );
  }

  return (
    <div style={st.kaydir}>
      <table style={st.tablo}>
        <thead>
          <tr>
            <th style={{ ...st.kose }}>PERSONEL</th>
            {GUNLER.map((g, i) => {
              const u = uyarilar[g.kod];
              const uyar = u.eksikler.length > 0;
              return (
                <th key={g.kod} style={st.gunBaslik}>
                  <div style={st.gunAd}>
                    {g.ad}
                    {uyar && (
                      <span style={st.uyariNokta} title={u.eksikler.join(' · ')}>
                        ⚠
                      </span>
                    )}
                  </div>
                  <div style={st.gunTarih}>{tarihEtiket(gunler[i])}</div>
                </th>
              );
            })}
            <th style={st.metaBaslik}>İZİN GÜNÜ</th>
            <th style={st.metaBaslik}>NOT</th>
          </tr>
        </thead>
        <tbody>
          {blok('USTALAR', ustalar)}
          {blok('TEZGAHTAR', tezgahlar)}
          {aktifler.length === 0 && (
            <tr>
              <td colSpan={GUNLER.length + 3} style={st.bos}>
                <div style={{ marginBottom: 10 }}>
                  {yukleniyor
                    ? 'Yükleniyor…'
                    : 'Personel görünmüyor. Bağlantı kurulamadıysa yeniden deneyin.'}
                </div>
                <button className="btn vurgu" onClick={() => yenidenBaglan()}>
                  ↻ Yeniden Bağlan
                </button>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {aktifHucre && (
        <CellEditor
          personelAd={aktifHucre.p.ad}
          gunAd={GUNLER.find((g) => g.kod === aktifHucre.gun)!.ad + ' · ' + tarihEtiket(gunler[GUNLER.findIndex((g) => g.kod === aktifHucre.gun)])}
          rol={aktifHucre.p.rol}
          sube={aktifSube}
          onayar={onayar}
          mevcut={hafta?.hucreler?.[aktifHucre.p.id]?.[aktifHucre.gun]}
          onSec={(h) => {
            hucreYaz(aktifHucre.p.id, aktifHucre.gun, h);
            setAktifHucre(null);
          }}
          onKapat={() => setAktifHucre(null)}
        />
      )}
      <p style={{ marginTop: 6, fontSize: 11, color: '#555' }}>
        Hafta: <span className="mono">{a.anahtar}</span> · Hücreye dokunarak düzenleyin.
      </p>
    </div>
  );
}

const st: Record<string, React.CSSProperties> = {
  kaydir: { overflowX: 'auto', width: '100%' },
  tablo: {
    borderCollapse: 'separate',
    borderSpacing: 3,
    width: '100%',
    minWidth: 860,
  },
  kose: {
    position: 'sticky',
    left: 0,
    zIndex: 3,
    background: '#0d0d0d',
    textAlign: 'left',
    padding: '8px 10px',
    fontSize: 11,
    letterSpacing: '0.06em',
    color: '#888',
    minWidth: 150,
  },
  gunBaslik: {
    background: '#161616',
    borderRadius: 8,
    padding: '6px 4px',
    minWidth: 92,
    border: '1px solid #222',
  },
  gunAd: {
    fontSize: 12,
    fontWeight: 700,
    fontFamily: 'Bricolage Grotesque, sans-serif',
    display: 'flex',
    gap: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gunTarih: { fontSize: 10, color: '#666', marginTop: 1 },
  uyariNokta: { color: '#F4DF16', fontSize: 11 },
  metaBaslik: {
    background: '#161616',
    borderRadius: 8,
    padding: '6px 8px',
    fontSize: 10.5,
    color: '#888',
    minWidth: 110,
    border: '1px solid #222',
  },
  blokBaslik: {
    textAlign: 'left',
    padding: '10px 10px 4px',
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.12em',
    color: '#F4DF16',
    fontFamily: 'Bricolage Grotesque, sans-serif',
  },
  adHucre: {
    position: 'sticky',
    left: 0,
    zIndex: 2,
    background: '#111',
    textAlign: 'left',
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid #1d1d1d',
    minWidth: 150,
    maxWidth: 170,
  },
  ad: { display: 'block', fontWeight: 600, fontSize: 13.5, color: '#ededed' },
  ozet: { fontSize: 10.5, color: '#666', fontFamily: 'JetBrains Mono, monospace' },
  hucre: {
    textAlign: 'center',
    padding: '7px 3px',
    borderRadius: 8,
    border: '1px solid',
    cursor: 'pointer',
    height: 46,
    verticalAlign: 'middle',
    transition: 'filter .1s',
  },
  hucreUst: {
    display: 'block',
    fontSize: 8.5,
    fontWeight: 800,
    letterSpacing: '0.04em',
    color: '#f0d96a',
    marginBottom: 1,
  },
  metaHucre: { padding: 0 },
  metaGiris: {
    width: '100%',
    background: '#141414',
    border: '1px solid #222',
    borderRadius: 8,
    color: '#cfcfcf',
    padding: '8px 8px',
    fontSize: 12,
    minWidth: 110,
  },
  bos: { textAlign: 'center', color: '#666', padding: 40 },
};
