import { useState, useRef } from 'react';
import { useStore } from './store';
import { SUBELER, subeAd, MARKA } from './constants';
import { haftaAralik, aralikEtiket } from './lib/week';
import * as repo from './lib/repo';
import PinLogin from './components/PinLogin';
import ShiftTable from './components/ShiftTable';
import PersonnelManager from './components/PersonnelManager';
import TimeSettings from './components/TimeSettings';
import CrossBranchPanel from './components/CrossBranchPanel';
import SaveIndicator from './components/SaveIndicator';
import type { SubeKod } from './types';

type Modal = 'personel' | 'saat' | 'capraz' | 'menu' | null;

export default function App() {
  const {
    oturum,
    aktifSube,
    aktifTarih,
    kayitDurumu,
    personeller,
    hafta,
    onayar,
    setSube,
    haftaGeri,
    haftaIleri,
    buHafta,
    geceniHaftayiKopyala,
    cikis,
  } = useStore();

  const [modal, setModal] = useState<Modal>(null);
  const [mesaj, setMesaj] = useState('');
  const [mesgul, setMesgul] = useState(false);
  const dosyaRef = useRef<HTMLInputElement>(null);

  if (!oturum) return <PinLogin />;

  const a = haftaAralik(aktifTarih);
  const mudur = oturum.yetki === 'mudur';

  function bildir(t: string) {
    setMesaj(t);
    setTimeout(() => setMesaj(''), 2600);
  }

  // Tüm şubelerin geçerli hafta verisini topla (PDF/Excel "tüm şubeler" için).
  async function tumVeri() {
    const iso = a.anahtar;
    return Promise.all(
      SUBELER.map(async (sb) => ({
        sube: sb.kod,
        personeller: await repo.getPersonel(sb.kod),
        hafta: await repo.getHafta(sb.kod, iso),
        onayar: await repo.getOnayar(sb.kod).catch(() => repo.varsayilanOnayar(sb.kod)),
      })),
    );
  }

  async function pdfYap(tum: boolean) {
    setMesgul(true);
    setModal(null);
    try {
      const { pdfOlustur, pdfDosyaAdi } = await import('./lib/pdf');
      const { dosyaPaylasVeyaIndir, ESM } = await import('./lib/platform');
      const veriler = tum
        ? await tumVeri()
        : [{ sube: aktifSube, personeller, hafta, onayar }];
      const blob = pdfOlustur(veriler, aktifTarih);
      await dosyaPaylasVeyaIndir(blob, pdfDosyaAdi(veriler, aktifTarih), ESM.pdf);
      bildir('PDF hazır.');
    } catch (e) {
      console.error(e);
      bildir('PDF oluşturulamadı.');
    } finally {
      setMesgul(false);
    }
  }

  async function excelDisa(tum: boolean) {
    setMesgul(true);
    setModal(null);
    try {
      const { disaAktar } = await import('./lib/excel');
      const { dosyaPaylasVeyaIndir, ESM } = await import('./lib/platform');
      const veriler = tum
        ? await tumVeri()
        : [{ sube: aktifSube, personeller, hafta, onayar }];
      const buf = disaAktar(veriler);
      const blob = new Blob([buf], { type: ESM.xlsx });
      const ad = `vardiya_${tum ? 'tum' : aktifSube}_${a.anahtar}.xlsx`;
      await dosyaPaylasVeyaIndir(blob, ad, ESM.xlsx);
      bildir('Excel hazır.');
    } catch (e) {
      console.error(e);
      bildir('Excel oluşturulamadı.');
    } finally {
      setMesgul(false);
    }
  }

  async function excelIce(file: File) {
    setMesgul(true);
    setModal(null);
    try {
      const { iceAktar } = await import('./lib/excel');
      const buf = await file.arrayBuffer();
      const onayarMap = Object.fromEntries(
        await Promise.all(
          SUBELER.map(async (s) => [s.kod, await repo.getOnayar(s.kod).catch(() => repo.varsayilanOnayar(s.kod))]),
        ),
      ) as Record<SubeKod, Awaited<ReturnType<typeof repo.getOnayar>>>;
      let hedefler = iceAktar(buf, aktifTarih, onayarMap);
      // Müdür sadece kendi şubesini içe aktarabilir
      if (mudur) hedefler = hedefler.filter((h) => h.sube === oturum?.sube);
      if (hedefler.length === 0) {
        bildir('Uygun sayfa bulunamadı (sayfa adı şube olmalı).');
        return;
      }
      if (!confirm(`${hedefler.map((h) => subeAd(h.sube)).join(', ')} için ${a.anahtar} haftası içe aktarılsın mı? Mevcut hafta verisi değişebilir.`)) {
        return;
      }
      for (const h of hedefler) {
        for (const p of h.personeller) await repo.kaydetPersonel(h.sube, p);
        await repo.kaydetHafta(h.sube, a.anahtar, h.hafta);
      }
      bildir('İçe aktarma tamam.');
    } catch (e) {
      console.error(e);
      bildir('İçe aktarma başarısız.');
    } finally {
      setMesgul(false);
      if (dosyaRef.current) dosyaRef.current.value = '';
    }
  }

  async function kopyala() {
    setModal(null);
    setMesgul(true);
    const ok = await geceniHaftayiKopyala();
    setMesgul(false);
    bildir(ok ? 'Geçen hafta kopyalandı.' : 'Geçen haftada veri yok.');
  }

  return (
    <div style={s.app}>
      <header style={s.bar}>
        <div style={s.barUst}>
          <div style={s.logo}>
            <span style={{ color: MARKA.sari }}>BAŞAK</span> VARDİYA
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <SaveIndicator durum={kayitDurumu} />
            <button className="btn kucuk" onClick={() => setModal('menu')}>
              ☰ Menü
            </button>
          </div>
        </div>

        {/* Şube seçici */}
        <div style={s.subeler}>
          {SUBELER.map((sb) => {
            const aktif = sb.kod === aktifSube;
            const kilitli = mudur && oturum.sube !== sb.kod;
            return (
              <button
                key={sb.kod}
                onClick={() => !kilitli && setSube(sb.kod)}
                disabled={kilitli}
                style={{
                  ...s.subeChip,
                  ...(aktif ? s.subeAktif : {}),
                  opacity: kilitli ? 0.3 : 1,
                  cursor: kilitli ? 'not-allowed' : 'pointer',
                }}
                title={kilitli ? 'Müdür yetkisi kendi şubenizle sınırlı' : ''}
              >
                {sb.ad}
                {kilitli && ' 🔒'}
              </button>
            );
          })}
        </div>

        {/* Hafta gezgini */}
        <div style={s.hafta}>
          <button className="btn ikon" onClick={haftaGeri} aria-label="Önceki hafta">
            ◀
          </button>
          <button className="btn kucuk" onClick={buHafta}>
            Bu Hafta
          </button>
          <span style={s.aralik} className="mono">
            {aralikEtiket(a)}
          </span>
          <button className="btn ikon" onClick={haftaIleri} aria-label="Sonraki hafta">
            ▶
          </button>
        </div>
      </header>

      <main style={s.icerik}>
        <ShiftTable />
      </main>

      {/* Bildirim */}
      {mesaj && <div style={s.toast}>{mesaj}</div>}
      {mesgul && <div style={s.mesgul}>İşleniyor…</div>}

      {/* Menü */}
      {modal === 'menu' && (
        <div className="ortu" onClick={() => setModal(null)}>
          <div className="sayfa" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 18 }}>Menü</h3>
              <button className="btn kucuk" onClick={() => setModal(null)}>
                Kapat
              </button>
            </div>
            <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
              {oturum.yetki === 'patron' ? 'PATRON' : 'MÜDÜR · ' + subeAd(aktifSube)}
            </div>

            <div style={s.menuGrid}>
              <button className="btn" onClick={() => setModal('personel')}>👥 Personel</button>
              <button className="btn" onClick={() => setModal('saat')}>⏱ Saat Ayarları</button>
              <button className="btn" onClick={() => setModal('capraz')}>↗ Başka Şubeden Gelenler</button>
              <button className="btn" onClick={kopyala}>⧉ Geçen Haftayı Kopyala</button>
            </div>

            <div style={s.menuBaslik}>PDF</div>
            <div style={s.menuGrid}>
              <button className="btn vurgu" onClick={() => pdfYap(false)}>📄 Bu Şube PDF</button>
              {!mudur && <button className="btn vurgu" onClick={() => pdfYap(true)}>📄 Tüm Şubeler (4 sayfa)</button>}
            </div>

            <div style={s.menuBaslik}>Excel</div>
            <div style={s.menuGrid}>
              <button className="btn" onClick={() => excelDisa(false)}>⬇ Bu Şube Dışa</button>
              {!mudur && <button className="btn" onClick={() => excelDisa(true)}>⬇ Tüm Şubeler Dışa</button>}
              <button className="btn" onClick={() => dosyaRef.current?.click()}>⬆ İçe Aktar</button>
            </div>

            <button className="btn tehlike" style={{ width: '100%', marginTop: 16 }} onClick={cikis}>
              Çıkış Yap
            </button>
          </div>
        </div>
      )}

      {modal === 'personel' && <PersonnelManager onKapat={() => setModal(null)} />}
      {modal === 'saat' && <TimeSettings onKapat={() => setModal(null)} />}
      {modal === 'capraz' && <CrossBranchPanel onKapat={() => setModal(null)} />}

      <input
        ref={dosyaRef}
        type="file"
        accept=".xlsx,.xls"
        style={{ display: 'none' }}
        onChange={(e) => e.target.files?.[0] && excelIce(e.target.files[0])}
      />

      <footer style={s.footer}>PUNCHYAZILIM</footer>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  app: { minHeight: '100%', display: 'flex', flexDirection: 'column' },
  bar: {
    position: 'sticky',
    top: 0,
    zIndex: 10,
    background: 'rgba(13,13,13,0.92)',
    backdropFilter: 'blur(8px)',
    borderBottom: '1px solid #1d1d1d',
    padding: '10px 12px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 9,
  },
  barUst: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  logo: {
    fontFamily: 'Bricolage Grotesque, sans-serif',
    fontWeight: 800,
    fontSize: 18,
    letterSpacing: '-0.02em',
  },
  subeler: { display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 },
  subeChip: {
    padding: '7px 13px',
    borderRadius: 999,
    border: '1px solid #2a2a2a',
    background: '#151515',
    color: '#bbb',
    fontWeight: 600,
    fontSize: 13,
    whiteSpace: 'nowrap',
  },
  subeAktif: { background: '#F4DF16', color: '#000', borderColor: '#F4DF16' },
  hafta: { display: 'flex', alignItems: 'center', gap: 8 },
  aralik: { flex: 1, textAlign: 'center', fontSize: 13, color: '#ddd' },
  icerik: { flex: 1, padding: '12px 12px 4px' },
  toast: {
    position: 'fixed',
    bottom: 50,
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#1c1c1c',
    border: '1px solid #333',
    color: '#eee',
    padding: '10px 18px',
    borderRadius: 999,
    fontSize: 13,
    zIndex: 60,
  },
  mesgul: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.5)',
    color: '#eee',
    zIndex: 70,
    fontSize: 14,
  },
  menuGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 },
  menuBaslik: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.1em',
    color: '#F4DF16',
    marginTop: 16,
    fontFamily: 'Bricolage Grotesque, sans-serif',
  },
  footer: { textAlign: 'center', color: '#888', fontSize: 11, padding: '14px 0 18px', letterSpacing: '0.1em' },
};
