# Stack Decision Guide

Which engine, repo layout, and authority model to pick for a new Zencode game.

---

## Engine host decision tree

```
Does the game need real-time 3D/volumetric presentation as the primary visual?
├── Yes → Unity 6 (URP)
│   ├── Sim complexity high + may need non-Unity consumers?
│   │   ├── Yes → Managed DLL split (Spawnwords pattern)
│   │   └── No  → In-repo asmdefs (BattleBrats pattern)
│   └── Art pipeline: Zencode Forge (3D) or VolumeFoundry (volumetric manifestations)
│
└── No → Is the core loop 2D sprite/tile based?
    ├── Yes → Phaser 4
    │   ├── Large system count (50+)? → ECS in Phaser project (Scrapfall pattern)
    │   └── Sim must be headless testable? → TS monorepo with packages/sim (Beastwright pattern)
    │   └── Art pipeline: Zencode Forge (2D doodad/part profiles)
    │
    └── Yes, but needs 3D creatures behind 2D UI → Phaser 4 + Three.js hybrid (Beastwright client)
        └── Phaser owns frame loop; Three never starts own RAF
```

### When Unity wins

- Stylized 3D toys/units (BattleBrats)
- Volumetric word manifestations (Spawnwords)
- Heavy UGUI / complex editor tooling
- PC/Steam-first with modest rendering needs
- C#-first team and LLM C# workflow

### When Phaser 4 wins

- 2D tile/board games (Scrapfall lineage)
- Rapid iteration on sprite presentation
- Web + Electron deploy path
- TypeScript-native team
- Large count of small independent systems (ECS scales well)

### When NOT to mix

- Don't put Domain rules in Phaser scenes (use headless sim)
- Don't put Unity physics in deterministic combat
- Don't run two game loops (one coordinator owns the frame)

---

## Repo layout decision tree

```
Will the simulation ever run outside the game client?
(e.g. server validation, replays, CLI tools, other hosts)
├── Yes → Split sim from host
│   ├── C# → Managed DLLs synced to Unity (Spawnwords)
│   │   src/<Game>.{Domain,Simulation,Application}/
│   │   eng/sync-unity-managed.ps1
│   │   client/<Game>.Unity/
│   │
│   └── TypeScript → Monorepo packages (Beastwright)
│       packages/sim, packages/tournament, apps/client, apps/server
│
└── No → In-repo layers (simpler, faster bootstrap)
    ├── C# → All in Unity project with asmdefs (BattleBrats)
    │   Assets/<Game>/{Core,Content,Simulation,Run,UI,Presentation}
    │
    └── TypeScript → Single repo (Scrapfall)
        js/systems/, data/catalog/, tools/
```

### Managed DLL split (Spawnwords)

**Choose when:**
- Sim must be identical on server, Unity, and test runners
- Domain is large enough to warrant separate solution
- You want cryptographic drift detection on host binaries

**Cost:**
- `eng/sync-unity-managed.ps1` maintenance
- Two-project workflow (dotnet + Unity)
- Contracts.Presentation DLL for shared DTOs

### In-repo asmdefs (BattleBrats)

**Choose when:**
- Single Unity product, no external sim consumers
- Faster iteration — no sync step
- Team lives entirely in Unity + C#

**Cost:**
- Harder to run sim headlessly outside Unity (mitigate with EditMode tests)
- Sim and host in same repo can drift coupling if boundaries aren't tested

### TS monorepo (Beastwright)

**Choose when:**
- Async multiplayer with server authority from day one
- Sim must run in Node for server + tests
- Multiple apps (client, server, content-editor)

**Cost:**
- Workspace tooling complexity
- Package boundary enforcement via CI

### Single-repo ECS (Scrapfall)

**Choose when:**
- Mature product with 100+ systems
- All authority in Phaser project
- Heavy codegen/policy-driven system registry

**Cost:**
- Harder to extract sim later
- Phaser coupling risk if boundaries slip

---

## Multiplayer / authority model

```
Does the game have ranked/competitive play?
├── No → Local authority
│   └── Sim runs in client; saves are local or cloud-persisted snapshots
│
└── Yes → Who commits outcomes?
    ├── Server commits (Beastwright) → async spectate model
    │   Simulation: server runs sim immediately
    │   Knowledge: client may conceal until watch
    │   Presentation: watch/skip is ceremony, not gate
    │
    └── Client commits with server validation (lighter) → snapshot upload + re-sim verify
        └── Requires content hash + ruleset version on every payload
```

### Match mode gating (if you have casual + ranked)

| Mode | Consequences | Stats |
|---|---|---|
| `official` | Losses, progression, veterancy | Committed to official tables |
| `exhibition` / `morpling` | None | Sandbox stores only |

Gate with a single `matchMode` check — not scattered `if (ranked)` branches.

---

## Content pipeline decision

```
How often does balance change?
├── Daily+ → JSON-canonical with hot-reload or fast bake
│   ├── C# → JSON pack → ContentBakePipeline → RuntimeContentDatabase
│   └── TS → data/catalog/ → DataLoader + Zod → frozen catalogs
│
└── Per-release → Compile-time bake with explicit promotion
    └── Spawnwords: offline ContentCompiler → CompiledGameplayRecord frozen at lock
```

### Always include regardless

- Schema version on every save/lock/replay payload
- Gameplay content hash (visual hash separate)
- Content path registry (no ad-hoc file paths)
- Validator that fails closed on unknown fields

---

## Art / production boundary

| Pipeline | Best for | Promotion target |
|---|---|---|
| **Zencode Forge** | 2D sprites, 3D GLB, audio gen | `Assets/Generated/Forge/` (Unity) or `data/images/` (Phaser) |
| **VolumeFoundry** | Volumetric word manifestations | Unity `Manifestations/Generated/` |
| **Inline placeholders** | Week 1 bootstrap | Colored primitives / `[PLACEHOLDER]` keys |

**Rule:** Assign final `artKey` / sound keys at first authoring. Missing files are OK; wrong keys are not.

---

## Recommended defaults for new games (2026)

| If your game is… | Default stack |
|---|---|
| 3D tactics / toy combat | Unity 6 in-repo asmdefs + Forge |
| Word/board roguelike | Unity managed DLL or Phaser depending on visual dimension |
| 2D roguelike with 50+ systems | Phaser 4 ECS single-repo |
| Async competitive construction | TS monorepo + Phaser client + server |
| Experimental prototype (< 4 weeks) | Phaser 4 single-repo, headless sim optional |

When in doubt: **start with the stack your team knows**, but adopt the **authority model** from this pack regardless of engine.
