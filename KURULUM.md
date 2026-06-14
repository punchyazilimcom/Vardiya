# Başak Vardiya — Kurulum & Dağıtım

Başak Kır Pidesi 4 şube haftalık vardiya yönetimi. Tek kod tabanı; **web**,
**Windows (.exe)** ve **Android (APK)** olarak aynı build'den çalışır.

- **Stack:** React 18 + Vite + TypeScript + Firebase (Firestore + Auth)
- **Masaüstü:** Electron + electron-builder (NSIS)
- **Mobil:** Capacitor (Android), `appId: tr.com.basak.vardiya`
- **Firebase projesi:** `vardiya-9b064` (region `europe-west1`)
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

> Gerçek `vardiya-9b064` web config'i `src/firebase.ts` içine **gömülüdür**;
> bu yüzden `npm run dev`/build doğrudan çalışır, `.env` zorunlu değildir.
> Başka bir projeye taşımak isterseniz `.env` ile override edebilirsiniz
> (`cp .env.example .env`).

1. Firebase Console → **Authentication → Sign-in method** içinde **Anonymous**
   girişini etkinleştirin (uygulama anonim giriş kullanır; PIN rol kontrolü
   istemci tarafındadır). **Bu adım zorunludur** — yoksa veri okunup yazılamaz.
2. Firestore kuralları için `firestore.rules` dosyasını deploy edin:
   ```bash
   firebase deploy --only firestore:rules
   ```
   > Kurallar yalnızca `vardiya/` ad alanını yönetir; başka koleksiyon tanımı
   > içermez, dolayısıyla diğer modüllerin kurallarını bozmaz. (Diğer modüllerin
   > kuralları kendi deploy'larında durur — `firestore.rules` dosyanızda hepsini
   > birlikte tutuyorsanız bu blokları birleştirin.)

## 3) Seed verisi (4 şube ön ayarları + örnek hafta)

Config gömülü olduğu için doğrudan çalışır (Anonymous giriş açık olmalı):

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

## 5b) Firebase Hosting (hızlı ücretsiz canlı link)

Hostinger yerine (veya ön izleme için) tek komutla canlı yayın. Proje
`.firebaserc` içinde `vardiya-9b064` olarak ayarlıdır.

İlk kez (bir bilgisayarda):
```bash
npm i -g firebase-tools     # yoksa
firebase login
```

Yayınla:
```bash
npm run build
firebase deploy --only hosting
# veya kurallarla birlikte:  firebase deploy --only hosting,firestore:rules
```

Çıkan canlı adres:
- `https://vardiya-9b064.web.app`
- `https://vardiya-9b064.firebaseapp.com`

> `firebase.json` SPA fallback (tüm yollar → `index.html`) ve statik varlık
> önbellekleme ile birlikte gelir. Build her güncellendiğinde `firebase deploy
> --only hosting` tekrar çalıştırılır.

## 5c) Bilgisayarsız otomatik deploy (GitHub Actions — telefondan)

Bilgisayarın yoksa: kod GitHub'a her push edildiğinde sunucuda build alınıp
Firebase Hosting'e + Firestore kurallarına otomatik yayınlanır
(`.github/workflows/deploy.yml`). Tek seferlik tek bir ayar gerekir — hepsi
telefon tarayıcısından yapılabilir:

1. **Servis hesabı anahtarı al:** Firebase Console → ⚙ Proje ayarları →
   **Servis hesapları** → **Yeni özel anahtar oluştur**. İnen `.json` dosyasını
   aç, **tüm içeriğini** kopyala.
2. **GitHub'a secret ekle:** `github.com/punchyazilimcom/Vardiya` → **Settings**
   → **Secrets and variables → Actions** → **New repository secret**.
   - Name: `FIREBASE_SERVICE_ACCOUNT`
   - Secret: (1. adımdaki JSON'un tamamı)
3. **Actions** sekmesi → "Deploy" workflow → **Run workflow** (ya da herhangi bir
   push). Yeşil tamamlanınca site canlıdır:
   - `https://vardiya-9b064.web.app`

> Bu workflow `main` ve geliştirme dalına push olunca da otomatik çalışır.
> Konsolda **Anonymous** girişin açık ve **Firestore database**'in oluşturulmuş
> olması gerekir (bkz. bölüm 2 ve aşağıdaki not).

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

## 8) Bilgisayarsız kurulum dosyası (.exe + .apk) — telefondan

Bilgisayarın yoksa, kurulum dosyalarını GitHub sunucusunda üretip telefondan
indirebilirsin (`.github/workflows/build-installers.yml`). Hiçbir sır/secret
gerekmez.

**Çalıştırma (telefon tarayıcısından):**
1. `github.com/punchyazilimcom/Vardiya` → **Actions** sekmesi
2. Sol listeden **"Kurulum dosyaları (Windows .exe + Android .apk)"**
3. Sağda **Run workflow** → dalı seç → **Run workflow**
4. Yeşil bitince işe gir → en altta **Artifacts**:
   - **windows-exe** → `Basak Vardiya Setup 1.0.0.exe` (Windows kurulumu)
   - **android-apk** → `basak-vardiya.apk` (Android kurulumu)

> ⚠️ **Run workflow** butonu yalnızca workflow dosyası **varsayılan dalda**
> (main) varken görünür. Bu yüzden bu workflow'u önce `main`'e merge et.

**Telefona APK kurulumu:** indirilen `basak-vardiya.apk`'yı aç → Android
"bilinmeyen kaynaklara izin ver" dediğinde onayla → kur. (APK *debug/imzasız*
olduğundan Play Store dışı kurulumdur; iç kullanım için yeterlidir.)

**Windows kurulumu:** `.exe` imzasız olduğundan SmartScreen "Daha fazla bilgi →
Yine de çalıştır" diyebilir (normaldir), sonra normal kurulum sihirbazı gelir.

**Sürümle yayınlama (opsiyonel):** Bir sürüm etiketi push edersen workflow her
iki dosyayı da otomatik bir **GitHub Release**'e ekler (sabit indirme linki):
```bash
git tag v1.0.0 && git push origin v1.0.0
```
→ `github.com/punchyazilimcom/Vardiya/releases` altında `.exe` + `.apk` hazır.

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
