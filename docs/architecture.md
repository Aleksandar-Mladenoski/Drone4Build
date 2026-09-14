# Architecture

The repository uses a small Vite + TypeScript workspace with one root dependency installation. Each `apps/<game>/` directory is an independent static entry point with its own English locale, rules, interface, and assets. M1.2 uses React and Three.js because the preserved prototype already used them for real-time flight. The other three games use direct DOM rendering and authored SVG/CSS, keeping their bundles small.

`packages/core/src/scorm.ts` is the sole LMS-facing runtime. `packages/core/src/locale.ts` resolves locale choice and provides English fallback; `ui.css` supplies common typography, panels, buttons and focus styling. Pure rules live beside each game's view, so educational decisions can be tested without a browser. Game state is serialisable and saved as a short checkpoint through the SCORM wrapper.

`tools/build.mjs` builds each app with relative asset paths; `package-scorm.mjs` creates four standalone ZIPs with manifests at the root; `validate-scorm.mjs` checks structure and serves the resulting launch files locally. The root Vite entry is a development-only QA hub and is not included in any SCO. There is no backend, database, runtime CDN, AI service or external API.

Workstream ownership was app-specific: M1.1, M2.2 and M3.2 were implemented by separate agents in isolated directories; the integration agent owned shared contracts, tooling, hub, M1.2 migration, final integration and QA. Commits preserve the baseline and each app separately.
