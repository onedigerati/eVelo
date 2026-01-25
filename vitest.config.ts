import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use TypeScript without compilation (vitest handles it)
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist'],

    // Environment
    environment: 'node',

    // Coverage (optional, for future)
    // coverage: {
    //   provider: 'v8',
    //   reporter: ['text', 'html'],
    // },

    // Globals (optional)
    globals: false,
  },
});
