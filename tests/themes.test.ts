import test from 'node:test';
import assert from 'node:assert';
import {
  canUseThemePreset,
  resolveThemeAccent,
  THEME_PRESETS,
} from '../src/lib/themes';

test('Theme presets are available across all tiers; custom hex color gated to Enterprise', () => {
  // All standard themes are available on all tiers
  assert.strictEqual(canUseThemePreset('STARTER', 'teal'), true);
  assert.strictEqual(canUseThemePreset('STARTER', 'blue'), true);
  assert.strictEqual(canUseThemePreset('SOLO', 'emerald'), true);
  assert.strictEqual(canUseThemePreset('SOLO', 'indigo'), true);
  assert.strictEqual(canUseThemePreset('CLINIC', 'rose'), true);
  assert.strictEqual(canUseThemePreset('CLINIC', 'slate'), true);

  // Custom hex color requires ENTERPRISE
  assert.strictEqual(canUseThemePreset('SOLO', 'custom'), false);
  assert.strictEqual(canUseThemePreset('CLINIC', 'custom'), false);
  assert.strictEqual(canUseThemePreset('GROWTH', 'custom'), false);
  assert.strictEqual(canUseThemePreset('ENTERPRISE', 'custom'), true);

  // Preset definitions exist
  assert.strictEqual(THEME_PRESETS.length, 6);
});

test('Theme accent color resolves correctly with fallback', () => {
  assert.strictEqual(resolveThemeAccent({ themePreset: 'teal' }), '#ea580c');
  assert.strictEqual(resolveThemeAccent({ themePreset: 'blue' }), '#0f766e');
  assert.strictEqual(resolveThemeAccent({ themePreset: 'custom', brandColor: '#123456' }), '#123456');
  assert.strictEqual(resolveThemeAccent({}), '#ea580c');
});
