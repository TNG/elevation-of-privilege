import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Tests run from source only: `tsc --build` (e.g. via tsconfig.test.json)
    // can emit compiled *.test.js into build/, which must never be picked up.
    include: ['src/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
  },
});
