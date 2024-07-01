import config from '@eop/eslint-config/type-checked';
import react from 'eslint-plugin-react/configs/recommended.js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['build/'] },
  { languageOptions: { parserOptions: { project: './tsconfig.json' } } },
  { settings: { react: { version: 'detect' } } },
  react,
  ...config,
);
