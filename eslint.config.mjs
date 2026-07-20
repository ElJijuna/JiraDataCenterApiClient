import { createEslintConfig } from 'super-configs/eslint';
import eslintJest from 'super-configs/eslint/jest';

export default createEslintConfig({
  runtime: 'node',
  language: 'ts',
  typeChecked: true,
  ignores: [
    'dist/**',
    'coverage/**',
    'docs/**',
    // Root config files live outside the tsconfig projects used by typed linting.
    'jest.config.ts',
    'tsup.config.ts',
  ],
  overrides: [...eslintJest],
});
