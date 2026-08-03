# Implementation State

**Last updated:** 2026-08-02

## Completed Tranches

### Tranche 0 — Authority spine
- Branded IDs, hex coordinates, board state, path validation
- Lexicon fixture with trie word lookup
- Pure `EvaluateWord` service
- `SubmitWord` command and handler
- Deterministic refill via named RNG streams
- Host-boundary validator

### Tranche 1 — Content authority
- Zod schemas for heroes, enemies, encounters, acts, recipes
- Frozen content catalogues with gameplay content hash
- Five foundational symbols, pure actions, ten pair recipes
- Vanguard/Ranger/Cleric triads and all 10 founding heroes
- Generic effect executor

### Tranche 2 — Phaser battle bridge
- `BootOrchestrator` composition root
- `RunScene` shell with dedicated presenters
- Touch trace input on hex board
- Live domain preview via word trace
- Fact playback for damage, shield, healing, turn change
- Remount/reset discipline

### Tranche 3 — Initiative and enemy combat
- Front/back formation
- Deterministic initiative queue
- Enemy intents and automatic turns
- Downing and victory/defeat
- Save-ready state snapshots

### Tranche 5 — Three-hero party slice
- All 10 founding heroes with symbol kits
- Three persistent hero boards
- Pre-combat formation and recruitment
- Hero-specific triads and level-1 abilities
- Skill tree allocation

### Tranche 7 — One-act run loop (partial)
- Start-hero choice and randomized party setup
- Three regular fights and Zed King boss
- Intermission between fights
- Full heal between fights
- Act completion

## Proof

```
Proof:
- Unit: GameService.test.ts, AutoBattle.test.ts
- Architecture: validate:no-phaser-in-authority, validate:gameplay-rng, validate:no-any
- E2E: beat-first-boss.spec.ts (2 tests passing)
- Human: trace word → submit → fact playback → boss defeat
```

## Next

- Tranche 6: Special board objects (potions, scrolls, chests)
- Tranche 8: Skills and equipment depth
- Capacitor mobile shell
- Content authoring tooling
