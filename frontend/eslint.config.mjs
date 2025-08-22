import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Detect unused variables and imports
      "@typescript-eslint/no-unused-vars": ["error", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_"
      }],
      "no-unused-vars": "off", // Use TypeScript version instead
      
      // Prevent 'any' types
      "@typescript-eslint/no-explicit-any": "warn",
      
      // Ensure imports are optimized
      "import/order": ["error", {
        "groups": ["builtin", "external", "internal", "parent", "sibling", "index"],
        "newlines-between": "always",
        "alphabetize": { "order": "asc", "caseInsensitive": true }
      }],
      
      // React optimization rules
      "react/display-name": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react/jsx-no-useless-fragment": "error",
      
      // Performance rules
      "react/jsx-no-bind": ["warn", {
        "allowArrowFunctions": true,
        "allowBind": false,
        "ignoreRefs": true
      }]
    }
  }
];

export default eslintConfig;
