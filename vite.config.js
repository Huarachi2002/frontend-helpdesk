import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    {
      name: 'primereact-inject-react',
      transform(code, id) {
        if (id.includes('primereact/utils') || id.includes('primereact\\utils')) {
          if (!code.includes('import * as React from \'react\'') && !code.includes('import React from \'react\'')) {
            return {
              code: `import * as React from 'react';\n${code}`,
              map: null,
            }
          }
        }
      },
    },
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
