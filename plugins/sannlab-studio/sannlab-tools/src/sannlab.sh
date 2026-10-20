# sannlab.sh — integrasi shell SannLab Studio
# Tambahkan ke ~/.bashrc:  source $PREFIX/share/sannlab/sannlab.sh
#
# Yang disediakan:
#  - Shim npm/node (hanya bila `sannlab shims on`): saat berada di dalam
#    folder project yang aktif, `npm install`, `npm run`, dan `node`
#    otomatis diarahkan ke workspace privat lewat CLI sannlab.
#    Di luar folder project, perilaku npm/node standar TIDAK diubah.
#  - Indikator prompt [sannlab:<project>] saat berada di folder project.
#  - Lokasi yang ditampilkan ke pengguna tetap folder aslinya (Downloads);
#    eksekusi berpindah ke workspace secara transparan oleh CLI.

_sannlab_registry="$HOME/.sannlab/registry.json"
_sannlab_config="$HOME/.sannlab/config.json"

_sannlab_project_for_cwd() {
  # cetak "id<TAB>name<TAB>workspace" bila $PWD di dalam source project terdaftar
  [ -f "$_sannlab_registry" ] || return 1
  command -v jq >/dev/null 2>&1 || return 1
  local line id name source ws
  while IFS=$'\t' read -r id name source ws; do
    case "$PWD" in
      "$source"|"$source"/*) printf '%s\t%s\t%s\n' "$id" "$name" "$ws"; return 0 ;;
    esac
  done <<EOF
$(jq -r '.projects[] | [.id, .name, .source, .workspace] | @tsv' "$_sannlab_registry" 2>/dev/null)
EOF
  return 1
}

_sannlab_shims_on() {
  [ -f "$_sannlab_config" ] || return 1
  [ "$(jq -r '.shims // false' "$_sannlab_config" 2>/dev/null)" = "true" ]
}

if _sannlab_shims_on; then
  npm() {
    if _sannlab_project_for_cwd >/dev/null 2>&1; then
      command sannlab npm "$@"
    else
      command npm "$@"
    fi
  }
  node() {
    if _sannlab_project_for_cwd >/dev/null 2>&1; then
      command sannlab node "$@"
    else
      command node "$@"
    fi
  }
fi

_sannlab_prompt() {
  local p
  if p=$(_sannlab_project_for_cwd 2>/dev/null); then
    SANNLAB_PS1_PREFIX="[sannlab:$(printf '%s' "$p" | cut -f2)] "
  else
    SANNLAB_PS1_PREFIX=""
  fi
}
case ";${PROMPT_COMMAND};" in
  *";_sannlab_prompt;"*) ;;
  *) PROMPT_COMMAND="_sannlab_prompt${PROMPT_COMMAND:+; $PROMPT_COMMAND}" ;;
esac
PS1='${SANNLAB_PS1_PREFIX}'"${PS1:-}"
