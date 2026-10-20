# SannLab Studio — Build Configuration (Fase 6 + 7)

Sumber kebenaran tunggal untuk menjalankan workflow **"Generate Termux application"**
di fork `Smdxyz/termux-generator` (tab Actions → Run workflow).

## Input workflow final

| Input | Nilai | Alasan |
|---|---|---|
| Choose a name for the new application | `sann.lab.studio` | Application ID final; lulus `check_names()` generator |
| Add additional packages to include in bootstrap | `nodejs,python,python-pip,git,openssh,ffmpeg,clang,make,pkg-config,cmake,autoconf,automake,libtool,curl,wget,unzip,jq,tmux,termux-api,sannlab-tools` | Runtime inti + toolchain native + utilitas + **sannlab-tools** (paket SannLab dari plugin ini) |
| Choose target architectures | `aarch64` | Redmi Note 12 Pro 5G (ARM64) saja — build lebih cepat |
| Enter a plugin name (optional) | `sannlab-studio` | Mengaktifkan patch dari `plugins/sannlab-studio/` (tampilan + paket sannlab-tools) |
| Generate the main Terminal application | ✅ true | Inti |
| Generate Termux:API | ✅ true | Dipakai sannlab-tools (termux-api) untuk info perangkat |
| Generate Termux:Boot | ✅ true | Autostart sesi/bot bila diinginkan pengguna |
| Generate Termux:Widget | ✅ true | Shortcut skrip di home screen |
| Generate Termux:Styling | ✅ true | Kustomisasi warna/font standar Termux |
| Generate Termux:Float | ❌ false | Tidak dipakai; mengurangi permukaan audit |
| Generate Termux:Tasker | ❌ false | Tidak dipakai |
| Generate Termux:GUI | ❌ false | Bukan fokus (terminal, bukan IDE/GUI) |
| Generate Termux:X11 | ❌ false | Tidak dipakai; menghemat ukuran & waktu |
| Enable the built-in SSH server | ❌ false | openssh sudah termasuk; autostart + password default tidak dipakai (keamanan) |

## Konsekuensi yang diketahui & diterima

- Toolchain (`clang`, `cmake`, dll.) membuat bootstrap lebih besar dan waktu build
  Actions lebih lama dari baseline. Ini harga yang dibayar sekali agar native module
  (sharp dll.) bisa di-compile di perangkat (Fase 3).
- `sannlab-tools` adalah paket skrip (noarch) yang ditambahkan plugin ini ke
  termux-packages lewat bootstrap-patch. Sumbernya hidup di
  `plugins/sannlab-studio/sannlab-tools/` dalam repo ini dan disalin persis ke paket.
  Ubah di satu tempat itu saja.

## Signing — status jujur

- Workflow upstream menandatangani APK dengan **test key Termux yang publik**
  (debug-style). Konsisten antar build, tetapi kuncinya diketahui publik:
  siapa pun bisa menandatangani APK dengan identitas yang sama.
- Untuk distribusi pribadi (sideload di HP sendiri) ini dapat diterima, tetapi
  **bukan** release signing yang aman.
- Roadmap release: buat keystore pribadi, simpan sebagai GitHub Actions Secrets
  (`SIGNING_KEYSTORE` base64 + password), dan tandatangani ulang artifact dengan
  `apksigner` sebelum distribusi. **Jangan pernah commit keystore ke Git.**
- Verifikasi sesudah build (wajib, sesuai aturan proyek): unduh artifact →
  `aapt2 dump badging` (package = `sann.lab.studio`) → `apksigner verify --print-certs`
  → catat hasil di CHANGELOG sebelum menyatakan APK siap.

## Yang TIDAK dilakukan pipeline ini

- Tidak ada build lokal di VM Muse (keterbatasan kernel terkonfirmasi: container
  tidak bisa dieksekusi). Semua kompilasi di GitHub Actions.
- Tidak ada kredensial/secret di dalam repo ini.
