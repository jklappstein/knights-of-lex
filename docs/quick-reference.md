# Quick Reference

One-page cheat sheet. Pin this. Details in linked docs.

---

## North star

> Preview, lock, replay, telemetry, and settlement consume the **same committed domain evaluation**.

Presentation displays and forwards intents. Never authors outcomes.

---

## The 10 rules that survive every game

| # | Rule | Violation symptom |
|---|---|---|
| 1 | **Sim is host-free** | Goldens break; can't test headlessly |
| 2 | **Presentation is bridge only** | UI shows different results than server/test |
| 3 | **Command → one handler → facts → observers** | Double rewards, race conditions |
| 4 | **One owner per effect type** | Silent no-ops or double-fire |
| 5 | **Kernel doesn't branch on content IDs** | Combinatorial `if (item == X)` hell |
| 6 | **JSON is authoritative** | "Which file won?" bugs |
| 7 | **Split gameplay vs visual hashes** | Art change breaks replays |
| 8 | **Three RNG categories** | Replay drift; stolen rolls |
| 9 | **Done = named proof** | "Compiles" but broken in play |
| 10 | **Contract change = ADR + enforcement** | Rules erode silently |

---

## Command vs fact (30 seconds)

```
COMMAND (one writer)  →  handler mutates state  →  FACT (many readers)
ClearResolved         →  BoardMutationSystem   →  ClearCommitted
LockFormation         →  BattleFormationLocker →  LockedBattleSnapshot
SubmitBeast           →  tournament package    →  CommittedMatchResult
```

---

## RNG categories (30 seconds)

| Cat | Use | Source | Persist? |
|---|---|---|---|
| **A** | Shop/reward rolls | OS entropy at boundary | Yes, before reveal |
| **B** | Combat/replay/test | Named seed streams | Derived from inputs |
| **C** | VFX/cosmetic jitter | Any | Never affects A or B |

---

## Layer direction

```
C#/Unity:  Core → Content → Simulation → Run → UI → Presentation
TS/mono:   shared-types → content-runtime → sim → tournament → client
TS/single: data/catalog → BootOrchestrator → ECS systems → visuals/
```

**Never:** Presentation → Simulation (backwards dependency)

---

## New game week 1

1. ADR-0001 (stack decisions)
2. Contract doc (M/A/C minimum)
3. Boundary test (host-free)
4. Content validator
5. First vertical slice (command → fact → test)
6. AGENTS.md + 3 cursor rules

→ [bootstrap/new-game-starter.md](bootstrap/new-game-starter.md)

---

## Feature playbooks

| Adding… | Playbook |
|---|---|
| Effect/action | [playbooks/new-effect-action.md](playbooks/new-effect-action.md) |
| Content type | [playbooks/new-content-type.md](playbooks/new-content-type.md) |
| Domain command | [playbooks/new-domain-command.md](playbooks/new-domain-command.md) |
| UI/VFX/audio | [playbooks/new-presentation-feature.md](playbooks/new-presentation-feature.md) |

---

## New effect checklist (short)

1. Handler in executor (sim layer)
2. Register in dispatcher
3. Add to ownership map
4. CI validator passes
5. Test accept + reject
6. Use in JSON only after above

---

## Tranche build order

```
0: Authority spine (command → fact → test)
1: Content load (JSON → validator → catalog)
2: Presentation bridge (display fact, forward command)
3: Content authoring loop (add JSON, no code change)
4: Effect pipeline (registry + ownership CI)
5: Run loop (start → play → end → persist)
6: Economy (single-writer wallet)
7: Art boundary (contract → release → fallback)
```

---

## Hard rejects (never do these)

- Sim rules in MonoBehaviour / Phaser scene
- `UnityEngine.Random` / `Math.random()` in authority
- Economy/combat math in UI
- Content IDs as language enums
- Dual canonical sources (JSON + ScriptableObject)
- `default: break` on unknown effects
- `scene as any` reach-through
- God scene / god MonoBehaviour
- Compile = done
- Read `archive/**` for current architecture

---

## Proof statement format

```
Proof:
- Unit: Namespace.TestClass.TestMethod
- Architecture: BoundaryTestName
- Validator: npm run validate:focus / dotnet test --filter ...
- Human: 1) action 2) expect 3) remount check
```

---

## Stack picker (10 seconds)

| Game shape | Stack |
|---|---|
| 3D toys/tactics | Unity in-repo asmdefs |
| Large C# domain + Unity | Managed DLL split |
| 2D roguelike 50+ systems | Phaser ECS |
| Async competitive | TS monorepo + server |

→ [bootstrap/stack-decision-guide.md](bootstrap/stack-decision-guide.md)

---

## Doc precedence

```
Code + generated registries > Validators > Contracts + ADRs > This pack > Guides > Design bible
```

---

## Sister-title scars

| Learned from | Rule it became |
|---|---|
| Crackwords | No god scenes (A13), no reach-through (A7) |
| Scrapfall | Lifecycle ownership (P3/P8), command/fact (A4) |
| BattleBrats | Bake pipeline (C18), facade (A3), split hashes (C16) |
| Beastwright | Async authority, stats-as-facts, match mode gating |

---

## Key paths in this pack

| Need | Doc |
|---|---|
| Spawn new game | [bootstrap/new-game-starter.md](bootstrap/new-game-starter.md) |
| Pick stack | [bootstrap/stack-decision-guide.md](bootstrap/stack-decision-guide.md) |
| Folder layout | [bootstrap/repo-scaffolds.md](bootstrap/repo-scaffolds.md) |
| Week 1 slice | [bootstrap/first-vertical-slice.md](bootstrap/first-vertical-slice.md) |
| Architecture deep | [architecture/core-contracts.md](architecture/core-contracts.md) |
| Unity | [engines/unity-host-patterns.md](engines/unity-host-patterns.md) |
| Phaser 4 | [engines/phaser-4-host-patterns.md](engines/phaser-4-host-patterns.md) |
| Agents | [workflows/agent-discipline.md](workflows/agent-discipline.md) |
| CI | [workflows/ci-validation-patterns.md](workflows/ci-validation-patterns.md) |
| Source repos | [sources.md](sources.md) |
