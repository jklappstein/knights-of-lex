# Repo Scaffolds

Copy-ready folder layouts for the three proven Zencode stacks. Customize names; keep dependency direction.

---

## Scaffold A — Unity in-repo (BattleBrats)

Best for: single Unity product, C# sim in asmdefs, JSON bake pipeline.

```
BattleBrats/
├── .cursor/rules/
│   ├── battlebrats-architecture.mdc
│   ├── battlebrats-workflow.mdc
│   ├── battlebrats-csharp.mdc
│   ├── battlebrats-simulation-content.mdc
│   ├── battlebrats-presentation-bridge.mdc
│   └── battlebrats-unity-ui.mdc
├── docs/
│   ├── Decision_Records/
│   ├── Battle_Brats_Design_Bible/
│   │   ├── 07_Unity_Implementation_Spec.md    ← LLM execution contract
│   │   ├── 08_Content_Contract_v0.1.md
│   │   └── 09_Proof_Foundation_Contract.md
│   └── content/
├── scripts/
│   ├── check-unity-compile.ps1
│   ├── compile-project.ps1
│   └── run-editmode-tests.ps1
├── tools/forge/                              ← Zencode Forge manifest
│   ├── project.yaml
│   └── profiles/
└── Assets/BattleBrats/
    ├── Core/                    # IDs, math, seed derivation (noEngineReferences)
    ├── Content/                 # Bake, validation, interchange (noEngineReferences)
    │   ├── Bake/ContentBakePipeline.cs
    │   ├── Data/*.json          # Canonical authoring
    │   └── Interchange/
    ├── Simulation/              # Combat, nav, placement (noEngineReferences)
    ├── Run/                     # Run loop, economy, shops (noEngineReferences)
    ├── UI/                      # View models, RunController facade
    ├── Presentation/            # MonoBehaviour bridges only
    ├── Tests/                   # EditMode: boundary + golden combat
    ├── Authoring/               # Editor tools (may use UnityEngine)
    ├── Tools/                   # Editor utilities
    ├── Art/
    ├── Audio/
    └── Scenes/
```

### Asmdef dependency graph

```
Core → Content → Simulation → Run → UI / Presentation
         ↑
    Authoring (editor only)
```

### Key files to create first

| File | Purpose |
|---|---|
| `Core/SeedDerivation.cs` | Named RNG streams |
| `Content/Bake/ContentBakePipeline.cs` | JSON → RuntimeContentDatabase |
| `UI/RunController.cs` | Facade between presentation and services |
| `Tests/ArchitectureBoundaryTests.cs` | Scans for UnityEngine in pure layers |
| `Content/Data/content_pack.dev.json` | First fixture content |

---

## Scaffold B — Unity managed DLL (Spawnwords)

Best for: large domain, server potential, cryptographic DLL sync.

```
Spawnwords/
├── .cursor/rules/spawnwords-unity-host.mdc
├── docs/
│   ├── adr/                     # ADR-0001 baseline, ADR-0020 unity host, etc.
│   ├── contracts/               # gameplay-contracts.md, schemas/
│   ├── INVIOLABLE_CONTRACTS.md
│   ├── llm-handoff/             # ≤20 doc agent pack
│   ├── templates/               # Feature recipes
│   └── evidence/contract-enforcement.md
├── eng/
│   ├── bootstrap.ps1
│   ├── sync-unity-managed.ps1
│   ├── nudge-unity-focus.ps1
│   └── check-*.ps1
├── src/
│   ├── Spawnwords.Domain/
│   ├── Spawnwords.Simulation/
│   ├── Spawnwords.Application/
│   ├── Spawnwords.ContentCompiler/    # Offline only
│   ├── Spawnwords.Contracts.Presentation/
│   ├── Spawnwords.Economy/
│   └── Spawnwords.sln
├── tests/
│   ├── Spawnwords.Domain.Tests/
│   ├── Spawnwords.Simulation.Tests/
│   └── Spawnwords.Architecture.Tests/
└── client/Spawnwords.Unity/
    ├── Assets/Spawnwords/Runtime/     # Presentation bridge
    ├── Assets/Spawnwords/Tests/       # EditMode + PlayMode
    └── Assets/Plugins/Spawnwords.Managed/
        ├── *.dll
        └── generated-source-manifest.json
```

### Sync workflow

```powershell
dotnet test                                    # prove managed code
pwsh eng/sync-unity-managed.ps1               # build + copy + SHA256 manifest
pwsh eng/nudge-unity-focus.ps1                # flush Unity AssetDatabase
# Unity EditMode/PlayMode tests
```

### Key files to create first

| File | Purpose |
|---|---|
| `tests/Spawnwords.Architecture.Tests/DependencyRuleTests.cs` | Assembly ban enforcement |
| `src/Spawnwords.Simulation/BattleAuthoritySession.cs` | Steppable authority loop |
| `eng/sync-unity-managed.ps1` | Single DLL boundary |
| `docs/INVIOLABLE_CONTRACTS.md` | Contract IDs M/A/C/F/R/P |

---

## Scaffold C — TypeScript monorepo (Beastwright)

Best for: async multiplayer, headless sim in Node, Phaser client.

```
Beastwright/
├── .cursor/rules/               # 12+ scoped rules
├── AGENTS.md
├── docs/
│   ├── architecture/
│   │   ├── architecture-contract.md
│   │   ├── event-boundaries.md
│   │   └── async-multiplayer.md
│   ├── handoff/
│   ├── templates/               # new-effect-action, new-part-pack, etc.
│   ├── for-ai-assistants.md
│   └── implementation-checklist.md
├── content/                     # Authoritative JSON
│   ├── parts/
│   ├── meta/effect-ownership.json
│   └── tags/vocabulary.json
├── packages/
│   ├── sim/                     # Headless — NO Phaser/DOM
│   ├── tournament/              # Server authority logic
│   ├── content-runtime/         # ContentPaths, loaders
│   ├── shared-types/            # Branded IDs
│   └── platform/                # Steam/Electron — app edge only
├── apps/
│   ├── client/                  # Phaser 4 + Three.js hybrid
│   ├── server/
│   └── content-editor/
├── tools/
│   ├── validate-effect-actions.mjs
│   ├── validate-gameplay-rng.mjs
│   ├── validate-content-paths.mjs
│   └── sim-registration-policy.json
└── package.json                 # ci:agent-gates, validate:focus
```

### Package dependency graph

```
shared-types → content-runtime → sim → tournament
                                    ↓
                              apps/client (Phaser — presentation only)
                              apps/server (orchestration, no inline sim rules)
```

### Key files to create first

| File | Purpose |
|---|---|
| `packages/sim/src/effects/EffectExecutor.ts` | Generic effect interpreter |
| `packages/content-runtime/src/ContentPaths.ts` | Path registry |
| `content/meta/effect-ownership.json` | Bidirectional ownership map |
| `tools/validate-effect-actions.mjs` | Catalog ↔ executor sync CI |
| `tools/validate-gameplay-rng.mjs` | No Math.random in sim |

---

## Scaffold D — TypeScript single-repo ECS (Scrapfall)

Best for: mature 2D game, 50+ systems, Phaser 3/4 host.

```
Scrapfall/
├── .cursor/rules/               # 24 rules
├── AGENTS.md
├── docs/
│   ├── architecture/            # architecture-contract.md + 15 pattern docs
│   ├── handoff/                 # 8-doc onboarding sequence
│   ├── templates/
│   └── systems/DOCUMENTATION-TIERS.md
├── data/catalog/                # Authoritative JSON
├── js/
│   ├── boot/BootOrchestrator.ts
│   ├── di/DependencyLifetimes.ts
│   ├── systems/                 # ECS systems
│   │   ├── visuals/
│   │   └── presentation/
│   ├── scenes/
│   └── data/DataLoader.ts
├── templates/                   # Code scaffolds for new systems
├── tools/
│   ├── validation-manifest.json
│   ├── system-loading-policy.json
│   └── run-validate.js
└── package.json
```

### Key files to create first

| File | Purpose |
|---|---|
| `js/boot/BootOrchestrator.ts` | Composition root |
| `docs/architecture/architecture-contract.md` | 7 enforceable rules |
| `tools/system-loading-policy.json` | System ordering policy |
| `tools/validation-manifest.json` | Validator suites |
| `data/catalog/` + Zod readers | Content authority |

---

## Shared scaffold elements (all stacks)

Regardless of stack, every new game repo should include:

```
<game>/
├── docs/adr/TEMPLATE.md
├── docs/adr/ADR-0001-baseline-architecture.md
├── docs/contracts/inviolable-contracts.md    # Start with M/A/C sections
├── docs/templates/                           # Copy playbooks from zencode games
├── .cursor/rules/architecture.mdc
├── .cursor/rules/workflow.mdc
├── AGENTS.md
└── CONTRIBUTING.md
```

### AGENTS.md minimum sections

```markdown
# <Game> — Agent Guide
## What this is (one paragraph)
## Non-negotiables (10-15 bullets)
## Read first (ordered list, ≤7 items)
## Commands (build, test, validate table)
## Borrowed from Zencode Games (link to e:\projects\zencode games\)
```

### CONTRIBUTING.md minimum sections

```markdown
## Change type → required proof
| Change | Files | Validator |
| New effect | ... | validate:effect-actions |
| New system | ... | gen:core-systems |
| Contract change | ADR + enforcement | ... |
```

---

## Naming conventions (all stacks)

| Concept | Convention | Example |
|---|---|---|
| Content IDs | Hierarchical dot notation | `toy.dragonkeep.barracks` |
| Branded IDs | Parse at boundaries | `BrandId`, `PartId`, `EntityId` |
| Effect actions | `snake_case` in JSON | `deal_damage`, `apply_status` |
| Commands | Imperative verb | `LockFormation`, `ClearResolved` |
| Facts | Past tense / state noun | `ClearCommitted`, `BlockHpLost` |
| Schema versions | `schemaVersion` field | `layout.v2`, `forge.project.v1` |
| RNG streams | Domain-tagged | `DomainCombat`, `DomainShop` |
