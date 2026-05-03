#!/bin/bash
set -e

cd /vercel/share/v0-project

echo "[merge-main] Current branch:"
git branch --show-current

echo "[merge-main] Fetching origin..."
git fetch origin

echo "[merge-main] Merging origin/main..."
git merge origin/main --no-edit

echo "[merge-main] Done. Current HEAD:"
git log --oneline -5
