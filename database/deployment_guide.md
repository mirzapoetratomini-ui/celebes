# Panduan Penerapan (Deployment Guide) Celebes Event ke Hosting

Aplikasi ini dibangun menggunakan **Node.js (Express + React Vite)** dengan dukungan database **MySQL / MariaDB (MySQLi)** yang siap langsung diunggah dan dijalankan di berbagai jenis hosting:

1. **cPanel Shared Hosting (Setup Node.js App)**
2. **VPS (Ubuntu / Debian / CentOS dengan Nginx & PM2)**
3. **Cloud Run / Docker Container**

---

## 1. Import Database ke MySQL Hosting (cPanel IDwebhost / phpMyAdmin)

1. Buka **phpMyAdmin** dari cPanel hosting Anda.
2. Di bilah menu sebelah kiri, klik nama database Anda: **`bergulir_celebeseventok`** (atau `bergulir_celebesevent`).
3. Klik tab **Impor / Import** di menu bagian atas.
4. Klik tombol **Choose File / Pilih File**, lalu pilih file **`database/schema.sql`** dari project ini.
5. Gulir ke bawah dan klik tombol **Kirim / Go**.
6. Status akan langsung berhasil (*sukses warna hijau*) dan seluruh tabel (`users`, `events`, `ticket_tiers`, `orders`, `tickets`, `vouchers`, `support_tickets`, `faqs`, dll) selesai dibuat.

---

## 2. Konfigurasi Environment (`.env`) di Hosting & Sandi Super Admin

Anda dapat mengatur sandi dan email Super Admin langsung dari file `.env` tanpa perlu mengubah kode sumber!
Buat atau edit file `.env` di direktori aplikasi hosting Anda (melalui cPanel File Manager):

```env
PORT=3000
NODE_ENV=production

# 1. Kredensial Resmi Super Administrator (Bergulir Media)
# Atur sandi Super Admin yang aman dan rahasia di sini:
SUPERADMIN_EMAIL=redaksibergulircom@gmail.com
SUPERADMIN_PASSWORD=Bergulir2026!#
SUPERADMIN_NAME=Super Admin Bergulir Media

# 2. Konfigurasi Koneksi MySQL Hosting:
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=bergulir_userdb
MYSQL_PASSWORD=PasswordUserDatabaseAnda123!
MYSQL_DATABASE=bergulir_celebeseventok

# 3. URL Domain Anda
APP_URL=https://event.bergulir.com
```

---

## 3. Mengatasi Kendala "Gangguan Pemuatan Aset /src/main.tsx" di Hosting

Jika saat membuka website muncul pesan:
> `⚠️ Terjadi Gangguan Pemuatan Aset`
> `Browser gagal memuat berkas frontend berikut: • https://.../src/main.tsx`

**Penyebabnya:**
Browser pengguna meminta berkas mentah `/src/main.tsx` karena web server Apache/LiteSpeed di cPanel melayani berkas `index.html` mode pengembangan mentah, atau proses `npm run build` belum dijalankan di cPanel untuk menghasilkan folder `dist/` terkompilasi.

**Solusi Cepat & Permanen:**
1. **Cara 1 (Rekomendasi via cPanel Terminal):**
   Masuk ke Terminal cPanel atau SSH, lalu jalankan:
   ```bash
   npm run build
   ```
   Perintah ini akan secara otomatis mengkompilasi file frontend React menjadi bundle JavaScript produksi di `dist/` dan `public/`.
2. **Cara 2 (Gunakan Berkas Siap Tayang):**
   Pastikan folder `dist/` atau `public/` hasil build ikut diunggah ke direktori hosting Anda.
3. Berkas `.htaccess` terbaru telah diperbarui dengan aturan pemblokiran otomatis terhadap `/src/*` dan langsung mengarahkan pengunjung ke bundle produksi terkompilasi (`dist/index.html`).

---

## 4. Keamanan Akses Super Admin & Beranda Tamu (Guest Mode)

Platform Celebes Event kini dilengkapi proteksi keamanan berlapis:
1. **Tidak Ada Auto-Login Super Admin**: Saat siapapun membuka alamat beranda utama (`event.bergulir.com`), sistem **SELALU berada dalam mode Tamu / Pengunjung Publik (`guest mode`)**. Akun Super Admin tidak pernah masuk secara otomatis.
2. **Sesi Tertutup (Session Isolation)**: Sesi Super Admin hanya disimpan di `sessionStorage` (akan otomatis terhapus saat tab atau browser ditutup), tidak tersimpan di `localStorage` publik.
3. **Autentikasi Sandi Wajib**: Untuk masuk ke Pusat Kendali Super Admin, klik tombol **"Masuk ke Akun"** > masukkan email dan password yang telah Anda tentukan di variabel `.env` (`SUPERADMIN_PASSWORD`).
4. **Akun Resmi**:
   - **Super Admin Resmi**: Email dan Sandi dikonfigurasi melalui `.env` (`SUPERADMIN_EMAIL` & `SUPERADMIN_PASSWORD`).
   - **Kreator Event Demo**: `kreator@celebescreative.id` | Password: `kreator123`
   - **Peserta / User Demo**: `budi.santoso@gmail.com` | Password: `demo123`

---

## 5. Alur Pendaftaran Kreator Google & Persetujuan Admin Pusat

1. **Pendaftaran Akun Google**: Calon Kreator dapat mendaftar langsung menggunakan Akun Google ("Daftar Kreator dengan Akun Google").
2. **Status Menunggu Persetujuan (`pending_approval`)**:
   - Setelah mendaftar, kreator berstatus *Menunggu Persetujuan* dari Admin Pusat.
   - Kreator tidak dapat mempublikasikan event hingga disetujui.
3. **Persetujuan oleh Admin Pusat**:
   - Super Admin membuka menu **Pengguna & Kreator** > sub-tab **Menunggu Persetujuan**.
   - Admin memeriksa profil lalu menekan tombol **"Setujui & Kirim Email"**.
4. **Notifikasi Email Otomatis**:
   - Sistem secara otomatis mengirimkan surat email resmi persetujuan & aktivasi akun ke alamat email Kreator.
   - Admin dapat meninjau isi email di sub-tab **Log Email Persetujuan Terkirim** serta pratinjau surat email HTML.
