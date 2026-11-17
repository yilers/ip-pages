#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
[ "$#" -eq 1 ] || { echo '用法: ./scripts/update-xdb.sh /path/to/ip2region_v4.xdb' >&2; exit 1; }
[ -f "$1" ] || { echo '文件不存在' >&2; exit 1; }
mkdir -p public/data
tmp=$(mktemp public/data/.xdb.XXXXXXXX)
trap 'rm -f "$tmp"' EXIT HUP INT TERM
cp "$1" "$tmp"
./scripts/verify-xdb.sh "$tmp"
mv -f "$tmp" public/data/ip2region.xdb
trap - EXIT HUP INT TERM
echo '数据库已替换。'
