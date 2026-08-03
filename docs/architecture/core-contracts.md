# Core Architecture Contracts

Agnostic rules that appear, in some form, across all four Zencode games. Product repos enforce these with different tools (asmdefs, ESLint, NetArchTest, custom validators) but the intent is identical.

---

## 1. Simulation purity

**Rule:** Game outcomes live in a host-free core. No engine APIs, no DOM, no wall-clock, no HTTP in the authority path.

| Game | Authority layer | Enforcement |
|---|---|---|
| Spawnwords | `Spawnwords.Domain`, `Spawnwords.Simulation` | NetArchTest assembly bans |
| BattleBrats | `BattleBrats.Core/Content/Simulation/Run` | `noEngineReferences` asmdefs + boundary scan |
| Scrapfall | ECS systems under `js/systems/` (kernel subset) | ESLint + `validate:gamescene-authority` |
| Beastwright | `packages/sim` | `validate:gameplay-rng`, sim purity cursor rule |

**Why:** Deterministic goldens, replays, headless CI, and testability. Every game hit this wall at least once.

**Hard rejects:**
- `UnityEngine.Random` / `Math.random()` in gameplay authority
- Constructing rule engines inside presentation as live settlement authority
- Reading display object transforms as board/combat truth

---

## 2. Presentation is a bridge

**Rule:** The engine host displays state and forwards player intents. It never authors outcomes, prices, legality, or RNG results.

```
Player input → intent/command → domain handler → committed facts → presentation observes
```

**Hard rejects:**
- UI calculating economy or combat results
- Presentation mutating authoritative run/battle state directly
- Client constructing simulators as live authority for ranked/settled play
- "Pretty lies" — visuals that disagree with committed facts

**Correct pattern:** Facade controller (`RunController`, application commands, `BattleAuthoritySession.TryStepNext`) sits between presentation and services.

---

## 3. Layered dependency direction

Dependencies flow **inward** toward rules. Presentation and platform sit at the edge.

### C# / Unity games (Spawnwords, BattleBrats)

```
Core/Domain → Content → Simulation → Run/Application → UI (view models) → Presentation (MonoBehaviours)
```

- Inner layers: `noEngineReferences: true`
- Presentation: render, input, VFX, bind view-models
- One public type per file; interfaces in separate files

### TypeScript games (Scrapfall, Beastwright)

```
sim/packages → content-runtime → server (if async) → client (Phaser)
```

- `packages/sim` or kernel ECS systems: no Phaser imports
- Composition root (`BootOrchestrator`, `SystemComposer`) owns wiring
- Systems receive narrow ports, not god service bags

---

## 4. Single access path for singleton truth

**Rule:** One authoritative accessor per runtime truth (board, run, wallet, factory scope).

**Hard rejects:**
- Two code paths that can disagree on "the" board
- Caching `factoryMutable` deps in system fields across factory boundaries
- Scene bags / `scene as any` reach-through instead of typed ports

**Correct pattern:** `BoardService`, `IFactoryScope.get()`, `NavigationTraversalAuthority`, branded snapshot queries.

---

## 5. Single policy authority per rule family

**Rule:** Each cross-cutting concern has exactly one owner. No duplicated traversal, wall, gate, or blocker policy in multiple places.

**Examples:**
- BattleBrats: `NavigationTraversalAuthority` — all nav traversal queries
- Scrapfall: `BoardMutationSystem` — all board mutations
- Spawnwords: `CapabilityExecutor` — all compiled ability execution

When you need a new policy, extend the authority — do not fork a parallel evaluator.

---

## 6. Gameplay kernel boundary

**Rule:** Core gameplay systems do not branch on content catalog IDs. Content publishes generic capabilities; kernel reads those only.

**Hard rejects:**
```csharp
if (word == "FLOWER") { ... }   // Spawnwords anti-pattern
if (doodadId == "lava_lamp") { ... }  // Scrapfall anti-pattern
```

**Correct pattern:**
- Data-driven effect primitives, capability records, `EffectKey` read models
- One execution owner per effect/action type
- Unknown actions fail validation — never silently skip

---

## 7. Composition root owns wiring

**Rule:** Only the composition root constructs and connects systems. Ordinary code receives narrow interfaces injected at compose time.

**Hard rejects:**
- `getSystem()` / service locator from arbitrary call sites
- Injecting the complete system map into every system
- Untyped scene dependency bags

**Correct pattern:**
- Unity: scene bootstrap wires presenters; `RunController` facade for mutations
- Phaser: `SystemComposer` + `BootOrchestrator`; event bus for cross-system commands
- TypeScript: DI lifetimes (`composeStable`, `ecsScoped`, `factoryMutable`)

---

## 8. No god scenes / thin hosts

**Rule:** Engine scenes are lifecycle hosts — dependency injection, view composition, phase transitions. They do not own game rules.

**Hard rejects:**
- God battle scene owning sim + pathfinding + VFX + economy
- Replacing the entire run scene for ordinary in-run phase changes
- 400-line scene files with embedded rule logic

**Correct pattern:**
- Spawnwords: one persistent Run scene; `RunPresentationPhaseController` for Planning → Battle → PostBattle
- Scrapfall: scenes own UX flow; ECS owns rules
- Beastwright: Phaser owns frame loop; Three.js sub-renderer never starts its own RAF

---

## 9. Platform at the edge

**Rule:** Achievements, telemetry, Steam, and cloud persistence consume **committed facts**, not button clicks or presentation events.

**Hard rejects:**
- Platform SDK imports in sim/domain packages
- Cloud repairing or overwriting authoritative gameplay outcomes
- Achievements triggered before server/commit confirms the fact

---

## 10. Knowledge ≠ simulation

**Rule:** Conceal/reveal, watch/skip, and spoiler UI are presentation knowledge only. They never gate rewards, saves, or official stats.

**Three layers (Beastwright async model):**

| Layer | Meaning |
|---|---|
| Simulation | Server commits outcomes immediately |
| Knowledge | Client may conceal until player watches |
| Presentation | Watch/skip over committed replay — ceremony, not gate |

---

## 11. Tranche build order (new games)

When bootstrapping, build in this order. Each tranche must be provable before the next starts. See [../bootstrap/first-vertical-slice.md](../bootstrap/first-vertical-slice.md).

| Tranche | Delivers | Proof |
|---|---|---|
| **0 — Authority spine** | One command → one handler → one fact | Unit test + boundary test |
| **1 — Content load** | JSON → validator → frozen catalog | Validator passes on fixture |
| **2 — Presentation bridge** | Host displays fact, forwards command | Remount test |
| **3 — Authoring loop** | Add JSON definition → sim uses without code change | Content-only PR changes behaviour |
| **4 — Effect pipeline** | Registry + executor + ownership CI | `validate:effect-actions` |
| **5 — Run loop** | Start → play → end → persist with content hash | Save/replay round-trip |
| **6 — Economy** | Single-writer wallet, commit-before-show rolls | Double-spend test |
| **7 — Art boundary** | Contract → release → fallback | Missing art ≠ crash |

**Never skip tranche 0** because "we'll add tests later." Authority bugs compound.

---

## 12. Where new code goes (by change type)

| Change type | Unity in-repo | Managed DLL | TS monorepo | TS ECS |
|---|---|---|---|---|
| Rule / legality | `Simulation/` | `Domain/` | `packages/sim/` | kernel `*System` |
| Battle/combat tick | `Simulation/` | `Simulation/` | `packages/sim/` | `*System` |
| Command orchestration | `Run/` or `UI/` | `Application/` | `apps/server/` | scene → event bus |
| Content bake/load | `Content/` | `ContentCompiler/` | `content-runtime/` | `DataLoader` |
| Presentation | `Presentation/` | `client/.../Runtime/` | `apps/client/` | `systems/visuals/` |
| Shared DTO | `Content/` contracts | `Contracts.Presentation/` | `shared-types/` | `types/` |
| Tests | `Tests/` EditMode | `tests/*.Tests/` + Unity | `packages/sim/tests/` | `__tests__/` |
| Validators | `Tests/` + scripts | `eng/check-*.ps1` | `tools/validate-*.mjs` | `tools/validation-manifest.json` |

Full scaffolds: [../bootstrap/repo-scaffolds.md](../bootstrap/repo-scaffolds.md)

---

## Quick hard-reject checklist

Before merging any gameplay change, verify none of these are true:

- [ ] Sim rules in MonoBehaviour / Phaser scene / presentation module
- [ ] Engine RNG in gameplay authority path
- [ ] Economy or combat math in UI/view code
- [ ] Content IDs as language enums (use string IDs + validation)
- [ ] Dual canonical authoring sources for the same definition
- [ ] Untested custom effect handler
- [ ] `any` / unchecked casting in product packages
- [ ] Scene reach-through or god service injection
- [ ] Presentation constructing simulators as live authority
- [ ] Display transforms as board/combat truth
