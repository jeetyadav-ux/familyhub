import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['specs/**/*.test.ts'],
    globalSetup: ['helpers/global-setup.ts'],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 60000,
  },
});
