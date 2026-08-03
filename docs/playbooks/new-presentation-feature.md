# Playbook: New Presentation Feature

Use when adding player-visible UI, VFX, audio, or animation that reacts to committed gameplay facts.

**Prime rule:** Presentation observes facts. It never authors outcomes.

---

## Checklist

### 1. Identify the fact source

- [ ] Which committed fact(s) does this feature observe?
- [ ] Is the fact already emitted by the authority handler, or do you need a new command first?
- [ ] If you need new gameplay behaviour → use [new-domain-command.md](new-domain-command.md) first, then return here

### 2. Semantic state vs visual styling

- [ ] Gameplay/sim stores **semantic markers** only (HP, status, flags)
- [ ] Presentation reads markers and applies visuals (tint, scale, particles, sound)
- [ ] No gameplay calculations in presenter (damage numbers come from committed facts, not re-rolled)

### 3. Create presenter / visual system

**Unity:**
- [ ] New presenter class in `Presentation/` or `Runtime/`
- [ ] Subscribes to fact stream or polls view-model
- [ ] One presenter per visual channel (don't combine HP + class cues + emitter in one god class)

**Phaser:**
- [ ] New system in `js/systems/visuals/` or `js/systems/presentation/`
- [ ] Extends `BaseSystem` with proper lifecycle
- [ ] Uses `own()` / `ownPool()` for Phaser objects

### 4. Lifecycle ownership

- [ ] Declare destroy-owner for every GO/sprite/tween/timer created
- [ ] Register cleanup in phase-exit or scene-destroy sequence
- [ ] Stale callback guard: check owner liveness before deferred work
- [ ] Remount test: phase transition → no leaked objects

### 5. View-model projection (if UI)

- [ ] Pure projection function: `aggregate + state → ViewModel`
- [ ] View-model is read-only for presentation
- [ ] UI sends commands through facade — never mutates view-model directly

### 6. Accessibility & modes

- [ ] Reduced motion: respect system flag, provide static alternative
- [ ] Colour-blind: don't rely on colour alone for semantic state
- [ ] Non-colour cues for important states (icons, patterns, text)

### 7. Tests

- [ ] EditMode/PlayMode: fact → presenter produces expected visual state
- [ ] Remount: destroy phase → no orphaned objects
- [ ] (Optional) Capture test for visual regression

---

## Unity presenter pattern

```csharp
public sealed class DamageNumberPresenter : MonoBehaviour
{
    // Reads committed fact — never calculates damage
    public void OnDamageApplied(DamageAppliedFact fact)
    {
        SpawnFloatingText(fact.AppliedAmount, fact.TargetPosition);
    }
}
```

## Phaser presentation system pattern

```typescript
@Executor({ dependencies: ['scene'] })
export class DamageVfxSystem extends BaseSystem {
    onBlockHpLost(event: BlockHpLost) {
        const sprite = this.own(this.scene.add.text(...));
        // tween, fade, destroy — all owned by this system
    }
    
    onSystemStateReset() {
        // state maps only — pool cleanup handled by BaseSystem
    }
}
```

---

## Channel ownership table (example)

When multiple presenters exist, assign channels explicitly:

| Channel | Owner | Observes |
|---|---|---|
| Tile HP appearance | PhysicalTilePresenter | `HpChanged` fact |
| Class/active cues | WordProgramPresenter | `ProgramStateChanged` fact |
| Emitter pulse | EmitterPresenter | `ThingEmitted` fact |
| Damage numbers | DamageNumberPresenter | `DamageApplied` fact (nominal + rolled + applied) |
| Board layout | BoardLayoutPresenter | `LayoutSnapshot` (immutable) |

**Rule:** Destroying one channel must not erase state owned by another channel.

---

## Human proof template

```
Human proof:
1. Trigger [action] → observe [visual result]
2. Trigger [edge case] → observe [correct fallback/no-op]
3. Transition [phase/scene] → re-enter → no visual leaks or stale state
4. (a11y) Enable reduced motion → [static alternative appears]
```

---

## Anti-patterns

| Don't | Why |
|---|---|
| Calculate damage in presenter | Presentation authoring outcomes |
| Read `transform.position` as board truth | Display-as-truth desync |
| Store factory state in system fields | Cross-run contamination |
| Create tween without `own()` | Leaked on scene exit |
| Re-sim battle for visual sync | Dual authority |
