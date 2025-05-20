/* eslint-disable import/no-unresolved */
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';
import importPlugin from 'eslint-plugin-import';
import eslintConfigPrettier from 'eslint-config-prettier/flat';

export default defineConfig([
  { files: ['**/*.{js,mjs,cjs,ts}'], plugins: { js }, extends: ['js/recommended'] },
  { files: ['**/*.{js,mjs,cjs,ts}'], languageOptions: { globals: globals.browser } },
  tseslint.configs.recommended,
  importPlugin.flatConfigs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    extends: [importPlugin.flatConfigs.typescript],
  },
  eslintConfigPrettier,
  {
    rules: {
      // Although bad practice to disable this rule, it is impractical to
      // resolve the hundreds of errors associated with this rule as part of the
      // ESLint v8 to v9 migration.
      '@typescript-eslint/no-explicit-any': 'off',

      // Typically accepted pattern for ignored variables in Typescript. See
      // https://typescript-eslint.io/rules/no-unused-vars#what-benefits-does-this-rule-have-over-typescript
      '@typescript-eslint/no-unused-vars': [
        // Ideally this would be `"error"`, although it is impractical to fix all
        // errors as part of the ESLint v8 to v9 migration.
        'warn',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },

  { ignores: ['dist'] },
]);
