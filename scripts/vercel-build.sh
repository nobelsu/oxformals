#!/usr/bin/env bash
# Vercel's build command (see vercel.json).
# Production builds push the Convex functions first, then build the site
# against them, so a merge ships the backend and the website together.
# Previews only build the site: they never touch the prod backend.
set -euo pipefail

if [ "${VERCEL_ENV:-}" = "production" ]; then
  if [ -z "${CONVEX_DEPLOY_KEY:-}" ]; then
    echo "CONVEX_DEPLOY_KEY is not set for Production on Vercel; refusing to ship a site without its backend." >&2
    exit 1
  fi
  npx convex deploy --cmd "npm run build"
else
  npm run build
fi
