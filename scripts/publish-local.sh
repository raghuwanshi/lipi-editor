#!/usr/bin/env bash
set -e  # Exit immediately if any command fails

SRC_DIR="dist/lipi-editor/browser"
DST_DIR="../raghuwanshi.github.io/lipi-editor/"

# 1. Verify destination folder exists
if [ ! -d "$DST_DIR" ]; then
  echo "Error: Destination folder '$DST_DIR' not found." >&2
  exit 1
fi

# 2. Run production build
echo "Building production bundle..."
npm run build:production

# 3. Verify build output exists before wiping destination
if [ ! -d "$SRC_DIR" ]; then
  echo "Error: Build output '$SRC_DIR' not found." >&2
  exit 1
fi

# 4. Clean old hashed files and copy fresh build
echo "Publishing to $DST_DIR..."
rm -rf "${DST_DIR:?}"/*
cp -r "$SRC_DIR"/* "$DST_DIR"/

echo "Done! Ready to commit and push from $DST_DIR."

