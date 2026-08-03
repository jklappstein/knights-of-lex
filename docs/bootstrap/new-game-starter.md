# New Game Starter

Day-zero through first playable vertical slice. Use this when spinning up a new Zencode title — before writing game-specific design docs.

**Time target:** A provable loop (input → authority → fact → presentation) in the first sprint, not a polished feature.

---

## Phase 0 — Lock five decisions (1 meeting)

Answer these before scaffolding. Write an ADR for anything non-obvious.

| Decision | Options | Default recommendation |
|---|---|---|
| **Product host** | Unity 6 / Phaser 4 / headless-only | Unity for 3D/volumetric; Phaser for 2D-heavy + rapid iteration; headless first if competitive/async |
| **Sim location** | In-repo C# asmdefs / managed DLLs / TS `packages/sim` | DLL split if sim must ship to multiple hosts; in-repo if single Unity product |
| **Content authority** | JSON-canonical bake / runtime Zod load / hybrid | JSON bake for C# games; Zod load for TS monorepos |
| **Multiplayer model** | Local-only / async server authority / realtime | Async server if ranked play from day one (Beastwright pattern) |
| **Art boundary** | Zencode Forge / VolumeFoundry / inline placeholders | Forge for 2D/3D gen pipeline; VolumeFoundry for Spawnwords-style volumetric; placeholders always OK |

See [stack-decision-guide.md](stack-decision-guide.md) for the full decision tree.

---

## Phase 1 — Repo scaffold (day 1)

### Minimum folder set (all stacks)

```
<game>/
├── docs/
│   ├── adr/                    # ADR-0001 = baseline architecture
│   ├── contracts/              # Inviolable or gameplay contracts (start with 10-20 rules)
│   ├── handoff/ or llm-handoff/  # Bounded agent onboarding (≤20 docs)
│   └── templates/              # Feature recipes (copy from this pack)
├── .cursor/rules/              # 3-6 always-on agent fences
├── AGENTS.md                   # Commands, non-negotiables, read-first list
└── CONTRIBUTING.md             # Change type → validator matrix
```

### Stack-specific additions

| Stack | Add |
|---|---|
| **Unity (in-repo sim)** | `Assets/<Game>/Core|Content|Simulation|Run|UI|Presentation|Tests/` + asmdefs |
| **Unity (managed DLL)** | `src/<Game>.Domain/`, `src/<Game>.Simulation/`, `eng/sync-unity-managed.ps1`, `client/<Game>.Unity/` |
| **TS monorepo** | `packages/sim`, `packages/content-runtime`, `apps/client`, `tools/validate-*.mjs` |
| **TS single-repo** | `js/systems/`, `data/catalog/`, `tools/system-loading-policy.json` |

Full trees: [repo-scaffolds.md](repo-scaffolds.md).

---

## Phase 2 — Write the first contracts (day 1-2)

Start with **15-25 inviolable rules**, not a design bible. Copy structure from Spawnwords `INVIOLABLE_CONTRACTS.md` §0-2:

### Meta contracts (always include)

| ID | Rule |
|---|---|
| M1 | Product contracts define behaviour; CI rejects disagreement |
| M3 | Smallest complete vertical slice per change |
| M5 | Done = named proof (not compile-only) |
| M6 | Contract change = ADR + enforcement + migration in same PR |

### Architecture contracts (always include)

| ID | Rule |
|---|---|
| A1 | Sim/domain layer is host-free |
| A2 | Presentation is bridge only — never authors outcomes |
| A4 | Commands → one handler → facts → observers |
| A5 | One execution owner per effect/action type |
| A6 | Kernel does not branch on content catalog IDs |
| A7 | No scene/reach-through — typed ports only |

### Content contracts (always include)

| ID | Rule |
|---|---|
| C1 | JSON/catalog is authoritative — no class-per-definition |
| C5 | Schema version + content hash on saves/replays |
| C7 | Tags are vocabulary only |
| C13 | Missing required fields fail loud — no invented defaults |
| C16 | Split gameplay vs visual content hashes |

Template: [../templates/contract-starter.md](../templates/contract-starter.md)

---

## Phase 3 — Enforcement before features (day 2-3)

Architecture without enforcement erodes in week 2. Ship these gates before gameplay:

### Minimum viable CI (all stacks)

| Gate | What it catches |
|---|---|
| **Host-free boundary** | Engine imports in sim/domain |
| **Content schema validator** | Invalid/missing JSON at load |
| **Effect ownership** | Unregistered handlers |
| **RNG validator** | `Math.random` / `UnityEngine.Random` in authority path |
| **Focus suite** | Fast PR gate (< 2 min) |

### Cursor rules (copy and customize)

Minimum set:

1. `architecture.mdc` — layers, hard rejects (from [../architecture/core-contracts.md](../architecture/core-contracts.md))
2. `workflow.mdc` — read-first, one slice, name proof
3. `sim-purity.mdc` — no engine in authority path
4. `presentation-ownership.mdc` — semantic vs visual
5. `randomness.mdc` — three RNG categories

Point every rule at a canonical doc — don't duplicate essays in `.mdc` files.

Details: [../workflows/ci-validation-patterns.md](../workflows/ci-validation-patterns.md)

---

## Phase 4 — First vertical slice (week 1)

**Goal:** One player action flows through the full authority stack and produces a visible result that survives remount.

See [first-vertical-slice.md](first-vertical-slice.md) for stack-specific definitions.

### Universal acceptance criteria

- [ ] Player input becomes a **command** (not direct state mutation)
- [ ] Exactly **one handler** processes the command
- [ ] Handler emits at least one **committed fact**
- [ ] Presentation **observes** the fact (does not re-derive outcome)
- [ ] **Unit test** proves accept + reject paths
- [ ] **Remount test** or phase-reset proves no leaked state
- [ ] Content (if any) loads through validator, not hardcoded

### What NOT to build in week 1

- Full content tooling UI
- Art pipeline integration (placeholders OK)
- Multiplayer / server (unless that's the product thesis)
- More than one effect type
- Polished UI (debug overlay is fine)

---

## Phase 5 — Tranche build order (weeks 2-8)

Build in this order. Each tranche must be provable before the next starts.

```
Tranche 0: Authority spine
  sim boot → one command → one fact → test golden

Tranche 1: Content load
  JSON schema → validator → frozen catalog → sim reads IDs

Tranche 2: Presentation bridge
  host displays fact → input forwards command → remount clean

Tranche 3: Content authoring loop
  add definition in JSON → validate → bake → sim uses it (no code change)

Tranche 4: Effect pipeline
  data-driven effect → registry → executor → ownership CI

Tranche 5: Run loop
  start → play → end → persist snapshot with content hash

Tranche 6: Economy / rewards (if applicable)
  single-writer wallet → commit-before-show rolls

Tranche 7: Art boundary (if applicable)
  contract → release → fallback → presentation loads approved only
```

**Rule:** Never skip a tranche because "we'll refactor later." Each tranche is the foundation the next depends on.

---

## Phase 6 — Agent onboarding pack (week 1, parallel)

Create a bounded handoff pack (≤20 docs). Agents that read 200 files invent architecture.

### Required docs

| # | Doc | Content |
|---|---|---|
| 1 | `00-START-HERE.md` | Fences, precedence, what not to read |
| 2 | `repo-map.md` | Folder layout, where to put new code |
| 3 | `contracts-summary.md` | Top 20 rules with IDs |
| 4 | `work-loop.md` | Read → find pattern → slice → proof |
| 5 | `commands.md` | Build, test, validate commands |
| 6 | `implementation-state.md` | What's shipped vs planned (update often) |

### Fast lookup table (in `docs/README.md`)

```markdown
| Task | Read |
|---|---|
| New effect | templates/new-effect-action.md |
| New content type | templates/new-content-type.md |
| Architecture change | adr/TEMPLATE.md + contracts |
| Unity presentation | engines/unity-host-patterns.md (or local copy) |
```

---

## Phase 7 — Art / Forge hookup (when ready, not day 1)

When visuals matter:

1. Create `tools/forge/project.yaml` (or VolumeFoundry equivalent)
2. Define one profile with aesthetic `constitution`
3. Set `allowedWriteRoots` — promoted files only
4. Assign final `artKey` / sound keys at first authoring
5. Placeholders are first-class — missing art ≠ missing logic

Zencode Forge addendum pattern: `E:\Projects\Zencode Forge\docs\design\FORGE_IMPLEMENTATION_SPEC.md`

---

## New game checklist (printable)

### Day 0
- [ ] Stack decisions locked (ADR-0001)
- [ ] Repo scaffolded per [repo-scaffolds.md](repo-scaffolds.md)
- [ ] `AGENTS.md` + 3+ cursor rules
- [ ] Contract doc with M/A/C minimum set

### Week 1
- [ ] Host-free boundary test passes
- [ ] Content validator passes on fixture
- [ ] First vertical slice complete per [first-vertical-slice.md](first-vertical-slice.md)
- [ ] Handoff pack started (≥5 docs)
- [ ] `ci:agent-gates` or equivalent runs green

### Week 2-4
- [ ] Effect registry + ownership CI
- [ ] RNG validator
- [ ] Presentation remount test
- [ ] Content authoring loop (add JSON → sim uses without code change)
- [ ] Feature recipe templates for top 3 feature types

### Before calling it "bootstrapped"
- [ ] 10+ contract IDs with enforcement status tracked
- [ ] Golden test or replay digest for core loop
- [ ] Human play checklist for player-visible flows
- [ ] CONTRIBUTING change matrix complete

---

## Anti-patterns that kill new games

| Mistake | Cost | Prevention |
|---|---|---|
| Build UI before authority spine | Dual writers, untestable | Tranche 0 first |
| ScriptableObjects + JSON dual source | "Which file won?" bugs | Pick one canonical source day 1 |
| God scene / god MonoBehaviour | Untestable tar pit | Thin host + facade from week 1 |
| Skip validators "until later" | Architecture erodes week 3 | Phase 3 before Phase 4 |
| Design bible before contracts | Agents implement flavor as rules | Contracts first, bible parallel |
| Port another game's ECS literally | Wrong abstractions | Port ownership **model**, not code |
| No content hash on saves | Silent wrong replays | C5 from day 1 |
| Compile = done | False confidence | M5 from day 1 |

---

## Reference: what each existing game bootstrapped first

| Game | Week-1 spine | Key early proof |
|---|---|---|
| **BattleBrats** | JSON bake → `RuntimeContentDatabase` → placement + combat sim | Golden combat scenarios |
| **Scrapfall** | ECS + `BoardMutationSystem` + command/fact events | `validate:board-access` |
| **Beastwright** | `packages/sim` headless → effect executor → ownership CI | Sim golden digests |
| **Spawnwords** | Domain lock → `BattleAuthoritySession` → Unity bridge | Architecture.Tests + managed sync |

Copy the **shape**, not the domain rules.
