# Kirpi Task & Team Hub - Masaüstü (Electron) Derleme Rehberi

Bu proje **Electron** ile doğrudan masaüstü uygulaması olarak çalıştırılabilir ve **Windows**, **macOS** veya **Linux** için `.exe`, `.dmg`, `.AppImage` ya da `.deb` kurulum paketlerine dönüştürülebilir.

---

## 🚀 Hızlı Başlangıç (Bilgisayarınıza İndirdikten Sonra)

### 1. Gereksinimler
- **Node.js**: Sürüm 18.x veya üzeri (Önerilen: Node 20 LTS)
- **NPM**: Node.js ile birlikte gelir

### 2. Bağımlılıkları Yükleme
Terminal / Komut Satırında proje ana dizinindeyken:
```bash
npm install
```

---

## 🛠️ Geliştirme Modunda Çalıştırma (Dev Mode)

Masaüstü uygulamasını yerel geliştirme ortamında başlatmak için:
```bash
npm run electron:dev
```
*Bu komut önce Vite sunucusunu başlatır, ardından Electron penceresini açar.*

---

## 📦 Masaüstü Kurulum Dosyalarını Derleme (Build & Package)

Tüm işletim sistemleri için derleme komutları hazır durumdadır:

### 🪟 Windows (.exe - NSIS Kurulum ve Taşınabilir Portable)
```bash
npm run electron:build:win
```
Çıktı konumu: `dist-electron/Kirpi Task & Team Hub Setup 1.0.0.exe`

### 🍎 macOS (.dmg ve .zip)
```bash
npm run electron:build:mac
```
Çıktı konumu: `dist-electron/Kirpi Task & Team Hub-1.0.0.dmg`

### 🐧 Linux (.AppImage ve .deb)
```bash
npm run electron:build:linux
```
Çıktı konumu: `dist-electron/Kirpi Task & Team Hub-1.0.0.AppImage`

### 🌐 Otomatik Algılama (Bulunduğunuz İşletim Sistemi)
```bash
npm run electron:build
```

### 📁 Kurulum Dosyası Olmadan Sadece Klasör Halinde Çıktı Alma (Unpacked)
```bash
npm run electron:dir
```
Çıktı: `dist-electron/win-unpacked/` veya `dist-electron/mac/` klasöründe doğrudan çalıştırılabilir dosya.

---

## ⚙️ Yapılandırma Özeti
- **Ana İşlem (Main Process)**: `electron/main.cjs`
- **Köprü / Preload**: `electron/preload.cjs` (Güvenli `contextBridge` ile `electronAPI`)
- **Pencere Çubuğu & Kontroller**: Çerçevesiz (Frameless) modern pencere çubuğu, sürükleme bölgesi desteği (`electron-drag-region`) ve simge durumuna küçült / tam ekran / kapat düğmeleri ile tam entegre.
- **Veritabanı & Gerçek Zamanlı Eşitleme**: Firebase Firestore & Auth, masaüstü ortamında da sorunsuz çalışır.
