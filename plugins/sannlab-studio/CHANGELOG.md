# Changelog — SannLab Studio

## 2026-10-21 — Versi SUPER LITE difinalkan

- List `--add` final: `nodejs,python,python-pip,git,openssh,curl,jq,tmux,termux-api,sannlab-tools`
  (wget dicabut — curl cukup; unzip memang paket inti). Ini list yang
  diisikan ke form workflow; sisanya paket inti bawaan generator.

## 2026-10-21 — List `--add` dipangkas (keputusan user)

- **ffmpeg + toolchain clang DICABUT dari bootstrap.** List final:
  `nodejs,python,python-pip,git,openssh,curl,wget,unzip,jq,tmux,termux-api,sannlab-tools`.
  Bukti run-4: list lama mustahil muat di batas 6 jam/job Actions
  (inti ±1 jam; rantai nodejs ±2,5 jam; ffmpeg baru mulai jam ke-4,5;
  libllvm + Gradle APK belum tersentuh). Bootstrap cukup berisi kebutuhan
  boot pertama; sisanya bukan kewajiban bake. Konsekuensi tercatat di
  BUILD-CONFIG.md.

## 2026-10-21 — Fix build run-4: checksum libsrt

- **Patch bootstrap baru `libsrt-checksum-fix.patch`:** GitHub meregenerasi
  arsip tag v1.5.7 libsrt → SHA256 tarball berubah dari yang tercatat di
  resep upstream (`fee6aee6…` → `017cd1e4…`); build ffmpeg mati di
  "Wrong checksum". Isi tarball baru terverifikasi identik dengan git tag
  v1.5.7 (diff -r bersih). Patch memperbarui `TERMUX_PKG_SHA256` libsrt;
  gugur dengan sendirinya bila upstream memperbarui checksum-nya.
- Run-4 sendiri membuktikan: bootstrap inti selesai (apt + termux-tools
  DONE — fix `TERMUX_APP__USER_PATH` terbukti end-to-end), nodejs, python,
  git, openssh DONE; mati di rantai dependensi ffmpeg setelah ±4,5 jam.

## 2026-10-20 — Fondasi & inti (branch `sannlab-studio`)

- **Fase 6+7 (fondasi):** `BUILD-CONFIG.md` — input final workflow GitHub
  Actions (nama `sann.lab.studio`, aarch64, daftar paket bootstrap termasuk
  toolchain + `sannlab-tools`, plugin yang aktif/dibuang, SSH autostart OFF)
  dan catatan signing yang jujur (test key publik; roadmap keystore pribadi).
- **Fase 5 (audit):** `SECURITY.md` — audit izin dari manifest upstream
  termux-app yang sebenarnya, aturan izin minimal, Media Guard, batasan
  Permission Monitor, posisi bank-compatibility (security-first perilaku,
  tanpa teknik penghindaran).
- **Fase 2 (prioritas tertinggi):** CLI `sannlab` (paket Termux
  `sannlab-tools`) — Smart Node Modules Manager: workspace eksekusi privat
  di `$HOME/.sannlab/workspaces/`, sinkronisasi hash dua arah dengan
  deteksi konflik tanpa overwrite diam-diam, proteksi `.env`/database,
  shim shell opsional, Media Guard `.nomedia` per folder project.
- **Fase 3:** `sannlab doctor` — deteksi ABI/Node/libc/compiler, inspeksi
  ELF `.node` (glibc vs Bionic), uji muat, resep per modul (sharp, canvas,
  bcrypt, better-sqlite3, sqlite3) berlabel keyakinan, log diagnosis.
- **Fase 4:** `sannlab exec`/`logs` (stdout/stderr terpisah, ekspor
  teredaksi), `monitor` (CPU/RAM/storage/port/suhu dari /proc),
  `session` (tmux), `suggest` (riwayat + petunjuk subcommand).
- **Bootstrap patch:** `f-droid-patches/bootstrap-patches/sannlab-tools-package.patch`
  (dibangkitkan `make-bootstrap-patch.sh`; terverifikasi `git apply --check`).
- **Fase 8 (parsial):** suite `sannlab-tools/tests/run-tests.js` —
  40 PASS / 0 FAIL di VM (Node v24). Status lengkap per kasus: `TEST-PLAN.md`.
- **Fase 1:** patch aplikasi Android (wallpaper gambar/video, AMOLED,
  settings) — lihat README plugin; status kode selesai, menunggu
  verifikasi perangkat.
