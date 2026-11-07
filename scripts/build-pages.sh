#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE="$ROOT/_site"

rm -rf "$SITE"
mkdir -p "$SITE/lib"
cp -r "$ROOT/src/public/." "$SITE/"
for dir in utils services storage api demo; do
  cp -r "$ROOT/src/$dir" "$SITE/lib/"
done
cp "$ROOT/package.json" "$SITE/lib/package.json"

BANNER='<div class="demo-banner" style="background:#f59e0b;color:#0f172a;text-align:center;padding:8px 16px;font-weight:600;">Modo demonstração: os dados ficam salvos só neste navegador. Para rodar com a API Node, veja o <a href="https://github.com/Molimpion/habit-tracker#readme" style="color:#0f172a;">README</a>.</div>'

sed -i "s|<body>|<body>\n  ${BANNER}|" "$SITE/index.html"
sed -i 's#<script src="app.client.js"></script>#<script src="lib/demo/boot.js"></script>\n  <script src="app.client.js"></script>#' "$SITE/index.html"

grep -q 'class="demo-banner"' "$SITE/index.html"
grep -q 'lib/demo/boot.js' "$SITE/index.html"
