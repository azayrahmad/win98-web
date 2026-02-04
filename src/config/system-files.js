// src/config/system-files.js

/**
 * This file captures the source code of essential boot components at build time
 * using Vite's glob import feature. These are then stored in ZenFS for
 * offline persistence and user peeking.
 */

// Core source files
const coreFiles = import.meta.glob([
  '../main.js',
  '../utils/*.js',
  '../config/*.js',
  '../components/bootScreen.js',
  '../components/ui.js',
  '../components/taskbar.js',
  '../components/desktop.js',
  '../components/StartMenu.js',
  '../apps/Application.js',
], { query: '?raw', import: 'default', eager: true });

export const SYSTEM_SOURCE_FILES = {};

for (const path in coreFiles) {
  // Normalize path to be relative to src root for ZenFS storage
  // e.g. ../utils/zenfs-init.js -> utils/zenfs-init.js
  const normalizedPath = path.replace('../', '');
  SYSTEM_SOURCE_FILES[normalizedPath] = coreFiles[path];
}
