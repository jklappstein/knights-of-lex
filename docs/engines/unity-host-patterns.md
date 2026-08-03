# Unity Host Patterns

Engine-specific guidance for Unity 6 as the product presentation host. Distilled from **Spawnwords** and **BattleBrats**.

For agnostic rules (sim purity, presentation bridge, command/fact), see [core-contracts.md](../architecture/core-contracts.md).

---

## Prime directive

> Core rules stay in pure C#. Unity MonoBehaviours are presentation/input bridges only. Runtime systems consume baked immutable content databases — not editable ScriptableObjects as authority.

---

## Assembly layers

### BattleBrats (all layers in Unity project)

```
BattleBrats.Core        (noEngineReferences: true)
  ↓
BattleBrats.Content     (noEngineReferences: true)  — bake, validate, interchange
  ↓
BattleBrats.Simulation  (noEngineReferences: true)  — combat, nav, placement
  ↓
BattleBrats.Run         (noEngineReferences: true)  — run loop, economy, shops
  ↓
BattleBrats.UI          — view models + RunController facade
  ↓
BattleBrats.Presentation — 3D/UGUI bridges only
```

### Spawnwords (managed DLL sync)

```
src/Spawnwords.Domain/
src/Spawnwords.Simulation/
src/Spawnwords.Application/
src/Spawnwords.Contracts.Presentation/
  ↓ eng/sync-unity-managed.ps1
client/Spawnwords.Unity/Assets/Plugins/Spawnwords.Managed/
  ↓
client/Spawnwords.Unity/Assets/Spawnwords/Runtime/  — presentation bridges
```

Domain/Simulation never reference `UnityEngine`. Unity consumes pre-built `netstandard2.1` DLLs with SHA256 manifest drift detection.

**Hard rejects:**
- `csc.rsp` hacks or manual DLL copies
- Unity-only forks of Domain code
- `using UnityEngine` in Domain/Simulation/Application

---

## Facade controller pattern

Presentation never touches raw services or mutable state.

```
Presentation input
  → RunController (facade)
    → RunService / Application commands
      → RunState / domain aggregates
```

**Rules:**
- `RunController` builds view models — never exposes `RunService` publicly
- UI binds to view models, sends commands through facade
- No `RunState` mutation from Presentation assemblies

Spawnwords equivalent: Application command façades + `BattlePresentationBridge` for battle playback.

---

## Scene architecture

### One persistent run scene (Spawnwords)

- Single Run scene per run
- `RunPresentationPhaseController`: Planning → LockTransition → Battle → PostBattle
- Phase transitions swap presenters — **not** scene loads
- Bootstrap → Run handoff via typed narrow interface

### Thin scene hosts (both games)

Scenes own:
- Lifecycle (Awake/Start/OnDestroy)
- Dependency injection / wiring
- View composition

Scenes do **not** own:
- Combat outcomes
- Economy calculations
- Placement validation
- Content loading logic (beyond triggering bake load)

---

## Battle authority loop (Spawnwords)

```
LockFormation → versioned lock artifact + layout snapshot
  → UnityRunContext.CommitBattleStart (atomic, fingerprint guards)
  → BattleAuthoritySession.TryStepNext (host-free sim, stepped by Unity)
  → SimulationBattleEventMapper → directives/facts
  → Presenters + HUD
```

Unity wall-clock drives catch-up stepping. Presentation consumes indexed `BattleEventEnvelope`s. **Never re-simulates combat authority.**

---

## Content in Unity

### BattleBrats: JSON-canonical bake

```
Content/Data/*.json
  → ContentPackLoader / ContentPackInterchange
  → ContentBakePipeline.BakeAndValidate()
  → RuntimeContentDatabase (immutable at runtime)
```

- Canonical source: JSON pack under `Content/Data/`
- One-time fixture export via Editor tools only
- Sim reads baked DB — not editable `.asset` files alongside JSON

### Spawnwords: offline compile + managed sync

- Gameplay capabilities compiled offline (`ContentCompiler`)
- `CompiledGameplayRecord` frozen at lock
- Visual content via VolumeFoundry releases → `ManifestationReleaseCatalog`
- Contract (recipe) ≠ Release (binaries)

### Forge promotion (BattleBrats)

Zencode Forge promotes to `Assets/Generated/Forge/`. Products build and run without Forge after promotion.

---

## Presentation decomposition

Split presenters by channel — one owner per visual concern:

| Presenter | Owns |
|---|---|
| BoardPresenter | Tile grid projection |
| UnitPresenter | Unit meshes/sprites |
| CombatPresenter | Combat VFX stepping |
| ThingwordEmitterPresenter | Spawn VFX |
| LockedLetterVisualStateStore | Letter tile visual state |

Each reads committed facts. None calculates combat outcomes.

---

## UGUI patterns (BattleBrats)

Common traps documented in `battlebrats-unity-ui.mdc`:

- Screen→canvas math must account for parent pivot + child anchor
- `Canvas.ForceUpdateCanvases()` before reading layout sizes
- Never combine `ContentSizeFitter` + `LayoutElement.flexibleWidth` on same node
- Tooltips: dedicated overlay canvas (`overrideSorting`, `raycastTarget = false`)

---

## Unity engineering scripts

### Editor-open-safe compile check

Do **not** run batchmode compile while `Temp/UnityLockfile` exists.

```powershell
# Editor open:
scripts/check-unity-compile.ps1   # parses Editor.log

# Editor closed:
scripts/compile-project.ps1       # batchmode
scripts/run-editmode-tests.ps1    # EditMode suite
```

### Managed DLL sync (Spawnwords)

```powershell
eng/sync-unity-managed.ps1        # build + copy + manifest
eng/sync-unity-managed.ps1 -CheckOnly  # drift gate
eng/nudge-unity-focus.ps1         # brief Unity focus for AssetDatabase flush
```

Run nudge after sync when working in Cursor so Unity notices DLL changes.

---

## Boundary tests

Enforce architecture in CI, not by convention:

**BattleBrats `ArchitectureBoundaryTests.cs`:**
- Scans pure layers for `UnityEngine` references
- Verifies `noEngineReferences` in asmdefs

**BattleBrats `PresentationBoundaryTests.cs`:**
- Forbids `new CombatSimulator()`, `new OfferGenerator()` from Presentation
- Forbids direct `PlacementService` calls

**Spawnwords `DependencyRuleTests.cs`:**
- NetArchTest assembly dependency bans

**Spawnwords `CapabilityBranchGuardTests.cs`:**
- Scans for forbidden concept-ID branches in kernel

---

## Unity version policy

- Pin exact editor version (Spawnwords: `6000.5.0f1`)
- No package upgrades without ADR
- URP for volumetric presentation (Spawnwords ADR-0020)

---

## Build order for new Unity games

Follow this tranche order. Each step must pass tests before the next.

### Tranche 0 — Pure C# spine (no visuals yet)

1. Create `Core/` with `SeedDerivation` (named RNG streams)
2. Create `Content/` with JSON fixture + `ContentBakePipeline` stub
3. Create `Simulation/` with one rule (e.g. placement validation)
4. Create `Tests/ArchitectureBoundaryTests` — scan for `UnityEngine` in pure layers
5. Prove: `dotnet test` or EditMode boundary test green

### Tranche 1 — Facade + one fact

1. Create `Run/` with `RunState` (mutable authority state)
2. Create `UI/RunController` facade (no public `RunService` exposure)
3. Wire: `RunController.Command()` → service → state mutation → fact
4. Prove: EditMode test for accept + reject

### Tranche 2 — Presentation bridge

1. Create `Presentation/BoardPresenter` (or equivalent)
2. Presenter subscribes to facts — never mutates `RunState`
3. Placeholder prefab on fact
4. Prove: PlayMode test + remount (exit/re-enter play mode)

### Tranche 3 — Content authoring loop

1. Add second definition in JSON → bake → sim reads new ID
2. No code change required for new content (only data)
3. Prove: content-only PR changes sim behaviour

### Managed DLL variant (Spawnwords)

Replace tranches 0-1 with:
1. `src/Domain/` + `src/Simulation/` outside Unity
2. `tests/Architecture.Tests/DependencyRuleTests`
3. `eng/sync-unity-managed.ps1` with SHA256 manifest
4. `BattleAuthoritySession.TryStepNext` as steppable loop
5. Unity bridge maps envelopes → presenters

---

## Anti-patterns (Unity-specific)

| Anti-pattern | Fix |
|---|---|
| Sim rules in MonoBehaviour | Move to pure C# assembly |
| ScriptableObject as runtime truth alongside JSON | Pick one canonical source |
| Scene reload for phase change | Phase controller + presenter swap |
| `BattleBrats.Presentation.Camera` namespace | Use `CameraRig` |
| Constructing sim in view for "preview" | Query immutable snapshot |
| Batchmode tests with editor open | Use log-parse compile check |
