// ESLint rulează pe pachetul construit (toate modulele lipite), ca să prindă și referințele greșite între fișiere.
import globals from "globals";
export default [
  { ignores: ["node_modules/**", "dist/**", "deploy/**", "tests/fixtures/**"] },
  {
    files: [".lint/bundle.js"],
    languageOptions: { ecmaVersion: 2023, sourceType: "script",
      globals: { ...globals.browser, Translator: "readonly", MediaMetadata: "readonly" } },
    rules: {
      "no-undef": "error", "no-redeclare": "error", "no-dupe-keys": "error", "no-unreachable": "error",
      "no-unused-vars": ["warn", { args: "none", caughtErrors: "none" }], "no-const-assign": "error", "eqeqeq": ["warn", "smart"],
    },
  },
  {
    files: ["stremio-addon/**/*.js", "tools/**/*.mjs", "build.mjs", "tests/**/*.mjs"],
    ignores: ["tests/run.mjs"],
    languageOptions: { ecmaVersion: 2023, globals: { ...globals.node } },
    rules: { "no-undef": "error", "no-unused-vars": ["warn", { args: "none", caughtErrors: "none" }] },
  },
  // testele rulează cod în pagină (page.evaluate), unde variabilele aplicației există: doar verificări de bază
  { files: ["tests/run.mjs"], languageOptions: { ecmaVersion: 2023, globals: { ...globals.node, ...globals.browser } },
    rules: { "no-unused-vars": "warn" } },
];
