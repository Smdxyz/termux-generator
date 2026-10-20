# SannLab Studio — Security & Bank Compatibility Report (Fase 5)

Pendekatan: **security-first secara perilaku** — aplikasi terminal yang bersih,
izin minimal, metadata transparan. Dokumen ini TIDAK berisi teknik menyembunyikan
aplikasi dari pemeriksaan bank, memodifikasi aplikasi lain, atau mengakali
mekanisme keamanan. Kompatibilitas semua bank tidak dapat dijamin — kebijakan
deteksi ada di masing-masing bank; yang bisa dikendalikan adalah perilaku
aplikasi ini sendiri.

## Audit izin (dari AndroidManifest termux-app upstream, diverifikasi 2026-10-20)

| Izin | Level Android | Kebutuhan SannLab | Catatan |
|---|---|---|---|
| INTERNET | normal | Wajib (terminal/dev) | Inti fungsi |
| ACCESS_NETWORK_STATE | normal | Wajib | Cek konektivitas |
| WAKE_LOCK | normal | Wajib | Sesi terminal tetap hidup saat layar mati |
| FOREGROUND_SERVICE | normal | Wajib | Termux:Boot / sesi persisten |
| VIBRATE | normal | Opsional | Feedback terminal bell |
| RECEIVE_BOOT_COMPLETED | normal | Wajib (Boot plugin) | Autostart opsional pengguna |
| REQUEST_IGNORE_BATTERY_OPTIMIZATIONS | normal | Disarankan | Mencegah sesi dibunuh OEM |
| READ/WRITE_EXTERNAL_STORAGE | signature→legacy | Wajib (shared storage) | Di Android modern diterjemahkan ke akses media/berkas |
| MANAGE_EXTERNAL_STORAGE | khusus (appop) | Wajib untuk model Termux | Akses file penuh adalah inti terminal; pengguna memberikan lewat Settings |
| PACKAGE_USAGE_STATS | khusus (appop) | Diwarisi upstream | Kandidat peninjauan — tidak dipakai fitur SannLab |
| REQUEST_INSTALL_PACKAGES | khusus | Diwarisi upstream | Dipakai alur install APK Termux; bukan fitur SannLab — kandidat dicabut (patch opsional terpisah) |
| SYSTEM_ALERT_WINDOW | khusus (overlay) | **Tidak dibutuhkan SannLab** | Kandidat dicabut (patch opsional terpisah); overlay termasuk izin berisiko tinggi menurut direktif |
| DUMP, READ_LOGS, WRITE_SECURE_SETTINGS | **signature** | — | Ditandatangani sistem saja; tidak diberikan ke aplikasi pihak ketiga biasa — tidak berpengaruh praktik |

Aturan yang dijaga SannLab:
- **Tidak ada izin baru** yang ditambahkan patch SannLab. File picker memakai
  `ACTION_OPEN_DOCUMENT` (Storage Access Framework) — tanpa izin penyimpanan tambahan.
- Tidak ada Accessibility, tidak ada akses data aplikasi lain, tidak ada root,
  tidak ada hooking framework, tidak ada root manager.
- Patch pencabutan izin disediakan sebagai file patch **terpisah & opsional**
  (belum diaktifkan default) karena mencabut izin upstream dapat memengaruhi
  fitur upstream di luar scope SannLab; keputusan aktivasi didokumentasikan di sini
  bila diambil.

## Permission Monitor (di dalam aplikasi)

Fase 5 direktif meminta monitor izin. Implementasi v1 (di paket `sannlab-tools`):
perintah `sannlab permissions` menampilkan daftar izin aplikasi ini, status yang
dapat diperiksa dari shell (`dumpsys package` tidak tersedia tanpa root, jadi yang
ditampilkan: daftar deklaratif + penjelasan tujuan + pintasan perintah
`termux-open` ke halaman Settings aplikasi). **Batasan dinyatakan jujur:**
status grant per-izin tidak selalu dapat dibaca dari dalam aplikasi tanpa API
internal — halaman monitor menjelaskan ini dan mengarahkan ke Settings Android
sebagai sumber kebenaran.

## Automatic Media Guard (.nomedia)

- `sannlab activate` membuat `.nomedia` **hanya di folder project yang diaktifkan**
  (bukan seluruh Downloads), dapat dimatikan lewat konfigurasi `mediaGuard: false`
  di `~/.sannlab/config.json`.
- `.nomedia` hanya mencegah pengindeksan Galeri/MediaStore. Ia **bukan** enkripsi
  dan bukan proteksi akses — aplikasi lain yang punya akses file tetap bisa membaca.
- File media pengguna tidak pernah dihapus oleh fitur ini.

## Signing & metadata

- Package name transparan: `sann.lab.studio` — tidak menyerupai package sistem/bank.
- Label aplikasi: **SannLab Studio**.
- Signing pipeline: lihat `BUILD-CONFIG.md` (test key publik untuk build Actions
  saat ini; roadmap keystore pribadi via GitHub Secrets untuk release).
- Komponen exported diwarisi dari upstream Termux (auditable di AndroidManifest);
  SannLab v1 menambahkan satu Activity settings internal (tidak diekspor).

## Laporan ini diperbarui bila ada perubahan izin/patch.
