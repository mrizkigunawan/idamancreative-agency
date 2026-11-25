import { defineConfig } from 'vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import { cloudflare } from '@cloudflare/vite-plugin'

const config = defineConfig(({ command }) => ({
  resolve: { tsconfigPaths: true },
  plugins: [
    cloudflare({ configPath: command === 'build' ? './wrangler.production.jsonc' : './wrangler.jsonc', viteEnvironment: { name: 'ssr' }, remoteBindings: true, inspectorPort: false }),

    tanstackStart(),
    viteReact(),
  ],
}))

export default config
