import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { themeAccents, themeTokens, normalizeAppearance, workspaceThemeCss, readableBrandText } from '../src/lib/workspace-theme.ts'

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255).map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
  return .2126 * r + .7152 * g + .0722 * b
}
function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (values[0] + .05) / (values[1] + .05)
}

test('all accents and modes keep text, actions, and status labels legible', () => {
  for (const themeAccent of themeAccents) for (const mode of ['light', 'dark']) {
    const tokens = themeTokens({ themeAccent, themeMode: mode }, mode)
    const pairs = [['ink', 'surface'], ['ink', 'bg'], ['muted', 'bg'], ['muted', 'surface'], ['muted', 'surface-subtle'], ['accent', 'accent-soft'], ['on-accent', 'accent'], ['on-accent', 'accent-hover']]
    for (const status of ['success', 'warning', 'danger', 'info']) pairs.push([status, `${status}-soft`])
    for (const [foreground, background] of pairs) assert.ok(contrast(tokens[foreground], tokens[background]) >= 4.5, `${themeAccent}/${mode}: ${foreground} on ${background}`)
  }
})

test('unknown settings fall back safely; system and print modes are explicit', () => {
  assert.deepEqual(normalizeAppearance(), { themeAccent: 'blue', themeMode: 'light' })
  assert.deepEqual(normalizeAppearance({ themeAccent: '</style>', themeMode: 'unknown' }), { themeAccent: 'blue', themeMode: 'light' })
  const system = workspaceThemeCss({ themeAccent: 'teal', themeMode: 'system' })
  assert.ok(system.includes('@media(prefers-color-scheme:dark)'))
  assert.ok(system.includes('@media print{:root{color-scheme:light'))
  assert.ok(!workspaceThemeCss({ themeAccent: '</style>', themeMode: 'invalid' }).includes('</style>'))
})

test('every referenced visual token has a definition', () => {
  const css = readFileSync('src/styles.css', 'utf8') + readFileSync('src/styles/system.css', 'utf8') + readFileSync('src/styles/print.css', 'utf8')
  const defined = new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]))
  for (const key of Object.keys(themeTokens({ themeAccent: 'blue', themeMode: 'light' }, 'light'))) defined.add(`--${key}`)
  for (const [, token] of css.matchAll(/var\((--[\w-]+)/g)) assert.ok(defined.has(token), token)
})

test('client initials keep contrast without changing the client color', () => {
  for (const color of ['#FF7A30', '#2DD4BF', '#8C6D9E', '#C88A3B', '#4F7CAC', '#A35D6A']) {
    assert.ok(contrast(color, readableBrandText(color)) >= 4.5)
  }
})
