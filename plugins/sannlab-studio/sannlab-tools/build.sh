TERMUX_PKG_HOMEPAGE="https://github.com/Smdxyz/termux-generator"
TERMUX_PKG_DESCRIPTION="SannLab Studio tools: smart Node workspace manager, native module doctor, terminal helpers"
TERMUX_PKG_LICENSE="MIT"
TERMUX_PKG_MAINTAINER="SannLab Studio"
TERMUX_PKG_VERSION="0.1.0"
TERMUX_PKG_PLATFORM_INDEPENDENT=true
TERMUX_PKG_DEPENDS="nodejs, jq"
TERMUX_PKG_BUILD_IN_SRC=true

termux_step_make_install() {
	local src="$TERMUX_PKG_BUILDER_DIR/files"
	install -Dm755 "$src/sannlab" "$TERMUX_PREFIX/bin/sannlab"
	install -Dm644 "$src/sannlab.js" "$TERMUX_PREFIX/share/sannlab/sannlab.js"
	install -Dm644 "$src/sannlab.sh" "$TERMUX_PREFIX/share/sannlab/sannlab.sh"
	install -Dm644 -t "$TERMUX_PREFIX/share/sannlab/presets" "$src"/presets/*.properties
}
