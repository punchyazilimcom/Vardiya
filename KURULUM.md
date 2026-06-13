# Başak Vardiya — Kurulum & Dağıtım

Başak Kır Pidesi 4 şube haftalık vardiya yönetimi. Tek kod tabanı; **web**,
**Windows (.exe)** ve **Android (APK)** olarak aynı build'den çalışır.

- **Stack:** React 18 + Vite + TypeScript + Firebase (Firestore + Auth)
- **Masaüstü:** Electron + electron-builder (NSIS)
- **Mobil:** Capacitor (Android), `appId: tr.com.basak.vardiya`
- **Firebase projesi:** `basak-app-e7a0c` (region `europe-west1`)
- Tüm vardiya verisi Firestore'da **`vardiya/`** ad alanı altında tutulur — diğer modüllere dokunmaz.

---

## 1) Gereksinimler

- Node.js 20+ (önerilen 22)
- npm 10+
- (Android için) Android Studio + JDK 17
- (Windows .exe için) Windows ya da Wine'lı bir ortamda `electron-builder`

```bash
npm install
```

## 2) Firebase yapılandırması (nereye?)

1. `.env.example` dosyasını `.env` olarak kopyalayın:
   ```bash
   cp .env.example .env
   ```
2. Firebase Console → **Proje Ayarları → Genel → Web App → SDK setup** altındaki
   değerleri `.env` içine yazın (`VITE_FIREBASE_*`).
3. Firebase Console → **Authentication → Sign-in method** içinde **Anonymous**
   girişini etkinleştirin (uygulama anonim giriş kullanır; PIN rol kontrolü
   istemci tarafındadır).
4. Firestore kuralları için `firestore.rules` dosyasını deploy edin:
   ```bash
   firebase deploy --only firestore:rules
   ```
   > Kurallar yalnızca `vardiya/` ad alanını yönetir; başka koleksiyon tanımı
   > içermez, dolayısıyla diğer modüllerin kurallarını bozmaz. (Diğer modüllerin
   > kuralları kendi deploy'larında durur — `firestore.rules` dosyanızda hepsini
   > birlikte tutuyorsanız bu blokları birleştirin.)

## 3) Seed verisi (4 şube ön ayarları + örnek hafta)

`.env` dolu olmalı. Sonra:

```bash
npm run seed
```

Bu script şunları yükler:
- 4 şubenin saat ön ayarları (`vardiya/onayarlar/sube/{sube}`)
  - Bahçelievler için usta açılış `07:15-17:15`, tezgah açılış `08:00-18:00` override'ı dahil.
- Her şube için örnek personel (`vardiya/personel/{sube}/{id}`)
- İçinde bulunulan hafta için örnek grid (`vardiya/haftalar/{sube}/{isoHafta}`)

## 4) Geliştirme

```bash
npm run dev          # http://localhost:5173
npm run electron:dev # Electron penceresinde canlı geliştirme
```

**Giriş PIN'leri:** PATRON `9999` (tüm şubeler, tam yetki) · MÜDÜR `1111`
(giriş sonrası şube seçer, o şubeye kilitlenir).

---

## 5) Web dağıtımı (Hostinger)

```bash
npm run build
```

`dist/` klasörünün **içeriğini** Hostinger `public_html` altına yükleyin.
`dist/.htaccess` SPA fallback için otomatik üretilir ve dahildir — derin linkler
`index.html`'e düşer. (Dosya gizli olduğundan FTP istemcinizde "gizli dosyaları
göster" açık olsun.)

## 6) Android (imzalı APK)

İlk kurulum (bir kez):
```bash
npm run build
npx cap add android
npx cap sync android
```

Keystore oluştur (bir kez) ve `android/key.properties` yaz:
```bash
keytool -genkey -v -keystore basak-vardiya.keystore \
  -alias basak -keyalg RSA -keysize 2048 -validity 10000
```

`android/key.properties`:
```
storeFile=../../basak-vardiya.keystore
storePassword=KEYSTORE_SIFRESI
keyAlias=basak
keyPassword=ANAHTAR_SIFRESI
```

`android/app/build.gradle` içine imzalama yapılandırmasını ekleyin:
```gradle
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file("key.properties")
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    signingConfigs {
        release {
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
        }
    }
}
```

İmzalı APK üret:
```bash
npm run build && npx cap sync android
cd android && ./gradlew assembleRelease
# Çıktı: android/app/build/outputs/apk/release/app-release.apk
```

> Her web değişikliğinden sonra: `npm run build && npx cap sync android`.

## 7) Windows (.exe)

```bash
npm run electron:build
# Çıktı: release/Basak Vardiya Setup 1.0.0.exe  (NSIS kurulum)
```

> İkon istiyorsanız `build/icon.ico` ekleyin (electron-builder otomatik alır).

---

## Özellikler (özet)

- 4 şube · Pazartesi→Pazar haftalık grid · ◀ Bu Hafta ▶ gezgini
- Hücre tipleri: vardiya grubu (açılış/aracı/kapanış, saat ön ayardan), özel
  saat, durum (izinli/senelik/bayram/full/h.k./boş), **başka şube** etiketli hücre
- Saat ön ayarları ekranı (genel + şubeye özel override)
- Personel CRUD + sürükle-sırala + pasife alma (silinen personelin geçmiş
  haftaları `personelSnapshot` ile korunur)
- **Geçen haftayı kopyala** (izin günü + notlar dahil)
- PDF (tek şube ve 4 sayfalık tüm şubeler; yatay A4; gömülü DejaVu fontu ile
  Türkçe karakterler bozulmaz; grup renkleri korunur)
- Excel içe/dışa aktarma (sayfa=şube, A=ad, C:I=günler, J=izin, K=not;
  "BATIKENT 08:00-18:00" / İZİNLİ / FULL gibi işaretleri ayrıştırır)
- Kapsam uyarısı (açılışta usta / kapanışta tezgahtar yoksa gün başlığında rozet)
- Haftalık özet (kişi başı çalışma günü + izin sayısı)
- Başka şubeden gelenler paneli (çapraz şube görünürlüğü)
- Offline-first (Firestore kalıcı önbellek) + debounce'lu otomatik kaydet

## Veri modeli (Firestore)

```
vardiya/personel/{sube}/{id}        { ad, rol, sira, aktif, izinGunu, not }
vardiya/onayarlar/sube/{sube}       { genel:{usta,tezgah}, override? }
vardiya/haftalar/{sube}/{isoHafta}  { baslangic, bitis, hucreler, personelSnapshot, guncelleyen, guncelTarih }
```

— PUNCHYAZILIM
