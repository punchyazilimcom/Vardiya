import { useState, useRef } from 'react';
import { useStore } from '../store';
import type { Personel, Rol } from '../types';
import { subeAd } from '../constants';

interface Props {
  onKapat: () => void;
}

function bosPersonel(rol: Rol, sira: number): Personel {
  return {
    id: 'p_' + Math.random().toString(36).slice(2, 10),
    ad: '',
    rol,
    sira,
    aktif: true,
    izinGunu: '',
    not: '',
  };
}

export default function PersonnelManager({ onKapat }: Props) {
  const { personeller, aktifSube, kaydetPersonel, silPersonel, yenidenSirala } = useStore();
  const [duzenle, setDuzenle] = useState<Personel | null>(null);
  const [yeni, setYeni] = useState(false);
  const surukleId = useRef<string | null>(null);

  const ustalar = personeller.filter((p) => p.rol === 'usta');
  const tezgahlar = personeller.filter((p) => p.rol === 'tezgahtar');

  function düzenleAc(p: Personel) {
    setDuzenle({ ...p });
    setYeni(false);
  }
  function yeniAc(rol: Rol) {
    const sonSira = personeller.length;
    setDuzenle(bosPersonel(rol, sonSira));
    setYeni(true);
  }

  async function kaydet() {
    if (!duzenle || !duzenle.ad.trim()) return;
    // Firestore undefined kabul etmez → boş string'e indir
    await kaydetPersonel({
      ...duzenle,
      ad: duzenle.ad.trim(),
      telefon: duzenle.telefon ?? '',
      iban: duzenle.iban ?? '',
      iseGiris: duzenle.iseGiris ?? '',
      tcKimlik: duzenle.tcKimlik ?? '',
      dogumTarihi: duzenle.dogumTarihi ?? '',
      maas: duzenle.maas ?? '',
      izinHakki: duzenle.izinHakki ?? '',
    });
    setDuzenle(null);
    setYeni(false);
  }

  async function sil(p: Personel) {
    if (!confirm(`${p.ad} silinsin mi? (Geçmiş haftalar korunur)`)) return;
    await silPersonel(p.id);
  }

  async function birak(rolListe: Personel[], hedefId: string) {
    const kaynak = surukleId.current;
    surukleId.current = null;
    if (!kaynak || kaynak === hedefId) return;
    const ids = rolListe.map((p) => p.id);
    const from = ids.indexOf(kaynak);
    const to = ids.indexOf(hedefId);
    if (from < 0 || to < 0) return;
    const yeniListe = [...rolListe];
    const [tasinan] = yeniListe.splice(from, 1);
    yeniListe.splice(to, 0, tasinan);
    // global sıra: usta bloğu önce, sonra tezgah; bu role özgü yeniden sırala
    const digerRol = rolListe[0].rol === 'usta' ? tezgahlar : ustalar;
    const birlesik = rolListe[0].rol === 'usta' ? [...yeniListe, ...digerRol] : [...digerRol, ...yeniListe];
    await yenidenSirala(birlesik);
  }

  function blok(baslik: string, liste: Personel[], rol: Rol) {
    return (
      <div style={{ marginBottom: 18 }}>
        <div style={s.blokSatir}>
          <span style={s.blokBaslik}>{baslik}</span>
          <button className="btn kucuk vurgu" onClick={() => yeniAc(rol)}>
            + Ekle
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
          {liste.map((p) => (
            <div
              key={p.id}
              draggable
              onDragStart={() => (surukleId.current = p.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => birak(liste, p.id)}
              style={{ ...s.satir, opacity: p.aktif ? 1 : 0.5 }}
            >
              <span style={s.tut}>⠿</span>
              <span style={{ flex: 1, fontWeight: 600 }}>
                {p.ad}
                {!p.aktif && <span style={s.pasif}> (pasif)</span>}
              </span>
              <button className="btn kucuk" onClick={() => düzenleAc(p)}>
                Düzenle
              </button>
              <button className="btn kucuk tehlike" onClick={() => sil(p)}>
                Sil
              </button>
            </div>
          ))}
          {liste.length === 0 && <div style={s.bos}>Henüz yok.</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="ortu" onClick={onKapat}>
      <div className="sayfa" onClick={(e) => e.stopPropagation()}>
        <div style={s.ust}>
          <div>
            <h3 style={{ fontSize: 18 }}>Personel Yönetimi</h3>
            <div style={{ color: '#888', fontSize: 13 }}>{subeAd(aktifSube)} şubesi</div>
          </div>
          <button className="btn kucuk" onClick={onKapat}>
            Kapat
          </button>
        </div>

        {!duzenle ? (
          <div style={{ marginTop: 16 }}>
            {blok('USTALAR', ustalar, 'usta')}
            {blok('TEZGAHTAR', tezgahlar, 'tezgahtar')}
            <p style={s.ipucu}>Sıralamayı sürükleyerek değiştirin (⠿).</p>
          </div>
        ) : (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ fontSize: 15 }}>{yeni ? 'Yeni Personel' : 'Personel Düzenle'}</h3>
            <div>
              <label className="etiket">Ad Soyad</label>
              <input
                className="giris"
                autoFocus
                value={duzenle.ad}
                onChange={(e) => setDuzenle({ ...duzenle, ad: e.target.value })}
              />
            </div>
            <div>
              <label className="etiket">Rol</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                {(['usta', 'tezgahtar'] as Rol[]).map((r) => (
                  <button
                    key={r}
                    className="btn"
                    style={{ flex: 1, ...(duzenle.rol === r ? { borderColor: '#F4DF16', color: '#F4DF16' } : {}) }}
                    onClick={() => setDuzenle({ ...duzenle, rol: r })}
                  >
                    {r === 'usta' ? 'Usta' : 'Tezgahtar'}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label className="etiket">İzin Günü</label>
                <input
                  className="giris"
                  placeholder="Örn: Pazartesi"
                  value={duzenle.izinGunu}
                  onChange={(e) => setDuzenle({ ...duzenle, izinGunu: e.target.value })}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="etiket">Not</label>
                <input
                  className="giris"
                  value={duzenle.not}
                  onChange={(e) => setDuzenle({ ...duzenle, not: e.target.value })}
                />
              </div>
            </div>
            <div style={{ borderTop: '1px solid #222', paddingTop: 12 }}>
              <div style={s.blokBaslik}>ÖZLÜK BİLGİLERİ</div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <div style={{ flex: 1 }}>
                  <label className="etiket">Telefon</label>
                  <input
                    className="giris mono"
                    inputMode="tel"
                    placeholder="05__ ___ __ __"
                    value={duzenle.telefon ?? ''}
                    onChange={(e) => setDuzenle({ ...duzenle, telefon: e.target.value })}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="etiket">İşe Giriş</label>
                  <input
                    className="giris"
                    type="date"
                    value={duzenle.iseGiris ?? ''}
                    onChange={(e) => setDuzenle({ ...duzenle, iseGiris: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ marginTop: 8 }}>
                <label className="etiket">IBAN</label>
                <input
                  className="giris mono"
                  placeholder="TR__ ____ ____ ____ ____ ____ __"
                  value={duzenle.iban ?? ''}
                  onChange={(e) => setDuzenle({ ...duzenle, iban: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <div style={{ flex: 1 }}>
                  <label className="etiket">T.C. Kimlik</label>
                  <input
                    className="giris mono"
                    inputMode="numeric"
                    value={duzenle.tcKimlik ?? ''}
                    onChange={(e) => setDuzenle({ ...duzenle, tcKimlik: e.target.value })}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="etiket">Doğum Tarihi</label>
                  <input
                    className="giris"
                    type="date"
                    value={duzenle.dogumTarihi ?? ''}
                    onChange={(e) => setDuzenle({ ...duzenle, dogumTarihi: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <div style={{ flex: 1 }}>
                  <label className="etiket">Maaş (₺)</label>
                  <input
                    className="giris mono"
                    inputMode="numeric"
                    placeholder="Örn: 45000"
                    value={duzenle.maas ?? ''}
                    onChange={(e) => setDuzenle({ ...duzenle, maas: e.target.value })}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="etiket">İzin Hakkı (gün)</label>
                  <input
                    className="giris mono"
                    inputMode="numeric"
                    placeholder="Örn: 14"
                    value={duzenle.izinHakki ?? ''}
                    onChange={(e) => setDuzenle({ ...duzenle, izinHakki: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <label style={s.checkbox}>
              <input
                type="checkbox"
                checked={duzenle.aktif}
                onChange={(e) => setDuzenle({ ...duzenle, aktif: e.target.checked })}
              />
              Aktif (pasif personel tabloda görünmez)
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" style={{ flex: 1 }} onClick={() => setDuzenle(null)}>
                Vazgeç
              </button>
              <button className="btn dolu" style={{ flex: 1 }} onClick={kaydet} disabled={!duzenle.ad.trim()}>
                Kaydet
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  ust: { display: 'flex', justifyContent: 'space-between', alignItems: 'start' },
  blokSatir: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  blokBaslik: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.12em',
    color: '#F4DF16',
    fontFamily: 'Bricolage Grotesque, sans-serif',
  },
  satir: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '9px 10px',
    background: '#161616',
    border: '1px solid #242424',
    borderRadius: 9,
  },
  tut: { color: '#555', cursor: 'grab', fontSize: 15 },
  pasif: { color: '#777', fontSize: 12, fontWeight: 400 },
  bos: { color: '#666', fontSize: 13, padding: '4px 2px' },
  ipucu: { color: '#666', fontSize: 12 },
  checkbox: { display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: '#bbb' },
};
