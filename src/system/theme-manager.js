import { kernel } from './kernel.js';

/**
 * Legacy ThemeManager proxying to ThemeService in Kernel.
 * @deprecated Use kernel.use('theme') instead.
 */

export function loadThemeParser() {
  return kernel.use('theme').loadThemeParser();
}

export function getCustomThemes() {
  return kernel.use('theme').getCustomThemes();
}

export function saveCustomTheme(themeId, themeData) {
  return kernel.use('theme').saveCustomTheme(themeId, themeData);
}

export function deleteCustomTheme(themeId) {
  return kernel.use('theme').deleteCustomTheme(themeId);
}

export function getThemes() {
  return kernel.use('theme').getThemes();
}

export function getColorSchemes() {
  return kernel.use('theme').getColorSchemes();
}

export function getActiveThemeId() {
  return kernel.use('theme').getActiveThemeId();
}

export function getActiveTheme() {
  return kernel.use('theme').getActiveTheme();
}

export function getColorSchemeId() {
  return kernel.use('theme').getColorSchemeId();
}

export function getSoundSchemeName() {
  return kernel.use('theme').getSoundSchemeName();
}

export function getIconSchemeName() {
  return kernel.use('theme').getIconSchemeName();
}

export function getCursorSchemeId() {
  return kernel.use('theme').getCursorSchemeId();
}

export function getCurrentTheme() {
  return kernel.use('theme').getActiveThemeId();
}

export async function applyTheme() {
  return kernel.use('theme').applyTheme();
}

export async function setColorScheme(schemeId) {
  return kernel.use('theme').setColorScheme(schemeId);
}

export async function setCursorScheme(schemeId) {
  return kernel.use('theme').setCursorScheme(schemeId);
}

export function setSoundScheme(schemeName) {
  return kernel.use('theme').setSoundScheme(schemeName);
}

export async function applyCustomColorScheme(colorObject) {
  return kernel.use('theme').applyCustomColorScheme(colorObject);
}

export async function setTheme(themeKey) {
  return kernel.use('theme').setTheme(themeKey);
}
