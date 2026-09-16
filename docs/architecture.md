# Architecture

The repository uses a small Vite + TypeScript workspace with one root dependency installation. Each `apps/<game>/` directory is an independent static entry point with its own English locale, rules, interface, and assets. M1.2 uses React and Three.js because the preserved prototype already used them for real-time flight. M1.1 uses Three.js for its tactile hangar scene. The remaining games use direct DOM rendering with authored SVG/CSS, keeping their bundles small.

`packages/core/src/scorm.ts` is the sole LMS-facing runtime. `packages/core/src/locale.ts` resolves locale choice and provides English fallback; `ui.css` supplies common typography, panels, buttons and focus styling. Pure rules live beside each game's view, so educational decisions can be tested without a browser. Game state is serialisable and saved as a short checkpoint through the SCORM wrapper.

`tools/games.mjs` is the shared game registry. `tools/build.mjs` builds every app with relative asset paths, while `package-scorm.mjs` and `validate-scorm.mjs` filter on the registry's `scorm` flag. This keeps M2.1, M3.1, M4.1 and M4.2 out of final package generation. The root Vite entry is a development-only QA hub and is not included in any SCO. There is no backend, database, runtime CDN, AI service or external API.

Each provisional game separates pure mechanics in `rules.ts` from replaceable fictional content in `scenario.ts`. The interfaces render only that data and serialisable rule state. This boundary allows terminology, samples, constraints, scoring weights, and even scenario structure to be replaced when developed module materials arrive.

Workstream ownership was app-specific: M1.1, M2.2 and M3.2 were implemented by separate agents in isolated directories; the integration agent owned shared contracts, tooling, hub, M1.2 migration, final integration and QA. Commits preserve the baseline and each app separately.
