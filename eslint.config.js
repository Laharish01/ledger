import js        from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import globals   from 'globals'

export default [
  // Base JS rules
  js.configs.recommended,

  // Vue 3 recommended rules
  ...pluginVue.configs['flat/recommended'],

  // Project-wide settings
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
    },

    rules: {
      // ── Vue ────────────────────────────────────────────────
      'vue/multi-word-component-names': 'off',     // single-word names are fine here
      'vue/no-v-html': 'warn',                     // SvgIcon uses v-html intentionally
      'vue/html-self-closing': ['error', {
        html: { void: 'always', normal: 'never', component: 'always' },
      }],
      'vue/component-definition-name-casing': ['error', 'PascalCase'],
      'vue/prop-name-casing': ['error', 'camelCase'],
      'vue/v-on-event-hyphenation': ['error', 'always'],
      'vue/block-order': ['error', {
        order: ['template', 'script', 'style'],
      }],

      // ── JS ─────────────────────────────────────────────────
      'no-unused-vars':    ['warn', { argsIgnorePattern: '^_' }],
      'no-console':        ['warn', { allow: ['warn', 'error'] }],
      'prefer-const':      'error',
      'no-var':            'error',
      'eqeqeq':            ['error', 'always'],
      'object-shorthand':  'error',
      'arrow-body-style':  ['error', 'as-needed'],
    },
  },

  // Ignore build output and config files
  {
    ignores: ['dist/**', 'node_modules/**', '*.config.js'],
  },
]
