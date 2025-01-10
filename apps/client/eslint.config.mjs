import config from '@eop/eslint-config/type-checked';
import react from 'eslint-plugin-react';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['build/'] },
  { languageOptions: { parserOptions: { project: './tsconfig.*.json' } } },
  { settings: { react: { version: 'detect' } } },
  react.configs.flat.recommended,
  react.configs.flat['jsx-runtime'],
  ...config,
);
