#!/bin/bash

# Find all app directories
app_dirs=$(find src/apps -mindepth 1 -maxdepth 1 -type d)

# Exclude some directories that are not apps
exclude_dirs=("dosgame" "imageviewer")

for app_dir in $app_dirs; do
  app_id=$(basename "$app_dir")
  readme_path="$app_dir/README.md"
  screenshot_path="$app_dir/screenshot.png"

  # Skip excluded directories
  for exclude_dir in "${exclude_dirs[@]}"; do
    if [ "$app_id" == "$exclude_dir" ]; then
      continue 2
    fi
  done

  echo "Verifying $app_id..."

  # Check for screenshot
  if [ ! -f "$screenshot_path" ]; then
    echo "  [FAIL] Screenshot not found for $app_id"
    continue
  fi

  # Check for README content
  if ! cat "$readme_path" | grep -q "## Screenshot"; then
    echo "  [FAIL] README for $app_id is missing the 'Screenshot' section"
    continue
  fi

  if ! cat "$readme_path" | grep -q "screenshot.png"; then
    echo "  [FAIL] README for $app_id is missing the screenshot image tag"
    continue
  fi

  echo "  [OK] $app_id"
done
