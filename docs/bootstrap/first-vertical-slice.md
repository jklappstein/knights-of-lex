# First Vertical Slice

The minimum provable gameplay loop for each stack. Ship this before any other feature.

**Universal definition:** Player input → command → single handler → committed fact → presentation observes → test proves it → remount doesn't leak.

---

## Unity in-repo (BattleBrats shape)

### The slice: place one toy, run one combat tick

```
Player clicks cell
  → RunController.PlaceToy(cell, toyId)        // facade command
  → PlacementService.Validate(placement)          // pure C# validation
  → RunState.ApplyPlacement(placement)          // state mutation
  → PlacementCommitted fact                       // committed fact
  → BoardPresenter.OnPlacementCommitted(fact)    // presentation observes
```

### Files to create

| Layer | File | Responsibility |
|---|---|---|
| Core | `PlacementCoord.cs` | Integer grid coord (not Vector3) |
| Content | `toys.json` + bake | One toy definition |
| Simulation | `PlacementService.cs` | Validates placement rules |
| Run | `RunState.cs` | Holds placement state |
| UI | `RunController.cs` | `PlaceToy()` facade method |
| UI | `PlacementViewModel.cs` | Read-only projection for UI |
| Presentation | `BoardPresenter.cs` | Spawns prefab on fact |
| Tests | `PlacementServiceTests.cs` | Accept + reject paths |
| Tests | `ArchitectureBoundaryTests.cs` | No UnityEngine in Sim |

### Acceptance tests

```csharp
[Test] public void PlaceToy_ValidCell_Accepts() { ... }
[Test] public void PlaceToy_OccupiedCell_Rejects() { ... }
[Test] public void Presentation_DoesNotMutateRunState() { ... }
```

### Human proof

1. Enter play mode → click empty cell → toy appears
2. Click occupied cell → nothing happens (or error toast)
3. Exit play mode → re-enter → state correct

---

## Unity managed DLL (Spawnwords shape)

### The slice: lock formation → one battle step

```
Player confirms lock
  → LockFormation command (Application)
  → BattleFormationLocker (Domain) → LockedBattleSnapshot
  → UnityRunContext.CommitBattleStart(snapshot)
  → BattleAuthoritySession.TryStepNext() → BattleEventEnvelope
  → BattlePresentationBridge maps envelope → presenter directive
```

### Files to create

| Layer | File | Responsibility |
|---|---|---|
| Domain | `BattleFormationLocker.cs` | Validates + produces snapshot |
| Domain | `LockedBattleSnapshot.cs` | Immutable lock artifact |
| Simulation | `BattleAuthoritySession.cs` | `TryStepNext()` steppable loop |
| Application | `LockFormationHandler.cs` | Orchestrates lock command |
| Contracts | `BattleEventEnvelope.cs` | Shared DTO for bridge |
| Unity | `BattlePresentationBridge.cs` | Maps envelopes, never authors |
| Tests | `BattleFormationLockerTests.cs` | Lock accept/reject |
| Tests | `DependencyRuleTests.cs` | Domain has no UnityEngine |
| eng | `sync-unity-managed.ps1` | DLL sync with manifest |

### Acceptance tests

```csharp
// Domain.Tests
[Test] public void LockFormation_ValidDraft_ProducesSnapshot() { ... }
[Test] public void LockFormation_IllegalPlacement_Rejects() { ... }

// Simulation.Tests
[Test] public void TryStepNext_EmitsOrderedEnvelopes() { ... }

// Architecture.Tests
[Test] public void Domain_DoesNotReferenceUnity() { ... }
```

### Human proof

1. Planning scene → place letters → lock
2. Battle starts without scene reload
3. At least one battle event produces visible feedback
4. PostBattle → return to planning without leaked battle objects

---

## TypeScript monorepo (Beastwright shape)

### The slice: one effect action in headless sim

```
Sim tick
  → EffectExecutor.execute('deal_damage', context)
  → HP reduced on target
  → SimEvent emitted (fact)
  → (no client yet — test proves outcome)
```

### Files to create

| Layer | File | Responsibility |
|---|---|---|
| sim | `EffectExecutor.ts` | Switch/registry for action types |
| sim | `IMPLEMENTED_EFFECT_ACTIONS` | Const array for CI |
| sim | `StrictRng.ts` | Named seeded streams |
| content | `parts/test_part.json` | One part with one effect |
| content | `meta/effect-ownership.json` | Maps action → owner |
| content-runtime | `ContentPaths.ts` | Path registry |
| tools | `validate-effect-actions.mjs` | Bidirectional sync check |
| tools | `validate-gameplay-rng.mjs` | No Math.random in sim |

### Acceptance tests

```typescript
test('deal_damage reduces HP deterministically', () => {
  const result = runSimTick(fixture, seed);
  expect(result.events).toContainEqual(expect.objectContaining({ type: 'DamageDealt', amount: 5 }));
  expect(digest(result)).toMatchSnapshot();
});
```

### Human proof (once client exists)

1. Load Frankentable → part with effect visible
2. Run exhibition match → damage number appears
3. Replay produces same outcome

---

## TypeScript ECS (Scrapfall shape)

### The slice: one line clear command

```
Piece locks
  → LockingSystem emits ClearResolved (command)
  → BoardMutationSystem handles (sole consumer)
  → Board state mutated
  → ClearCommitted emitted (fact)
  → ScoringSystem observes → score updated
```

### Files to create

| Layer | File | Responsibility |
|---|---|---|
| boot | `BootOrchestrator.ts` | Wires services, starts Phaser |
| systems | `BoardMutationSystem.ts` | Sole board mutation authority |
| systems | `LockingSystem.ts` | Emits ClearResolved |
| systems | `ScoringSystem.ts` | Observes ClearCommitted |
| types | `GameEvent.ts` | Command + fact event classes |
| data | `catalog/blocks.json` | One block type |
| tools | `system-loading-policy.json` | System ordering |
| tools | `validation-manifest.json` | Focus suite |

### Acceptance tests

```typescript
test('ClearResolved mutates board exactly once', () => {
  const bus = new EventBus();
  const mutations = [];
  bus.subscribe(ClearCommitted, (e) => mutations.push(e));
  bus.emit(new ClearResolved({ ... }));
  expect(mutations).toHaveLength(1);
});
```

### Human proof

1. Drop piece → line clears → score increments
2. Scene transition → no orphaned sprites (pool reset)

---

## Cross-stack: what "done" looks like

Regardless of stack, the first vertical slice is done when:

### Code
- [ ] One command type defined with explicit inputs/outputs/errors
- [ ] One handler with fail-closed validation
- [ ] One fact type emitted on success
- [ ] Presentation (or test observer) reacts to fact without re-deriving
- [ ] No engine imports in authority path

### Tests
- [ ] Happy path test
- [ ] Reject path test (illegal input → explicit error, no mutation)
- [ ] Boundary test (architecture import ban or equivalent)
- [ ] Remount/reset test (if presentation exists)

### Docs
- [ ] Contract IDs assigned to rules enforced by this slice
- [ ] Recipe template started for this feature type
- [ ] `implementation-state.md` updated: "Tranche 0 complete"

### Proof statement (required in PR)

```
Proof:
- Unit: <TestClass>.<TestMethod>
- Architecture: <boundary test>
- Human: <3-step checklist> (if player-visible)
```

---

## Expanding from slice to loop

After Tranche 0, expand in this order:

| Step | Add | Proof |
|---|---|---|
| 1 | Second command (reject path for new rule) | Unit test |
| 2 | Content load (JSON → catalog → sim reads ID) | Validator + fixture |
| 3 | Second effect type (registry + ownership) | `validate:effect-actions` |
| 4 | Run start → play → end | Snapshot with content hash |
| 5 | Presentation polish (not new authority) | PlayMode / human checklist |
| 6 | Save/load round-trip | Hash-gated replay test |

Do not add step 5 before step 1 is proven. Polish hides authority bugs.
