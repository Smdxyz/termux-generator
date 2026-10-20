# SannLab Studio — Arsitektur

## Gambaran

SannLab Studio adalah fork Termux yang dihasilkan `termux-generator` dengan:

- Application ID `sann.lab.studio`, label **SannLab Studio**, target aarch64.
- Satu plugin generator: `plugins/sannlab-studio/` berisi
  - `f-droid-patches/app-patches/` — modifikasi aplikasi Android (Fase 1:
    wallpaper gambar/video, AMOLED, settings). Patch terhadap termux-app.
  - `f-droid-patches/bootstrap-patches/` — menambahkan paket Termux
    `sannlab-tools` (CLI `sannlab`) ke bootstrap.
- Konfigurasi build final: `BUILD-CONFIG.md`. Audit keamanan: `SECURITY.md`.

## Fase 2 — Smart Node Modules Manager (inti: paket `sannlab-tools`)

Masalah: shared storage Android tidak mendukung symlink → npm tidak dapat
membuat `node_modules` di `/storage/emulated/0/...`. Solusi BUKAN `NODE_PATH`
(resolusi ESM/native/exports akan rusak), melainkan **workspace eksekusi privat**:

```
Source (tetap, milik pengguna)          Workspace privat (eksekusi)
----------------------------------      --------------------------------------
/storage/emulated/0/Download/     <->   $HOME/.sannlab/workspaces/<id>/
  MyProject/          sinkronisasi        MyProject (salinan kerja)
    index.js            hash dua arah       index.js
    package.json                          node_modules/  <- HANYA di sini
    vendor/                                 .sannlab-manifest.json
    .env (terlindungi)                      .sannlab/logs/, doctor logs
```

- Registri: `$HOME/.sannlab/registry.json`; ID project = nama + hash path
  (isolasi antar-project dijamin; tidak saling menimpa).
- Sinkronisasi berbasis hash SHA-1 + manifest. Perubahan satu sisi disalin;
  perubahan dua sisi = **konflik** (tidak ada overwrite diam-diam; salinan
  konflik disimpan; resolusi eksplisit `sannlab resolve`).
- File terlindungi (`.env*`, `*.db`, `*.sqlite*`): disalin masuk sekali,
  tidak pernah ditimpa/disalin keluar.
- Pengecualian: `node_modules`, `.git`, `.sannlab`, pola `.sannlabignore`.
- Perintah pengguna tetap alami: dari folder Downloads, `sannlab install`,
  `sannlab npm run ...`, `sannlab node ...` — atau shim shell opsional
  (`sannlab shims on`) yang mengalihkan `npm`/`node` hanya di folder project
  aktif. Prompt tetap menampilkan lokasi asli pengguna (variabel
  `SANNLAB_PROJECT_DIR` menunjuk source).

Perbedaan yang tidak dapat dihindari (didokumentasikan sesuai direktif):
proses benar-benar berjalan dengan cwd = workspace; path absolut yang
dicetak program (mis. `__dirname`) menunjuk workspace, bukan Downloads.
Path relatif berperilaku identik karena struktur salinan sama.

## Fase 3 — Native Module Doctor

`sannlab doctor` mendiagnosis per modul: deteksi lingkungan (ABI Android,
versi & ABI Node, libc Bionic vs glibc, compiler), inspeksi ELF file `.node`
(machine, interpreter, NEEDED libraries) untuk membedakan prebuild glibc
(tidak akan termuat di Bionic) dari masalah compiler/linker/dependensi
sistem, uji muat `require()`, lalu resep perbaikan per modul (sharp,
canvas, bcrypt, better-sqlite3, sqlite3) dengan label keyakinan jujur.
Tidak ada `--force`, tidak ada unduhan binari tak terverifikasi; semua
diagnosis dicatat ke `.sannlab/doctor-<waktu>.log` di workspace.

## Fase 4 — Terminal Experience

- Saran perintah: `sannlab suggest` (riwayat shell + petunjuk subcommand
  npm/node/git/python/ssh/pkg) — tidak pernah menjalankan apa pun otomatis.
  Pencarian riwayat: Ctrl+R bawaan shell.
- Multi-sesi: pembungkus tmux (`sannlab session ...`) — sesi bernama per
  project, bertahan selama proses tmux hidup; tab/split adalah fitur
  bawaan Termux/tmux.
- Log viewer: `sannlab exec` menjalankan proses ter-supervisi dengan
  stdout/stderr terpisah berstempel waktu, rotasi per jumlah sesi;
  `sannlab logs` untuk cari/filter/ekspor dengan redaksi rahasia.
- Resource monitor: `sannlab monitor` dari `/proc`, `statfs`,
  `/proc/net/tcp`, `/sys/class/thermal` — hanya data yang benar-benar
  dapat diakses aplikasi; ketidaktersediaan dinyatakan eksplisit.

## Fase 5 — Privacy & Compatibility

- Media Guard: `.nomedia` hanya di folder project yang diaktifkan.
- Permission Monitor: `sannlab permissions` (deklaratif + penjelasan;
  keterbatasan pembacaan status dinyatakan jujur).
- Bank compatibility: perilaku security-first (izin minimal, tanpa root/
  hooking/overlay tambahan, metadata transparan) — lihat `SECURITY.md`.
  Tidak ada teknik penghindaran deteksi.

## Fase 1 — Appearance (aplikasi Android)

Lapisan wallpaper (gambar/video via Media3/ExoPlayer) di belakang
TerminalView + mode AMOLED pure black + Activity settings dengan
file picker (SAF) untuk gambar/video/font; konfigurasi lewat
`sannlab.*` di termux.properties. Detail & batasan: README plugin.
Status: kode selesai, **menunggu verifikasi perangkat** (build APK hanya
di GitHub Actions).
