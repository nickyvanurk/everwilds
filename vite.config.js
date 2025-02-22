import glsl from 'vite-plugin-glsl';
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  plugins: [glsl()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
  },
});
