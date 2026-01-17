import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { comlink } from 'vite-plugin-comlink';

export default defineConfig({
  plugins: [comlink(), viteSingleFile()],
  worker: {
    plugins: () => [comlink()],
  },
  build: {
    target: 'esnext',
    minify: true,
  },
});
