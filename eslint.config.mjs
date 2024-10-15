import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      "src/index.ts",
      "src/events/interactionCreate.ts",
      "src/deploy-commands.ts"
    ]
  }
);
