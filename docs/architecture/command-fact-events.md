# Command vs Fact Events

The single most portable pattern across Scrapfall, Beastwright, Spawnwords, and BattleBrats. Separating **commands** (mutations) from **facts** (observations) prevents double-fire, desync, and invisible coupling.

---

## The model

```
Command  →  one authoritative handler  →  state transition  →  committed fact(s)  →  many observers
```

| Kind | Writers | Consumers | Examples |
|---|---|---|---|
| **Command** | Exactly one | Exactly one handler | `ClearResolved`, `DamageBlockRequested`, `LockFormation`, `SubmitBeastRequest` |
| **Fact** | The command handler | Zero or many observers | `ClearCommitted`, `BlockHpLost`, `BattleEventEnvelope`, `CommittedMatchResult` |

**Observers may react to facts. They may not synthesize additional gameplay facts or mutate authoritative state.**

---

## Why this matters

Without the split:

- Two systems both apply the same reward → double MUNI/SKOR/coins with no compile error
- Synchronous re-emits during event handling → ordering bugs and infinite loops
- UI invents outcomes that never went through the authority path
- Tests pass on one path but production uses another

Scrapfall explicitly documents this as **Rule 3** in its architecture contract. Beastwright calls it **Rule 3 — Command vs fact**. Spawnwords encodes it as **A4** in inviolable contracts.

---

## Rules

### 1. One writer per command

If two systems can both mutate the same state, you have a bug — even if they "usually" don't conflict.

**Canonical owners:**
- Board mutations → `BoardMutationSystem` (Scrapfall)
- Combat navigation → `NavigationTraversalAuthority` (BattleBrats)
- Capability execution → `CapabilityExecutor` (Spawnwords)
- Official match commit → server tournament package (Beastwright)

### 2. Facts are append-only observations

Facts describe what happened. Observers read them for VFX, audio, telemetry, stats, and UI updates.

**Observers must not:**
- Emit new gameplay facts as side effects of handling a fact
- Mutate authoritative state outside their owned aggregate
- Re-run the command handler's logic "just to be sure"

### 3. No synchronous re-emits

Queue cross-phase events instead of emitting new events inside a handler's synchronous stack.

```
// Bad: handler for ClearResolved emits ClearCommitted inline during same tick
// Good: ClearResolved handler mutates board, queues ClearCommitted for next phase
```

### 4. UI sends commands, never facts

Presentation forwards player intents as commands. It does not construct `CommittedMatchResult`, shop outcomes, or battle envelopes.

---

## Flow examples

### Scrapfall line clear

```
ClearResolved        (command) → BoardMutationSystem (sole consumer)
  ↓
ClearCommitted       (fact)    → ScoringSystem, ObjectiveProcessor, doodad systems, VFX
```

### Spawnwords battle

```
Player intent        (command) → Application / BattleAuthoritySession
  ↓
BattleEventEnvelope  (fact)    → Presenters, HUD, audio, telemetry
```

Presentation advances a **playback cursor** over committed envelopes. It does not re-simulate combat authority.

### Beastwright tournament

```
SubmitBeastRequest   (command) → server tournament package
  ↓
CommittedMatchResult (fact)    → stats rollup, client replay, achievements
```

Client watch/skip is presentation over an already-committed result.

### BattleBrats combat hooks

Effect hooks (`CombatCompile`, `FightStart`, `Tick`, `UnitSpawned`) are dispatched through a single `CombatHookDispatcher`. Handlers register in the effect registry — same "one owner" discipline.

---

## Effect / action ownership

Extends command/fact to data-driven effects:

**One execution owner per `effect.type` or action kind.**

Registration is bidirectional and CI-checked:

```
catalog definition ↔ IMPLEMENTED_ACTIONS ↔ OWNERSHIP_MAP ↔ handler class ↔ tests
```

Unknown actions:
- Fail catalog validation at load time
- Throw at runtime with diagnostic — never `default: break` silently

**New handler checklist (all games):**
1. Handler class
2. Register in dispatcher / executor
3. Add to ownership registry
4. Add validator entry
5. Add tests in same PR

---

## Anti-patterns

| Anti-pattern | Why it fails |
|---|---|
| Button click directly increments wallet | Bypasses single-writer economy |
| VFX system applies damage | Presentation authoring outcomes |
| Two systems subscribe to same command event | Race / double mutation |
| Observer emits reward fact | Facts invented outside authority |
| `switch(effectType)` in kernel without registry | Untracked execution paths |
| Client commits official match result | Server authority violated |

---

## Implementation surfaces

| Game | Command transport | Fact transport |
|---|---|---|
| Scrapfall | Typed `GameEvent` class bus | Same bus, fact event types |
| Beastwright | HTTP/API + sim entry points | `SimEvent`, `CommittedMatchResult`, `MatchStatSummary` |
| Spawnwords | Application commands | `BattleEventEnvelope`, domain facts |
| BattleBrats | `RunController` methods | `CombatSession` events, committed rolls on `SourceInstance` |

The transport differs. The ownership model does not.
