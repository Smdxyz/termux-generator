# SannLab Studio — Plugin for termux-generator

Phase 1 (Custom Terminal Appearance) of the SannLab Studio fork
(package `sann.lab.studio`, applied by the generator's rename — nothing in this
plugin hardcodes the new package name; all code lives in upstream's own
namespaces, e.g. `com.termux.app.sannlab`, and is renamed by the generator like
the rest of the app).

**Verification status: patches verified, APK NOT built.**
Compiled/device verification was **NOT done** — no APK build is allowed in the
development VM. Everything below was verified at the patch-application level
only (see "Verification" section). Runtime behavior claims are grounded in the
upstream termux-app source (reference clone of master @ `8629e63`), not in
on-device tests. Anything device-dependent is "awaiting device verification".

## How the generator applies this plugin

`install_plugin` runs before the built-in patch steps, so these patches are
applied to the pristine upstream clones in `termux-apps-main`, in filename
order, with `patch -p1` (paths are therefore prefixed `termux-app/...`). The
built-in f-droid app-patches run afterwards — coexistence with them was checked
(see Verification).

## Patches

### `f-droid-patches/app-patches/0001-sannlab-wallpaper-layer.patch`

The wallpaper layer and its runtime:

- **`app/src/main/res/layout/activity_termux.xml`** — inserts a layer stack as
  the **first child** of the root `RelativeLayout`, strictly behind the
  `DrawerLayout`/`TerminalView`:
  - `FrameLayout @id/sannlab_wallpaper_container` (base color `#000000`)
    - `ImageView @id/sannlab_wallpaper_image`
    - `androidx.media3.ui.PlayerView @id/sannlab_wallpaper_video`
      (`surface_type="texture_view"` so alpha/RenderEffect/z-order behave like a
      normal view; controller disabled; black shutter)
    - `View @id/sannlab_wallpaper_overlay` (black, alpha driven by config)

  No patch to `TerminalView` is needed for the background to show through:
  upstream `TerminalView.onDraw()` only fills the canvas when there is no
  terminal emulator, and `TerminalRenderer` paints only cell backgrounds and
  text — the visible terminal background is the color behind the view (set
  upstream on the window decor view by
  `TermuxTerminalSessionActivityClient.updateBackgroundColor()`). Text and
  cursor rendering are therefore completely untouched.

- **`app/src/main/java/com/termux/app/sannlab/SannLabConfig.java`** (new) —
  reads/writes the `sannlab.*` keys in the standard `termux.properties`
  (primary `$HOME/.termux/termux.properties`, fallback
  `$HOME/.config/termux/termux.properties`). Upstream's properties parser keeps
  only its whitelisted keys, so this class parses the file itself; writes are
  line-preserving (all other lines, including comments and upstream keys, are
  kept verbatim; the file is rewritten via temp file + rename).

- **`app/src/main/java/com/termux/app/sannlab/SannLabWallpaper.java`** (new) —
  the layer controller:
  - **Image**: decode on a background thread, downsampled to max 2048 px per
    side; opacity via view alpha; brightness via a `ColorMatrix` color filter
    (image mode); blur via `RenderEffect.createBlurEffect` on API 31+
    (ignored below, see Limitations); scale = center-crop / fit-center.
  - **Video** (Media3/ExoPlayer): autoplay, `REPEAT_MODE_ONE` seamless loop,
    volume 0 and `handleAudioFocus=false` (never disturbs other audio),
    hardware decoding is ExoPlayer's default, texture-view surface. Paused
    from `TermuxActivity.onStop`, released from `onDestroy`, re-applied and
    resumed from `onResume`. Any player/codec error falls back to a
    previously picked still image, else to the static base — the terminal
    never crashes because of the wallpaper.
  - **AMOLED**: with `sannlab.amoled=true` the base is pure `#000000`
    (container + decor view). With no wallpaper and AMOLED off, the container
    is hidden entirely so upstream's own background color shows exactly as in
    stock Termux.
  - The black overlay (readability) always sits above the media, below the
    terminal.

- **`TermuxActivity.java`** — minimal anchored hooks only: one import, one
  field, `attach()` after `setContentView()` in `onCreate`, `onHostResume()`
  at the end of `onResume`, `onHostPause()` in `onStop`, `onHostRelease()` in
  `onDestroy`. (Upstream `TermuxActivity` has no `onPause` override, so the
  pause hook lives in `onStop`, which is where visibility actually ends.)

### `f-droid-patches/app-patches/0002-sannlab-media3-dependency.patch`

- **`app/build.gradle`** — adds, next to the existing Material dependency:
  - `androidx.media3:media3-exoplayer:1.11.1`
  - `androidx.media3:media3-ui:1.11.1`

  1.11.1 is the latest stable Media3 release (verified against the Google
  Maven metadata for `media3-exoplayer` and `media3-ui`). The app module uses
  inline dependency strings (no version catalog), so the version is pinned
  inline like every other dependency there.

### `f-droid-patches/app-patches/0003-sannlab-settings-activity.patch`

- **`app/src/main/java/com/termux/app/sannlab/SannLabSettingsActivity.java`**
  (new) — a simple programmatic settings UI (AppCompat, same theme as the
  upstream Settings activity, `exported=false`, **no new permissions**):
  - System document pickers (`ACTION_OPEN_DOCUMENT` via
    `ActivityResultContracts.OpenDocument`) for background image, background
    video, and font. The picker grant is the only file access used.
  - Picks are copied on a background thread into app-owned storage:
    images/videos to `$HOME/.termux/sannlab/background_image.<ext>` /
    `background_video.<ext>`; the font to `$HOME/.termux/font.ttf`.
  - **Font mechanism**: the copy target is exactly the file upstream's
    `TermuxTerminalSessionActivityClient.checkForFontAndColors()` loads
    (`TermuxConstants.TERMUX_FONT_FILE`), so the standard Termux font
    mechanism applies it on the terminal's next resume — no new font code.
    Picked fonts are extension-checked (`.ttf`/`.otf`) and parse-checked with
    `Typeface.createFromFile`.
  - Sliders for opacity, overlay, brightness, blur; radio groups for scale
    and the video FPS cap; an AMOLED switch. Every change is written to
    `termux.properties` immediately through `SannLabConfig.update(...)` and
    applies when the user returns to the terminal (which re-reads the config
    in `onResume`) — no app restart.
- **`AndroidManifest.xml`** — declares `.app.sannlab.SannLabSettingsActivity`
  (`exported="false"`, NoActionBar day/night theme). No permission changes.
- **`TermuxActivity.java`** — a "SannLab Wallpaper" entry (id 1001, clear of
  upstream's sequential context-menu ids) in the terminal long-press context
  menu, launching the settings activity.

## Properties reference (`termux.properties`)

| Key | Values | Default | Meaning |
|---|---|---|---|
| `sannlab.background.type` | `none` \| `image` \| `video` | `none` | Wallpaper mode. Unknown values behave as `none`. |
| `sannlab.background.path` | absolute path | *(empty)* | Media file to show. The settings UI sets this to the copied file under `$HOME/.termux/sannlab/`; a manual path to any readable file also works. |
| `sannlab.background.opacity` | 0–100 | `100` | Media opacity in percent (clamped). |
| `sannlab.background.brightness` | 50–150 | `100` | Image brightness in percent (clamped). Applied to images via a color filter; for video see Limitations. |
| `sannlab.background.blur` | 0–25 | `0` | Blur radius. API 31+ only (RenderEffect); ignored on older Android. |
| `sannlab.background.scale` | `centerCrop` \| `fitCenter` | `centerCrop` | Media scaling. Video maps to ExoPlayer `RESIZE_MODE_ZOOM`/`RESIZE_MODE_FIT`. |
| `sannlab.background.overlay` | 0–100 | `30` | Black overlay above the media for text readability, in percent. |
| `sannlab.background.fps` | `0` \| `15` \| `24` \| `30` | `0` (= uncapped) | Video frame-rate cap; implemented as an ExoPlayer track-selection constraint (`setMaxVideoFrameRate`). See Limitations. |
| `sannlab.amoled` | `true` \| `false` | `false` | Pure black `#000000` base. |

Deleting a key restores its default. The config is re-read on every
`TermuxActivity.onResume`, so manual edits also apply live on resume.

## Verification (performed 2026-10-20, this plugin version)

Against a pristine copy of the reference clone (termux-app master @ `8629e63`),
patches applied **in filename order**:

| Check | Result |
|---|---|
| `git apply --check` + `git apply`, 0001 → 0002 → 0003 | all exit 0 |
| `patch -p1` (the generator's method), 0001 → 0002 → 0003 | all exit 0 |
| Resulting tree vs. development work tree | byte-identical (`diff -r`) via both routes |
| XML well-formedness of patched `activity_termux.xml` / `AndroidManifest.xml` | OK |
| Built-in f-droid app-patches applied **for real** on top (generator order) | `auto-hide-extra-keys`, `increase-gradle-memory`, `local-bootstraps`, `local-termux-am-library`, `multi-window`: all exit 0, zero failed hunks, no `.rej` files — including the ones editing the same files (`TermuxActivity.java`, `activity_termux.xml`, `AndroidManifest.xml`; their hunks land at shifted offsets) |
| `local-maven.patch` / `local-termux-gui.patch` in the same test | exit 1 with "can't find file to patch" only: they patch other repos (`termux-api`, `termux-float`, `termux-tasker`, `termux-widget`, `termux-gui`) that don't exist in a termux-app-only test tree. Unrelated to this plugin. |

Notes on method: `patch --dry-run` was **not** used for the coexistence verdict
because `multi-window.patch` contains several sequential sections for the same
file, which a dry run cannot simulate (later sections depend on earlier ones
being written). The verdicts above come from real application on a throwaway
copy.

**Not verified**: compilation (AGP/Gradle), AAPT processing of the layout
(including the `app:`-namespaced Media3 `PlayerView` attributes, which follow
media3-ui 1.11.1's published attrs), Media3 API usage at compile time, and all
on-device behavior. These are only checkable once the parent build pipeline
(GitHub Actions) produces an APK.

## Known limitations (honest list)

- **No compile or device verification yet** — see above. First real check is
  the GitHub Actions build + installing the APK.
- **Blur**: API 31+ (Android 12+) only; below that the setting is silently
  ignored (opacity/overlay still work). Video blur uses the same
  `View.setRenderEffect`, so it inherits the same floor and costs GPU time.
- **Brightness** applies to images only. ExoPlayer video brightness is not
  adjusted in v1 (no reliable per-view brightness for video surfaces without
  shaders); use the overlay to darken video.
- **FPS cap fidelity**: `setMaxVideoFrameRate` constrains *track selection*
  to renditions at or below the requested frame rate. If the only available
  rendition is above the cap, playback still uses it — it is a preference for
  the decoder pipeline, not a hard render-time limiter. It is applied when
  the player is (re)created; changing it while a video is already playing
  takes effect on the next player creation (mode switch or app restart).
- **Video fallback**: if a video repeatedly fails (unsupported codec), the
  fallback re-runs on each resume — the video is retried, fails, and falls
  back again. Functional, but v1 does not persist a "video broken" flag.
- **Patches are a set**: apply all three, in order. In particular the
  wallpaper code references Media3 classes whose dependency is added by
  patch 0002 (the generator always applies the whole folder before building,
  so this matches the real flow).
- **Settings UI is v1**: programmatic layout, English literals (also the
  context-menu label), no preview thumbnail. Choices apply on returning to
  the terminal, not while the settings screen is open.
- **Storage locations** follow the fork's `$HOME/.termux/` data dir, so after
  the generator rename they live in the renamed app's home automatically.
