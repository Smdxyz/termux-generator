# SannLab Studio — Test Plan & Hasil (Fase 8)

Aturan: test hanya ditandai LULUS bila benar-benar dieksekusi. Status:
**TERBUKTI** = dijalankan & lulus di VM ini · **KODE** = implementasi selesai,
menunggu verifikasi perangkat/APK · **BELUM** = belum dikerjakan.

Suite otomatis: `sannlab-tools/tests/run-tests.js`
(**40 PASS / 0 FAIL**, dijalankan 2026-10-20 di VM, Node v24).

| # | Kasus uji (direktif Fase 8) | Status | Bukti / catatan |
|---|---|---|---|
| 1 | Memilih gambar dari file picker | KODE | Activity settings SAF — verifikasi perangkat |
| 2 | Video wallpaper looping tanpa suara | KODE | ExoPlayer repeat + volume 0 — verifikasi perangkat |
| 3 | Pergantian AMOLED & dark mode | KODE | Properti `sannlab.amoled` + preset colors.properties (file preset terverifikasi ada & valid format) |
| 4 | Background berhenti saat aplikasi tidak aktif | KODE | Pause/release di onPause/onDestroy — verifikasi perangkat |
| 5 | Import project dari Downloads | TERBUKTI | `activate` menyalin source → workspace (test #1 suite) |
| 6 | `npm install` dengan dependency di private HOME | TERBUKTI | node_modules hanya di workspace; dep `file:` menjadi symlink di workspace |
| 7 | Terminal kembali ke folder Downloads | TERBUKTI | Perintah pengguna selalu dijalankan dari cwd source; cwd eksekusi = workspace (desain CLI) |
| 8 | Eksekusi project CommonJS | TERBUKTI | `require('mymod')` dari file: dep — PASS |
| 9 | Eksekusi project ESM | TERBUKTI | `import` + package `exports` — PASS |
| 10 | Isolasi dependency antar-project | TERBUKTI | Dua project, mymod v1 vs v2, tidak tertimpa — PASS |
| 11 | Deteksi konflik perubahan file | TERBUKTI | Konflik dilaporkan; kedua versi utuh; salinan konflik disimpan; resolve bekerja — PASS |
| 12 | Pengujian sharp di ARM64 | BELUM | Doctor + resep tersedia & logika deteksi glibc TERBUKTI (kasus positif/negatif); instalasi sharp nyata menunggu APK + perangkat |
| 13 | `.nomedia` berfungsi pada folder yang sesuai | TERBUKTI | Dibuat hanya di folder project; root Downloads ditolak guard — PASS |
| 14 | Multi-session & session restore | KODE | Pembungkus tmux selesai; restore = sesi hidup selama proses tmux — verifikasi perilaku di perangkat |
| 15 | Log stdout/stderr | TERBUKTI | exec ter-supervisi: file terpisah, ekspor teredaksi (token hilang, `[REDACTED]` muncul) — PASS |
| 16 | Permission monitor | KODE | `sannlab permissions` tercetak; status grant = Settings Android (batasan dinyatakan) |
| 17 | Audit manifest & permission APK | BELUM | Menunggu APK hasil Actions; alat verifikasi siap: `aapt2 dump badging` + `apksigner` di VM |
| 18 | Pemeriksaan Android compatibility | KODE | Manifest upstream diaudit (SECURITY.md); Android 14 target diwarisi upstream |
| 19 | Verifikasi bootstrap, package name, signature APK | BELUM | Menunggu artifact Actions; prosedur tertulis di BUILD-CONFIG.md |

## Cara menjalankan suite

```bash
cd plugins/sannlab-studio/sannlab-tools
node tests/run-tests.js
```

Suite membuat sandbox HOME + shared storage palsu di /tmp dan menjalankan
CLI sebagai proses anak — tidak menyentuh data nyata pengguna.
