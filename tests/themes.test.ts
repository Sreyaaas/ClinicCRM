import test from 'node:test';
import assert from 'node:assert';
import {
  canUseThemePreset,
  resolveThemeAccent,
  THEME_PRESETS,
} from '../src/lib/themes';

test('Theme presets are gated according to tier ranking', () => {
  // Teal is available on STARTER+
  assert.strictEqual(canUseThemePreset('SOLO', 'teal'), true);
  assert.strictEqual(canUseThemePreset('STARTER', 'teal'), true);

  // Blue is available on CLINIC+
  assert.strictEqual(canUseThemePreset('SOLO', 'blue'), false);
  assert.strictEqual(canUseThemePreset('CLINIC', 'blue'), true);

  // Indigo is available on GROWTH+
  assert.strictEqual(canUseThemePreset('CLINIC', 'indigo'), false);
  assert.strictEqual(canUseThemePreset('GROWTH', 'indigo'), true);

  // Custom is available on ENTERPRISE only
  assert.strictEqual(canUseThemePreset('GROWTH', 'custom'), false);
  assert.strictEqual(canUseThemePreset('ENTERPRISE', 'custom'), true);

  // Preset definitions exist
  assert.ok(THEME_PRESETS.length > 0);
});

test('Theme accent color resolves correctly with fallback', () => {
  assert.strictEqual(resolveThemeAccent({ themePreset: 'teal' }), '#ea580c');
  assert.strictEqual(resolveThemeAccent({ themePreset: 'blue' }), '#0f766e');
  assert.strictEqual(resolveThemeAccent({ themePreset: 'custom', brandColor: '#123456' }), '#123456');
  assert.strictEqual(resolveThemeAccent({}), '#ea580c');
});
