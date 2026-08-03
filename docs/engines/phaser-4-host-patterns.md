# Phaser 4 Host Patterns

Engine-specific guidance for Phaser 4 as the product presentation host. Distilled from **Scrapfall**, **Beastwright**, and **Spawnwords** (historical Phaser path).

For agnostic rules (sim purity, presentation bridge, command/fact), see [core-contracts.md](../architecture/core-contracts.md).

> **Note:** Spawnwords product host is now Unity (ADR-0020). Phaser guidance here remains valid for Scrapfall, Beastwright client, and any future Phaser titles. Sister-title scars are documented in Spawnwords `PHASER_PRESENTATION_LESSONS.md`.

---

## Prime directive

> Phaser scenes are flow hosts and visual bridges. Game rules live in headless sim (TypeScript packages) or ECS kernel systems — never in scene `update()` methods as authority.

---

## Architecture shape

### Scrapfall (ECS in Phaser project)

```
BootOrchestrator          — composition root: services, data, new Phaser.Game()
  ↓
Scenes                    — UX flow, modal hosting, dependency injection
  ↓
ECSManager + *System      — gameplay authority (kernel subset)
  ↓
visuals/ + presentation/  — Phaser object ownership
```

### Beastwright (monorepo + hybrid renderer)

```
packages/sim              — headless match simulation (no Phaser)
packages/tournament       — server authority
apps/client               — Phaser 4 chrome + Three.js beast viewport
  ↓
BeastViewportHost         — Phaser owns frame loop; Three never starts RAF
```

---

## Boot as composition root

`BootOrchestrator` pattern:

1. Load config and services
2. Initialize `DataLoader` / content catalogs
3. Wire `SystemComposer` dependencies
4. **Then** `new Phaser.Game(config)`

Nothing in sim packages imports Phaser. Boot is the only place that connects them.

---

## Scene responsibilities

Scenes own:
- Scene lifecycle (`create`, `shutdown`, `destroy`)
- Modal/shell hosting
- Injecting narrow typed ports into systems
- Camera and layer setup

Scenes do **not** own:
- Board mutation authority
- Scoring or economy settlement
- Doodad/effect execution logic
- Direct `scene as any` reach-through to foreign systems

**Hard reject:** God scene that owns sim + pathfinding + VFX + economy.

---

## ECS system phases

Scrapfall executor phases:

```
input → pre → physics → post → render
```

**Rules:**
- Components = data only
- Systems = logic
- Entity pooling + deferred mutations
- System order declared in policy file — **not** import order

### Adding a new system

Same PR must include:
1. `*System` class (use template in `templates/`)
2. Entry in `tools/system-loading-policy.json`
3. Run `npm run gen:core-systems`
4. CI diffs generated `CoreSystemsRegistry.generated.ts`

Never hand-edit generated registries.

---

## Dependency injection lifetimes

| Lifetime | Inject at compose? | Resolve how |
|---|---|---|
| `composeStable` | Yes | DI field |
| `ecsScoped` | Yes (after audit) | DI field |
| `factoryMutable` | **No** | `IFactoryScope.get()` at use time |

**Critical:** Do not cache `factoryMutable` instances in system fields. `FactoryRuntime.beginFactory` owns shared store resets.

Feature state that crosses systems: host a `*StateStore` on `FactoryRuntime` — single writer, many readers, cleared in `beginFactory`.

---

## Event bus (command/fact)

Systems communicate via typed `GameEvent` classes — not direct method calls.

```typescript
// Command — one consumer
eventBus.emit(new ClearResolved(...));
// BoardMutationSystem handles exclusively

// Fact — many observers
eventBus.emit(new ClearCommitted(...));
// ScoringSystem, ObjectiveProcessor, VFX systems observe
```

No synchronous re-emits inside handlers. Queue for next phase.

See [command-fact-events.md](../architecture/command-fact-events.md).

---

## Data loading

**Single `DataLoader` facade** — never Phaser cache for gameplay data.

```
data/catalog/*.json
  → DataJsonPaths registry
  → per-domain readers + Zod validation
  → frozen in-memory catalogs
```

All content paths through registry. CI: `validate:content-paths`.

Zod schemas use `.passthrough()` — do not silently strip unknown JSON keys.

---

## Presentation ownership

### Semantic vs visual

Gameplay/sync systems write:
- Flags, counters, `AppearanceComponent` semantic state
- HP, status markers, effect keys

Presentation systems (`js/systems/visuals/`, `js/systems/presentation/`) write:
- Tints, alpha, scale, glow, filters
- Sprite lifecycle, pool management, particle effects

**`AppearanceSystem`** renders generic semantic appearance only — no feature-specific branches or catalog-ID switches.

**`SpriteSystem`** owns sprite lifecycle: pool, texture key, position/depth, masking, origin sanitization.

### Object ownership

```typescript
this.own(sprite);           // destroyed on system reset
this.ownPool(pool);         // pool drained on reset
this.ownTexture(texture);   // released on reset
```

### Reset sequence

`onSystemStateReset()`:
- Maps and flags only
- **No Phaser calls**
- Pool/texture cleanup happens in `BaseSystem` reset sequence before state reset

---

## Lifecycle ownership (Scrapfall model)

| Rule | Detail |
|---|---|
| Deferred work is scope-owned | Timers/tweens belong to run/battle/scene scope |
| Stale callback guards | Check owner liveness; cancel alone is insufficient |
| No ad hoc scene state fields | Use scoped stores or formal reset contracts |
| Callback completion ≠ cleanup | Explicit destroy in reset sequence |

### Phaser object lifecycle doc

See Scrapfall `docs/architecture/phaser-object-lifecycle.md` for WebGL texture rules, procedural graphics, and pool hygiene.

---

## Sprite and world-space rules

- Block sprites: `setOrigin(0, 0)` for grid alignment
- Overlay positioning uses world bounds, not assumed origins
- Geometry masks in world space
- Procedural textures: respect WebGL lifecycle (see `procedural-texture-graphics-webgl.mdc`)

---

## Factory lifecycle phases

Factory-scoped authority gates mutation:

```
FactoryBootstrap → FactorySetup → FactoryIntro → FactoryLive
```

Cross-phase events are queued, not synchronous. Only `FactoryLive` accepts player input mutations.

---

## Hybrid Phaser + Three.js (Beastwright)

When 3D content sits behind 2D UI:

```
Phaser (top canvas, UI chrome)
  ↓ owns requestAnimationFrame
BeastViewportHost (Three.js, transparent background)
  ↓
Shared PresentationClock
```

**Rules:**
- Phaser owns the frame loop
- Three.js never starts its own RAF
- One presentation coordinator
- Gameplay JSON: `visualId` → manifest → GLB
- `artKey` for 2D cards/icons only

---

## Board authority

Board is a **domain data structure** — not Phaser Tilemap authority.

```
Domain board matrix → BoardService → render projection → Phaser sprites
```

Reading sprite positions as board truth causes desync. This scar came from Crackwords and was formalized in Spawnwords A23.

---

## Pin Phaser version

Pin exact Phaser version in ADR when establishing a product host.

- Spawnwords historical: ADR-0015/0016 (Phaser 4.1.0 pin)
- Beastwright: Phaser 4 for client chrome
- Scrapfall: Phaser 3 (older pin — not Phaser 4, but patterns transfer)

---

## Testing and proof

| Proof type | Tool |
|---|---|
| Architecture lint | ESLint custom rules (`no-scene-as-any`, `no-wild-get-system`) |
| Validator suites | `npm run validate:focus` |
| System registry | `npm run ci:core-systems` |
| Typing ratchet | `npm run ci:ratchets` |
| Sim goldens | `test:sim:update-goldens` (Beastwright) |
| Player-visible flows | Playwright semantic bridge (when client exists) |

---

## Anti-patterns (Phaser-specific)

| Anti-pattern | Fix |
|---|---|
| `scene as any` reach-through | Typed port injected at compose |
| `.getSystem()` outside composer | DI field or event bus |
| `Block.takeDamage()` on data object | `DamageBlockRequested` command event |
| Doodad ID branch in kernel | Write capability; kernel reads generic model |
| Hand-edit generated registry | Edit policy JSON + run codegen |
| `Math.random()` in sim path | `StrictRng` / named streams |
| Unowned tween on scene transition | `own()` + phase reset |
| Board truth from Tilemap | Domain matrix + projection |

---

## Build order for new Phaser games

### Tranche 0 — Headless or kernel authority

**Monorepo (Beastwright):**
1. `packages/sim` with one effect in `EffectExecutor`
2. `IMPLEMENTED_EFFECT_ACTIONS` + ownership JSON
3. `validate:effect-actions` + `validate:gameplay-rng`
4. Sim golden digest test

**Single-repo ECS (Scrapfall):**
1. `BoardMutationSystem` as sole mutation authority
2. One command event (`ClearResolved`) + one fact (`ClearCommitted`)
3. `architecture-contract.md` with 7 rules
4. `validate:board-access` or equivalent

### Tranche 1 — Boot + composition root

1. `BootOrchestrator` — services, data, then `new Phaser.Game()`
2. `SystemComposer` wires systems with narrow deps
3. `system-loading-policy.json` with first systems classified
4. `npm run gen:core-systems` + CI diff check

### Tranche 2 — One scene, one interaction

1. Scene hosts flow only — no rules in `update()`
2. Input → command event → authority system → fact event
3. Presentation system observes fact → sprite/VFX
4. `own()` all Phaser objects; remount test on scene transition

### Tranche 3 — Content loop

1. `data/catalog/` + `ContentPaths` registry
2. Zod validation with passthrough
3. Add JSON definition → sim uses without code change
4. `validate:content-paths` + `validate:content`

### Tranche 4 — Scale systems

1. Add systems via template + policy JSON + codegen
2. Never hand-edit generated registries
3. Ratchet CI for typing (`ci:ratchets`)
4. Feature recipes in `docs/templates/`

---

## Sister-title scars → rules

| Source | Lesson |
|---|---|
| Crackwords | No god scenes, no scene reach-through, host-free sim |
| Scrapfall | Deferred scope ownership, stale callback guards, factory state stores |
| BattleBrats | Logical truth ≠ visual body count; split content hashes |
| Spawnwords | Playback ≠ re-sim; PresentationContract → AssetRelease |

Do not port Scrapfall ECS into C# Domain. Port the **ownership model**, not the implementation.
