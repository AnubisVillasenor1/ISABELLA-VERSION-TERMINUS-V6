import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '*.config.*',
      '*.mjs',
      '*.cjs',
      'src/lib/**',
      'src/authz-runtime/**',
      'src/hypercore-runtime/**',
      'src/components/**',
      'src/hooks/**',
      'src/core/**',
      'src/ui/app.js',
      'src/ui/chat-plus.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.build.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-control-regex': 'off',
      'no-console': 'off',
      'prefer-const': 'off',
      'no-useless-escape': 'off',
      'no-undef': 'off',
      'no-misleading-character-class': 'off',
    },
  },
  {
    files: [
      'src/ui/platform/**/*.js',
      'src/ui/cognition-client.js',
      'src/ui/nexus.js',
      'src/ui/universe-map.js',
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        crypto: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        Blob: 'readonly',
        AbortController: 'readonly',
        TextDecoder: 'readonly',
        performance: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        IntersectionObserver: 'readonly',
        ResizeObserver: 'readonly',
        MutationObserver: 'readonly',
        Element: 'readonly',
        Audio: 'readonly',
        SpeechSynthesisUtterance: 'readonly',
      },
    },
    rules: {
      'no-control-regex': 'off',
    },
  },
  {
    // scripts/** y test/** son código Node: sin este bloque, `process` y `console`
    // se reportan como no-undef y la puerta de lint sobre el código que gobierna el
    // despliegue (verify-deploy-gate.mjs, generate-sbom.mjs) no puede correr.
    files: ['scripts/**/*.mjs', 'test/**/*.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        fetch: 'readonly',
        AbortController: 'readonly',
        AbortSignal: 'readonly',
        Blob: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
      },
    },
  },
  prettierConfig
);
