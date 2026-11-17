#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
node --experimental-strip-types scripts/verify-xdb.mjs "${1:-public/data/ip2region.xdb}"
