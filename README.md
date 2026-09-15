# Drone4Build mini-games

Five desktop browser assessments for Open edX. M4.1 is currently a gameplay-review prototype; the earlier four retain their independent SCORM 1.2 packaging workflow:

| Course | Game | Mechanic |
| --- | --- | --- |
| M1.1 | Mission Loadout: Build and Clear | Configure equipment and clear three missions after readiness inspection |
| M1.2 | Site Mission Control: Plan, Fly, Adapt | Plan a corridor, fly a short 3D route, reassess changed conditions, return |
| M2.2 | Thermal Triage: Case File | Inspect paired synthetic evidence, classify and validate observations |
| M3.2 | Digital Handover Room: Integration Gate | Verify, align, compare, and release a controlled information package |
| M4.1 | Blind Spot: AI Inspection Oversight | Sample automated findings and clean areas, investigate evidence, discover a reliability blind spot, and redirect human review |

M2.1, M3.1 and M4.2 are outside this batch. M4.1 stops at human gameplay review before final production packaging.

## Requirements and commands

Install Node.js 24 or another version supported by Vite 6, then use PowerShell from this repository:

```powershell
npm install
npm run hub
```

The hub is at `http://localhost:5173/`. It links to all five games in standalone and mock-SCORM mode, can pass a locale, reset stored progress, and inspect mock values. `npm run dev` is an alias for the same development server. M4.1 launches directly at `http://localhost:5173/apps/m4-1-blind-spot/index.html`. The default Vite port can be changed with `npm run hub -- --port 4173`.

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
