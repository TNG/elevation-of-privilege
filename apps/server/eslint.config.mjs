import tseslint from 'typescript-eslint';

import config from '@eop/eslint-config/type-checked';

export default tseslint.config(
  { ignores: ['build/'] },
  { languageOptions: { parserOptions: { project: './tsconfig.test.json' } } },
  ...config,
);
