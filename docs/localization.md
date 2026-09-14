# Adding a locale

Each app's `locales/en.json` is the complete English reference. To add a language, copy it to `<language-code>.json` in the same directory and translate only the string values. Keep every key unchanged and preserve placeholders such as `{score}`. Save UTF-8. The translator reads `?lang=<language-code>` and falls back to English for missing values or unsupported languages.

The Vite entry automatically includes all JSON files in its `locales/` directory, so no code change or registration is needed. Run `npm run check:locales` to compare keys, `npm run typecheck`, and `npm run qa` before delivering the language package. Layouts allow longer text, but a human visual review at ordinary desktop widths is still necessary.

UI instructions, feedback, scenarios, buttons, results and accessibility labels use semantic locale keys. English values are the authoritative copy; no generated translations are supplied.
