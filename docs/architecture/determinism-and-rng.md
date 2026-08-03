# Determinism and RNG

How Zencode games keep replays trustworthy while still feeling random to players.

---

## Three RNG categories

Every game that ships competitive or replayable modes eventually splits randomness into distinct categories. Mixing them causes "works in test, wrong in prod" bugs.

| Category | Purpose | Entropy source | Persist? | Examples |
|---|---|---|---|---|
| **A — Committed rolls** | Shop, rewards, loot tables | OS entropy at boundary | Yes — result stored before UI reveals | Shop offers, card draws, gacha |
| **B — Seeded sim** | Combat, replays, goldens | Named streams from seed + inputs + content hash | Derived — reproducible from inputs | Combat damage variance, AI, proc rolls |
| **C — Presentation** | VFX jitter, particle spread, cosmetic | `Math.random()` / non-seeded | No — never affects outcomes | Spark angles, screen shake, color variation |

**Hard rule:** Category C never feeds back into A or B. Presentation randomness does not steal gameplay rolls.

---

## Category A — Commit before show

Player sees a shop offer **after** the roll is committed to state.

```
Roll → store on SourceInstance / run state → UI reveals
```

Not:

```
UI animates → roll during animation → maybe store
```

BattleBrats documents this explicitly in its implementation spec. Spawnwords encodes it as R5/R6 in inviolable contracts.

---

## Category B — Seeded reproducibility

Combat, tests, and replays must reproduce from:

```
seed + player inputs + contentHash + rulesetVersion
```

### Named streams

Derive sub-streams from a root seed with domain tags — never share one `Random` instance across unrelated systems.

BattleBrats `SeedDerivation.cs` pattern:

```
DomainBeat, DomainCombat, DomainShop, ...
```

Each domain gets an isolated stream. Order of consumption within a stream must be stable.

### Deterministic primitives

| Primitive | Use |
|---|---|
| Integer ticks (`SimTick`) | Sim time — not `Time.deltaTime` |
| Fixed-point coords (`SimCoord`, 1000 units = 1 tile) | Positions — not `transform.position` |
| Integer math | Scoring, damage — not floats where avoidable |

**Hard rejects in authority path:**
- `UnityEngine.Random`
- `Math.random()` (TypeScript sim)
- `Date.now()` / wall-clock as sim input
- Unity physics for rule truth

---

## Category C — Presentation only

VFX, cosmetic variation, and UI flair may use non-seeded random.

**Guard:** If a presentation roll could ever affect a visible number the player acts on (damage text, loot reveal), it must be Category A or B — committed before display.

---

## Replay and golden tests

### Sim goldens

Headless sim runs produce deterministic digests. When outcomes change intentionally:

1. Update goldens with named script (`test:sim:update-goldens`, `update-sim-goldens.mjs`)
2. Document why in PR
3. Gate on gameplay content hash only

### Playback ≠ re-sim

Presentation advances a cursor over committed event logs. It does not re-run combat or economy authority.

```
Committed facts → presentation playback cursor → visuals
```

Not:

```
Presentation frame → re-simulate battle → maybe match committed facts
```

Spawnwords `BattleAuthoritySession.TryStepNext` embodies this: host drives stepping; presentation catches up.

### BattleBrats presentation combat

Presentation steps `CombatSession` for visuals. Final result must match `Simulate()`. Visual body count may differ from logical unit count (capped VFX ok) — outcomes must not.

---

## CI enforcement

| Validator | Catches |
|---|---|
| `validate:gameplay-rng` | `Math.random` in sim packages |
| Architecture boundary tests | `UnityEngine` in pure C# layers |
| `lint-typing-ratchet` | `any` regression hiding non-deterministic paths |
| Golden digest diff | Unintended outcome changes |

---

## Async / server authority

For official multiplayer (Beastwright):

- Server commits `CommittedMatchResult` — client never authors official facts
- `submittedAtMs` is queue metadata — **never** a sim input
- Watch/skip is presentation over committed replay
- Sandbox modes (`morpling`, `exhibition`) must not pollute official stat tables

---

## Quick decision tree

```
Does this randomness affect gameplay outcomes, saves, or ranked stats?
├── Yes → Is it revealed to the player before commit?
│   ├── Yes → BUG: commit first (Category A)
│   └── No → Category B: named stream, seed-derived, tested
└── No → Category C: presentation only, any entropy source
```
