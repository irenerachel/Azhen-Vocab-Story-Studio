#!/bin/zsh
# 打印渲染器目录。显式指定的路径有误时，保留错误以便排查。
set -eu
if [[ -n ${CTV:-} ]]; then
  if [[ -f "$CTV/scripts/render_page.mjs" ]]; then
    print -r -- "${CTV:A}"
    exit 0
  fi
  print -u2 -- "CTV 指定的位置缺少 scripts/render_page.mjs：$CTV"
  exit 1
fi
for dir in "$HOME/.codex/skills/code-to-video-studio" "$HOME/.claude/skills/code-to-video-studio" "${0:A:h:h}/renderer"; do
  if [[ -f "$dir/scripts/render_page.mjs" ]]; then
    print -r -- "$dir"
    exit 0
  fi
done
print -u2 -- "找不到渲染器，请重新下载含 renderer 目录的完整仓库，或设置 CTV。"
exit 1
