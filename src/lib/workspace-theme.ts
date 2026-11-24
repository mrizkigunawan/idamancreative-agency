export const themeAccents = ['blue', 'teal', 'violet', 'graphite'] as const
export const themeModes = ['light', 'dark', 'system'] as const
export type ThemeAccent = typeof themeAccents[number]
export type ThemeMode = typeof themeModes[number]
export type WorkspaceAppearance = { themeAccent: ThemeAccent; themeMode: ThemeMode }

export function readableBrandText(hex: string) {
  const channels = /^#[\da-f]{6}$/i.test(hex) ? [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255) : [1, 1, 1]
  const [red, green, blue] = channels.map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
  const luminance = .2126 * red + .7152 * green + .0722 * blue
  return (luminance + .05) / .05 >= 1.05 / (luminance + .05) ? '#000000' : '#ffffff'
}

export const accentOptions = [
  { value: 'blue', label: 'Biru', description: 'Bersih dan fokus', swatch: '#2563eb' },
  { value: 'teal', label: 'Teal', description: 'Tenang dan segar', swatch: '#0f766e' },
  { value: 'violet', label: 'Violet', description: 'Kreatif dan tegas', swatch: '#6d28d9' },
  { value: 'graphite', label: 'Grafit', description: 'Netral dan minimal', swatch: '#334155' },
] satisfies { value: ThemeAccent; label: string; description: string; swatch: string }[]

export function normalizeAppearance(appearance?: Partial<WorkspaceAppearance> | null): WorkspaceAppearance {
  return {
    themeAccent: themeAccents.includes(appearance?.themeAccent as ThemeAccent) ? appearance!.themeAccent! : 'blue',
    themeMode: themeModes.includes(appearance?.themeMode as ThemeMode) ? appearance!.themeMode! : 'light',
  }
}

const neutrals = {
  light: {
    bg: '#f5f7fb', surface: '#ffffff', 'surface-subtle': '#f8fafc', 'surface-hover': '#f0f3f8',
    ink: '#172033', 'text-secondary': '#475569', muted: '#5d6d84', line: '#e4e9f1', 'line-strong': '#cbd5e1',
    'inverse-surface': '#172033', 'inverse-ink': '#ffffff',
    success: '#157347', 'success-soft': '#edf8f1', 'success-line': '#bfe3cd',
    warning: '#965b0c', 'warning-soft': '#fff7e8', 'warning-line': '#f1d6a3',
    danger: '#bd3348', 'danger-soft': '#fff0f3', 'danger-line': '#f0c4cc',
    info: '#2459ba', 'info-soft': '#edf3ff', 'info-line': '#c8d8f6',
    purple: '#7350aa', 'purple-soft': '#f3effc',
  },
  dark: {
    bg: '#0e1522', surface: '#161f2f', 'surface-subtle': '#1b2739', 'surface-hover': '#253249',
    ink: '#edf2fa', 'text-secondary': '#c2cddd', muted: '#a1afc2', line: '#2c3a50', 'line-strong': '#475973',
    'inverse-surface': '#e7edf5', 'inverse-ink': '#172033',
    success: '#71dca1', 'success-soft': '#143429', 'success-line': '#275740',
    warning: '#f0c175', 'warning-soft': '#352b1b', 'warning-line': '#65502d',
    danger: '#ff9bae', 'danger-soft': '#3d222f', 'danger-line': '#6c3548',
    info: '#9abbff', 'info-soft': '#1c2e50', 'info-line': '#344e7e',
    purple: '#c4b2f5', 'purple-soft': '#302747',
  },
}

const accents = {
  blue: { light: ['#2563eb', '#1d4ed8', '#edf3ff', '#cad9fc', '#ffffff'], dark: ['#92b4ff', '#acc6ff', '#213353', '#3d5682', '#101b31'] },
  teal: { light: ['#0f766e', '#115e59', '#eaf7f4', '#b9dfd7', '#ffffff'], dark: ['#68d8c5', '#8de4d5', '#163b37', '#2d655d', '#092a25'] },
  violet: { light: ['#6d28d9', '#5b21b6', '#f3eefe', '#dcccf9', '#ffffff'], dark: ['#c4b0ff', '#d5c7ff', '#342650', '#5b437d', '#221338'] },
  graphite: { light: ['#334155', '#1e293b', '#eef1f6', '#cbd5e1', '#ffffff'], dark: ['#cbd5e1', '#e2e8f0', '#2c394d', '#53627a', '#172033'] },
}

export function themeTokens(appearance: WorkspaceAppearance, mode: 'light' | 'dark') {
  const normalized = normalizeAppearance(appearance)
  const [accent, hover, soft, border, onAccent] = accents[normalized.themeAccent][mode]
  return { ...neutrals[mode], accent, 'accent-hover': hover, 'accent-soft': soft, 'accent-line': border, 'on-accent': onAccent }
}

// Only validated preset values become CSS; user-entered branding never enters a style tag.
export function workspaceThemeCss(appearance: WorkspaceAppearance) {
  const normalized = normalizeAppearance(appearance)
  const rule = (mode: 'light' | 'dark') => `:root{color-scheme:${mode};${Object.entries(themeTokens(normalized, mode)).map(([key, value]) => `--${key}:${value}`).join(';')}}`
  return `${rule(normalized.themeMode === 'dark' ? 'dark' : 'light')}${normalized.themeMode === 'system' ? `@media(prefers-color-scheme:dark){${rule('dark')}}` : ''}@media print{${rule('light')}}`
}
