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

## 2. Konfigurasi Environment (`.env`) di Hosting

Buat file `.env` di root direktori aplikasi hosting Anda:

```env
PORT=3000
NODE_ENV=production

# Konfigurasi Koneksi MySQL Hosting:
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=bergulir_userdb
MYSQL_PASSWORD=PasswordUserDatabaseAnda123!
MYSQL_DATABASE=bergulir_celebeseventok

# URL Domain Anda
APP_URL=https://nama-domain-anda.com
```

---

## 3. Langkah Deploy di cPanel (Node.js Selector)

1. Buka menu **Setup Node.js App** di cPanel.
2. Klik **Create Application**:
   - **Node.js version**: Pilih versi `18.x`, `20.x`, atau `22.x`.
   - **Application mode**: `Production`.
   - **Application root**: `public_html` atau subfolder misal `celebesapp`.
   - **Application URL**: Pilih domain atau subdomain Anda.
   - **Application startup file**: `server.ts` atau `dist/server.js`.
3. Upload seluruh file project (kecuali folder `node_modules` untuk menghemat kuota upload).
4. Di halaman Setup Node.js App, klik tombol **Run NPM Install**.
5. Jalankan perintah build:
   ```bash
   npm run build
   ```
6. Klik **Restart Application**. Website Anda langsung online!

---

## 4. Akun Resmi Bawaan & Wajib Password

Seluruh login sistem sekarang menerapkan verifikasi keamanan password:

- **Super Admin Utama (Pemilik Pusat)**: `redaksibergulircom@gmail.com` | Password: `Bergulir2026!#`
- **Super Admin Alternatif**: `admin@celebes-event.com` | Password: `demo123`
- **Kreator Event Aktif**: `kreator@celebescreative.id` | Password: `kreator123`
- **Kreator Menunggu Persetujuan (Pending Approval)**: `makassarmusic@gmail.com` | Password: `kreator123`
- **Peserta / Pendaftar**: `budi.santoso@gmail.com` | Password: `demo123`

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
