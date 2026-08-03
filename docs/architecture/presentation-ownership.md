# Presentation Ownership

How to keep visuals from becoming a second source of truth.

---

## The split

| Layer | Owns | Must not own |
|---|---|---|
| **Gameplay / sim** | Semantic state: flags, counters, HP, statuses, markers | Tints, alpha, scale, sprites, particles, audio triggers |
| **Presentation** | Visual interpretation of semantic state | Outcomes, legality, prices, RNG, stat mutations |

Scrapfall **Rule 7**: gameplay stores semantic markers; presentation systems under `visuals/` and `presentation/` own Phaser objects.

Spawnwords **A2/A23**: Unity renders projections; battlefield authority is domain data, not `Transform` positions.

Beastwright **Rule 5**: sync code stores markers; Phaser styling lives in client presentation modules.

---

## Semantic markers vs visual styling

**Good — gameplay writes:**
```typescript
block.setFlag('onFire', true);
block.hp = 3;
appearance.semanticState = 'damaged';
```

**Bad — gameplay writes:**
```typescript
sprite.setTint(0xff0000);
sprite.setAlpha(0.5);
particleEmitter.start();
```

Presentation reads markers and decides how to render. Different presentation profiles can interpret the same marker differently (accessibility, reduced motion, colour-blind modes).

---

## Playback model

For any settled/replayed mode:

```
Authority commits facts → event log / envelopes → presentation advances cursor → visuals
```

**Rules:**
- Presentation never re-runs wallet, shop, or combat authority
- Capped VFX is fine (10 visual bodies for 100 logical units) — outcomes must match
- Knowledge concealment (spoilers, fog) is UI-only — never gates rewards

---

## Lifecycle ownership

Every engine object needs a declared destroy-owner. Orphaned tweens, timers, and textures are the #1 source of "works once, breaks on remount" bugs.

### Ownership declaration

| Resource | Owner | Cleanup trigger |
|---|---|---|
| GameObjects / sprites | Presenter or scene scope | Phase exit, scene destroy |
| Tweens / timers | Scope that started them | Cancel on phase exit |
| Object pools | `BaseSystem` / presenter | `ownPool()` → reset on factory/scene change |
| Textures (procedural) | Creator system | `ownTexture()` → release on reset |
| Input bindings | Phase controller | Unbind on phase exit |
| Coroutines | Starting MonoBehaviour | Stop on destroy |

### Reset sequence (all engines)

When transitioning phases or factories:

```
1. Cancel in-flight async / timers / tweens
2. Destroy pooled / spawned objects
3. State-only reset (maps, flags — no engine calls)
4. Release textures / procedural assets
5. Activate next phase
```

Spawnwords template: `docs/templates/unity-run-scene-lifecycle.md`  
Scrapfall: `onSystemStateReset()` is state-only — no Phaser in reset

### Stale callback guards

Deferred callbacks must check owner liveness:

```
if (!scope.isAlive) return;  // no-op, don't touch freed objects
```

Cancel alone is insufficient — the callback may already be queued.

---

## Unity-specific presentation rules

- MonoBehaviours: render, input, VFX, view-model binding
- `RunController` / facade for mutations — never expose raw services to UI
- One persistent run scene; phase controller for in-run transitions
- `Contracts.Presentation` DTOs bridge managed DLLs to Unity
- Namespace trap: never `BattleBrats.Presentation.Camera` — use `CameraRig`

See [engines/unity-host-patterns.md](../engines/unity-host-patterns.md).

---

## Phaser-specific presentation rules

- Scenes = flow hosts, not rule engines
- `own()`, `ownPool()`, `ownTexture()` on `BaseSystem`
- `GameObjectPool` for ribbons/VFX; `SpritePool` for tiles
- Block sprites: `setOrigin(0,0)` for grid alignment
- No `scene as any` — typed ports injected at compose time
- Factory-scoped deps: resolve at use time, never cache in fields

See [engines/phaser-4-host-patterns.md](../engines/phaser-4-host-patterns.md).

---

## Hybrid 2D/3D (Beastwright pattern)

When mixing Phaser UI with Three.js 3D:

- **Phaser owns the frame loop** — Three.js never starts its own `requestAnimationFrame`
- One presentation coordinator bridges both
- Shared `PresentationClock`
- Gameplay JSON uses `visualId` → visual manifest → GLB
- `artKey` for 2D cards/icons only

Unity analog: sub-camera render textures, not a second game loop.

---

## Visual production boundary

Runtime loads approved releases only:

```
PresentationContract → approved AssetRelease → engine assets
```

- Contract = semantic recipe (what it means)
- Release = shipped binaries (what you load)
- Fallback keys are explicit — runtime never repairs missing content
- Accessibility overlays compose **on top** — never replace semantic state

---

## Anti-patterns

| Anti-pattern | Consequence |
|---|---|
| HP bar calculates damage | Presentation authoring outcomes |
| Board read from Tilemap positions | Display-as-truth desync |
| Unowned tween on scene exit | Memory leak, stale callbacks |
| Factory state in long-lived system fields | Cross-run contamination |
| Re-sim during playback for "sync" | Dual authority |
| Feature tint logic in generic `AppearanceSystem` | Kernel presentation coupling |
