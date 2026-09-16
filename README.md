# Drone4Build mini-games

Eight desktop browser vertical slices share one development hub. Four established games retain independent SCORM 1.2 packaging. M4.1 remains at gameplay review, while M2.1, M3.1 and M4.2 are explicitly provisional because their developed learning material is not yet available.

| Course | Game | Mechanic | Status |
| --- | --- | --- | --- |
| M1.1 | Mission Loadout: Build and Clear | Configure equipment and clear missions through tactile 3D assembly and testing | Packaged |
| M1.2 | Site Mission Control: Plan, Fly, Adapt | Plan a corridor, fly a short 3D route, adapt, and return | Packaged |
| M2.1 | Defect Mapping Sweep | Traverse a building surface and create a spatially anchored inspection record | **Provisional** |
| M2.2 | Thermal Triage: Case File | Inspect paired synthetic evidence and validate observations | Packaged |
| M3.1 | Reconstruction Pipeline | Manipulate a synthetic image constellation and rebuild a defective digital output | **Provisional** |
| M3.2 | Digital Handover Room: Integration Gate | Align, compare, and release a controlled information package | Packaged |
| M4.1 | Blind Spot: AI Inspection Oversight | Investigate AI output and contain a reliability blind spot | Gameplay review |
| M4.2 | Renovation Deployment Board | Run and rebalance a visual project deployment system | **Provisional** |

## Requirements and commands

Install Node.js 24 or another version supported by Vite 6, then use PowerShell from this repository:

```powershell
npm install
npm run hub
```

The hub is at `http://localhost:5173/`. It links to all eight games in standalone and mock-SCORM mode, passes a locale, resets stored progress, and inspects mock values. `npm run dev` is an alias for the same development server. Direct provisional launches are:

- `http://localhost:5173/apps/m2-1-defect-mapping/index.html`
- `http://localhost:5173/apps/m3-1-reconstruction-pipeline/index.html`
- `http://localhost:5173/apps/m4-2-renovation-deployment/index.html`

The default Vite port can be changed with `npm run hub -- --port 4173`.

```powershell
npm run test
npm run typecheck
npm run check:locales
npm run build
npm run package:scorm
npm run validate:scorm
npm run qa
```

`npm run qa` runs the automated sequence end to end, including a fresh build of all eight games and fresh ZIPs for the four package-enabled games. M2.1, M3.1, M4.1 and M4.2 are excluded from production SCORM packaging. Built standalone games are in `dist/apps/<game>/`; four LMS-ready ZIPs are in `dist/scorm/`. Both directories are generated and ignored by Git. The original `drone-arcade.zip` is preserved unchanged, with extracted source in `legacy/drone-arcade/` for migration traceability.

See [architecture](docs/architecture.md), [provisional slices and playtest gate](docs/provisional-slices.md), [SCORM behavior](docs/scorm.md), [localisation](docs/localization.md), [prototype migration](docs/prototype-migration.md), [assets and licences](docs/assets-and-licenses.md), and the [QA report](docs/qa-report.md).
