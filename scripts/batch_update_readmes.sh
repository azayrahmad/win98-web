#!/bin/bash

# Define windowless apps
declare -a windowless_apps=("clippy" "esheep")
# Define iframe apps
declare -a iframe_apps=("dosgame")
# Define custom apps
declare -a custom_apps=("webamp")
# Define apps that require a file to launch properly
declare -a file_apps=("media-player" "notepad" "pdfviewer" "paint")
default_file="img/award.png"

# Find all app directories
app_dirs=$(find src/apps -mindepth 1 -maxdepth 1 -type d)

# Exclude some directories that are not apps
exclude_dirs=("imageviewer" "notepad")

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

  echo "Processing $app_id..."

  # Create a default README if it doesn't exist
  if [ ! -f "$readme_path" ]; then
    echo "# $app_id" > "$readme_path"
    echo "" >> "$readme_path"
    echo "This is the README for the $app_id app." >> "$readme_path"
  fi

  # Determine if the app is windowless
  is_windowless=false
  for windowless_app in "${windowless_apps[@]}"; do
    if [ "$windowless_app" == "$app_id" ]; then
      is_windowless=true
      break
    fi
  done

  # Determine if the app is an iframe app
  is_iframe=false
  for iframe_app in "${iframe_apps[@]}"; do
    if [ "$iframe_app" == "$app_id" ]; then
      is_iframe=true
      break
    fi
  done

  # Determine if the app is a custom app
  is_custom=false
  for custom_app in "${custom_apps[@]}"; do
    if [ "$custom_app" == "$app_id" ]; then
      is_custom=true
      break
    fi
  done

  # Determine if the app requires a file
  needs_file=false
  for file_app in "${file_apps[@]}"; do
    if [ "$file_app" == "$app_id" ]; then
      needs_file=true
      break
    fi
  done

  # Generate the screenshot if it doesn't exist
  if [ ! -f "$screenshot_path" ]; then
    if [ "$is_windowless" = true ]; then
      APP_ID=$app_id WINDOWLESS=true bun x playwright test
    elif [ "$is_iframe" = true ]; then
      APP_ID=$app_id IS_IFRAME=true bun x playwright test
    elif [ "$is_custom" = true ]; then
      APP_ID=$app_id IS_CUSTOM=true bun x playwright test
    elif [ "$needs_file" = true ]; then
      APP_ID=$app_id FILE_PATH=$default_file bun x playwright test
    else
      APP_ID=$app_id bun x playwright test
    fi
  fi

  # Add the screenshot to the README, if it was successfully generated and not already there
  if [ -f "$screenshot_path" ] && ! grep -q "## Screenshot" "$readme_path"; then
    echo "" >> "$readme_path"
    echo "## Screenshot" >> "$readme_path"
    echo "" >> "$readme_path"
    echo "![Screenshot of the $app_id app](./screenshot.png)" >> "$readme_path"
  fi
done
