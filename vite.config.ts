/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// https://vite.dev/config/
export default defineConfig({
  // `viteSingleFile` inlines all JS + CSS into a single index.html so the build
  // is one self-contained file you can double-click to open in any browser —
  // no install, no server. (Affects `build` only; `dev` is unchanged.)
  plugins: [react(), viteSingleFile()],
  // Relative base so the built file works when opened directly via file://
  // (double-click), from a static host subfolder, or wrapped in Tauri.
  base: './',
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
