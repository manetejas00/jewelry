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

if ! npm ci --include=dev || ! npm run build || ! node scripts/migrate.js; then
  restore
  exit 1
fi

cp dist/index.html "$PUBLIC/index.html"
mkdir -p "$PUBLIC/assets"
cp -a dist/assets/. "$PUBLIC/assets/"
mkdir -p "$APP/tmp"
touch "$APP/tmp/restart.txt"

built=$(grep -o 'assets/index-[^"]*\.js' dist/index.html | head -n 1)
i=0
while [ "$i" -lt 12 ]; do
  live=$(curl -fsS https://test3.avinyacarefoundation.org/ | grep -o 'assets/index-[^"]*\.js' | head -n 1 || true)
  echo "check $i live=$live built=$built"
  if [ "$live" = "$built" ]; then
    echo "deployed $SHA"
    exit 0
  fi
  i=$((i + 1))
  sleep 5
done

echo "live homepage did not serve $built" >&2
exit 1
