import { defineConfig } from 'tsup'
import vue from 'esbuild-plugin-vue3'

export default defineConfig({
  entry: ['src/index.ts'],
  dts: false,
  format: ['esm', 'cjs'],
  target: 'es2020',
  esbuildPlugins: [vue()],
  clean: true,
})
