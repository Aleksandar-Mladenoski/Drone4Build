# Drone4Build mini-games

Four desktop browser assessments for Open edX, each packaged as an independent SCORM 1.2 SCO:

| Course | Game | Mechanic |
| --- | --- | --- |
| M1.1 | Mission Loadout: Build and Clear | Configure equipment and clear three missions after readiness inspection |
| M1.2 | Site Mission Control: Plan, Fly, Adapt | Plan a corridor, fly a short 3D route, reassess changed conditions, return |
| M2.2 | Thermal Triage: Case File | Inspect paired synthetic evidence, classify and validate observations |
| M3.2 | Digital Handover Room: Integration Gate | Verify, align, compare, and release a controlled information package |

M2.1, M3.1, M4.1 and M4.2 are outside this batch.

## Requirements and commands

Install Node.js 24 or another version supported by Vite 6, then use PowerShell from this repository:

```powershell
npm install
npm run hub
```

The hub is at `http://localhost:5173/`. It links to all four games in standalone and mock-SCORM mode, can pass a locale, reset stored progress, and inspect mock values. `npm run dev` is an alias for the same development server. To launch a game directly, visit `http://localhost:5173/apps/m1-2-site-mission-control/index.html` (substitute the app directory). The default Vite port can be changed with `npm run hub -- --port 4173`.

```powershell
npm run test
npm run typecheck
npm run check:locales
npm run build
npm run package:scorm
npm run validate:scorm
npm run qa
```

`npm run qa` runs the automated sequence end to end, including a fresh build and fresh ZIPs. Built standalone games are in `dist/apps/<game>/`; four LMS-ready ZIPs are in `dist/scorm/`. Both directories are generated and ignored by Git. The original `drone-arcade.zip` is preserved unchanged, with extracted source in `legacy/drone-arcade/` for migration traceability.

See [architecture](docs/architecture.md), [SCORM behavior](docs/scorm.md), [localisation](docs/localization.md), [prototype migration](docs/prototype-migration.md), [assets and licences](docs/assets-and-licenses.md), and the [QA report](docs/qa-report.md).
