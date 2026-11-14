#!/bin/sh
# Deploy one commit to the Hostinger Node app. Called by GitHub Actions over SSH.
# Preserves .env (gitignored) and storage/uploads. Does not publish the repo into public_html.
set -eu

SHA=${1:?commit sha required}
APP=/home/u382139760/domains/test3.avinyacarefoundation.org/app
PUBLIC=/home/u382139760/domains/test3.avinyacarefoundation.org/public_html
export PATH=/opt/alt/alt-nodejs22/root/bin:$PATH

cd "$APP"
PREV=$(git rev-parse HEAD)
echo "previous $PREV"
echo "target $SHA"

restore() {
  echo "restoring $PREV" >&2
  git reset --hard "$PREV"
  npm ci --include=dev
}

git fetch origin "$SHA"
git reset --hard "$SHA"
# Only remove if they are broken server-only symlinks into public_html
test -L public/assets/coins && rm -f public/assets/coins || true
test -L public/assets/products && rm -f public/assets/products || true

if ! npm ci --include=dev || ! npm run build || ! node scripts/migrate.js || ! node seeders/DatabaseSeeder.js; then
  restore
  exit 1
fi

cp dist/index.html "$PUBLIC/index.html"
mkdir -p "$PUBLIC/assets"
cp -a dist/assets/. "$PUBLIC/assets/"
# Publish the approved branding and offline shell even when the host serves root files directly.
for file in favicon.png icon-192.png icon-512.png icon-maskable-512.png apple-touch-icon.png manifest.webmanifest sw.js pwa-boot.js offline.html; do
  cp "dist/$file" "$PUBLIC/$file"
done
# Purge any stale dynamic brand image cache
rm -rf "$APP/private/brand-image-cache" "$APP/private/cache"
mkdir -p "$APP/tmp"
touch "$APP/tmp/restart.txt"

built=$(grep -o 'assets/index-[^"]*\.js' dist/index.html | head -n 1)
grep -q "$built" "$PUBLIC/index.html"
echo "DEPLOYED_ASSET=$built"
echo "deployed $SHA"
