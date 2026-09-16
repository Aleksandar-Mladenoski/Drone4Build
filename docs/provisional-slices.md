# Provisional gameplay slices and human review gate

M2.1, M3.1 and M4.2 are gameplay prototypes. Their developed learning materials are not yet available, so these implementations are not curriculum-final and must not be treated as validated professional guidance. When the developed modules arrive, each prototype must be re-evaluated against that evidence and may be preserved, refined, substantially modified, or replaced.

Each app keeps reusable mechanics in `src/rules.ts`, provisional examples and fictional parameters in `src/scenario.ts`, learner wording in `locales/en.json`, and rendering in `src/main.ts`. The shared game registry builds the prototypes for standalone review but marks them `scorm: false`, preventing final package generation.

## M2.1 · Defect Mapping Sweep

The player moves a camera footprint over an authored 18-zone building surface. Movement creates persistent coverage; captures create numbered evidence pins that remain tied to their source. Distributed captures build a usable record, while near-identical captures consume limited capacity and incomplete traversal leaves visible gaps.

Human playtest question: **Do I feel that I actually conducted and documented an inspection?**

- Confirm camera movement and direct surface selection both change coverage.
- Confirm each capture creates a linked map pin and evidence thumbnail.
- Build a broad record with distributed feature and context evidence.
- Replay with repeated captures at one location and compare the consequence.
- Check that returning from an evidence thumbnail revisits its source.

Current limitation: the façade is a qualitative 2.5D grid, and useful features are authored scenario markers rather than image-analysis results.

## M3.1 · Reconstruction Pipeline

The player processes a deterministic seven-image constellation. The initial active set produces a visible east-side hole and ghosted edge. The output can be inspected as points, surface, or quality coverage. Swapping the held return view for the soft duplicate and rebuilding fills the missing region and changes the fitness result.

Human playtest question: **Do I feel that I actually improved a reconstruction rather than answered processing questions?**

- Run the unchanged input set and inspect the visible weak area.
- Switch all three output views and trace the weak area to Station 6.
- Select or drag the held east return image into Station 6.
- Rebuild and compare geometry, completeness, coherence, and fitness.
- Record both the weak and repaired quality decisions.

Current limitation: processing is a deterministic visual simulation, not Structure-from-Motion or a real point-cloud computation.

## M4.2 · Renovation Deployment Board

The player manipulates activities on four fictional project windows and connects outputs to responsibility nodes. The simulation executes activities and data dependencies. After Window 2, a courtyard-access event pauses the system. The player must physically move the handoff and courtyard activities before resuming.

Human playtest question: **Do I feel that I actually orchestrated and recovered a project system rather than filled in a planning form?**

- Connect the unassigned review package to Project records.
- Run the baseline schedule and observe live window progression.
- At the access event, resume without changes and inspect the blocked consequence.
- Replay, move the handoff into Window 3 and courtyard check into Window 4, then resume.
- Create two flight activities in one window and inspect the fictional kit conflict.

Current limitation: the project uses four authored activities, one change event, and deliberately small fictional capacities. It does not model real costs, procurement, legal duties, or universal sustainability metrics.

No final SCORM packages should be created for these three games until their developed learning materials have been reviewed and the provisional status is removed deliberately.
