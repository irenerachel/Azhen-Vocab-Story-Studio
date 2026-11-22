#!/bin/zsh
# 新建一个生词故事项目：目录、动画引擎、字体、依赖一次放好。
# 用法：new_project.sh 项目目录 [16:9|9:16]
set -e
SK=${0:A:h:h}; P=${1:?用法：new_project.sh 项目目录 [16:9|9:16]}; ASP=${2:-16:9}
[[ $ASP == 16:9 || $ASP == 9:16 ]] || { print "画幅只支持 16:9 或 9:16"; exit 1 }
mkdir -p $P/{page,lib,web,build,成片} $P/assets/{raw,bg,cut,voice,fonts}
cp $SK/assets/engine/{engine.js,demo.js,fx.js} $P/lib/
cp $SK/assets/engine/index.html $P/page/index.html
[[ -f $P/page/story.js ]] || sed "s/^const ASPECT = \"16:9\";/const ASPECT = \"$ASP\";/" $SK/assets/engine/story-skeleton.js > $P/page/story.js
print $ASP > $P/page/aspect.txt
cp -R $SK/assets/fonts/ChillRoundGothic $P/assets/fonts/
[[ -f $P/assets/urls.txt ]] || print "# 每行：名字 网址。B 开头是背景，C 开头是绿幕角色图\n" > $P/assets/urls.txt
cd $P
[[ -f package.json ]] || npm init -y >/dev/null
# playwright 版本要和本机已下载的 chromium 对上，否则会报找不到浏览器
PWV=""
for d in ~/Library/Caches/ms-playwright/chromium-*(N); do
  case ${d:t} in chromium-1134) PWV=1.47.2;; chromium-1140) PWV=1.48.2;; esac
done
if [[ -n $PWV ]]; then npm i gsap@3.13.0 playwright@$PWV @fontsource/fraunces >/dev/null 2>&1
else npm i gsap@3.13.0 playwright @fontsource/fraunces >/dev/null 2>&1 && npx playwright install chromium; fi
print "项目已建好：$P（画幅 $ASP，playwright ${PWV:-最新版}）"
print "下一步：把提纲里的旁白写进 assets/narration.json，出图后把网址写进 assets/urls.txt"
