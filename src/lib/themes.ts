import type { PlanTier } from '@prisma/client';

export interface ThemePresetDefinition {
  id: string;
  label: string;
  color: string;
  minTier: PlanTier;
  description: string;
}

export const THEME_PRESETS: ThemePresetDefinition[] = [
  {
    id: 'teal',
    label: 'Nadi orange',
    color: '#ea580c',
    minTier: 'STARTER',
    description: 'The Nadi signature',
  },
  {
    id: 'blue',
    label: 'Teal',
    color: '#0f766e',
    minTier: 'CLINIC',
    description: 'Calm and clinical',
  },
  {
    id: 'emerald',
    label: 'Forest',
    color: '#047857',
    minTier: 'CLINIC',
    description: 'Fresh natural green',
  },
  {
    id: 'indigo',
    label: 'Indigo',
    color: '#4f46e5',
    minTier: 'GROWTH',
    description: 'Modern and confident',
  },
  {
    id: 'rose',
    label: 'Coral',
    color: '#e11d48',
    minTier: 'GROWTH',
    description: 'Warm, friendly tone',
  },
  {
    id: 'slate',
    label: 'Graphite',
    color: '#3f3f46',
    minTier: 'GROWTH',
    description: 'Minimal monochrome',
  },
];

const TIER_RANK: Record<PlanTier, number> = {
  STARTER: 1,
  SOLO: 2,
  CLINIC: 3,
  GROWTH: 4,
  ENTERPRISE: 5,
};

export function canUseThemePreset(currentTier: PlanTier, presetId: string): boolean {
  if (presetId === 'custom') return currentTier === 'ENTERPRISE';
  const found = THEME_PRESETS.find((t) => t.id === presetId);
  if (!found) return true;
  return TIER_RANK[currentTier] >= TIER_RANK[found.minTier];
}

export function resolveThemeAccent(clinic: { themePreset?: string | null; brandColor?: string | null }): string {
  if (clinic.themePreset === 'custom' && clinic.brandColor) {
    return clinic.brandColor;
  }
  const found = THEME_PRESETS.find((t) => t.id === clinic.themePreset);
  return found?.color ?? clinic.brandColor ?? '#ea580c';
}

/* ───────── Device appearance (light / dark / auto) ───────── */

export type ThemeMode = 'light' | 'dark' | 'system';
export const DEVICE_THEME_KEY = 'crm-theme';
export const CLINIC_THEME_KEY = 'crm-theme-clinic';

/** Inline script run before paint so there is no flash of the wrong theme. */
export const THEME_BOOT_SCRIPT = `try{var d=document.documentElement,t=localStorage.getItem('${DEVICE_THEME_KEY}')||localStorage.getItem('${CLINIC_THEME_KEY}');if(t==='light'||t==='dark'){d.dataset.theme=t}}catch(e){}`;

export function applyThemeMode(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === 'light' || mode === 'dark') root.dataset.theme = mode;
  else delete root.dataset.theme;
}

export function readDeviceTheme(): ThemeMode | null {
  try {
    const v = localStorage.getItem(DEVICE_THEME_KEY);
    return v === 'light' || v === 'dark' || v === 'system' ? v : null;
  } catch {
    return null;
  }
}

export function writeDeviceTheme(mode: ThemeMode) {
  try {
    localStorage.setItem(DEVICE_THEME_KEY, mode);
  } catch {
    // private mode — still apply for this session
  }
  applyThemeMode(mode);
  window.dispatchEvent(new CustomEvent('crm:theme', { detail: mode }));
}
