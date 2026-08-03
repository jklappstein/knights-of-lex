# Knights of Lex — Agent Guide

Browser-first, mobile-shaped 2D word RPG. Phaser 4 presentation host with headless TypeScript authority.

## Non-negotiables

- Phaser scenes are presentation hosts, never gameplay authority
- `packages/sim` has no Phaser, DOM, wall-clock, HTTP, or platform imports
- Preview and commit use the same evaluator
- Content JSON is authoritative; unknown keys/actions fail
- No hero/item/enemy ID branches in the kernel
- Gameplay randomness uses named streams only (`StrictRng`)
- Every mutation is command → one handler → committed facts
- No `any` usage in product packages
- No scene reach-through — typed ports injected at `BootOrchestrator`
- Done requires named proof, not compile success

## Read first

1. `docs/knights-of-lex-guide/Knights_of_Lex_Implementation_Guide.md`
2. `docs/architecture/core-contracts.md`
3. `docs/engines/phaser-4-host-patterns.md`
4. `docs/bootstrap/first-vertical-slice.md`

## Commands

| Command | Purpose |
|---|---|
| `pnpm install` | Install dependencies |
| `pnpm build` | Build all packages |
| `pnpm test:unit` | Run unit tests |
| `pnpm validate:focus` | Fast architecture validators |
| `pnpm dev` | Start Phaser dev server |
| `pnpm e2e` | Run Playwright e2e tests |

## Package layout

```
packages/shared-types   — branded IDs, commands, facts
packages/content-schema — Zod schemas
packages/content-runtime — frozen catalogues + hashes
packages/lexicon-runtime — trie, word validation
packages/sim            — board, combat, word evaluator (host-free)
packages/test-support   — deterministic test helpers
apps/web                — Phaser 4 client
```

## Proof

```
Proof:
- Unit: GameService.test.ts
- Architecture: validate:no-phaser-in-authority
- E2E: beat-first-boss.spec.ts
- Human: trace word → preview → commit → fact playback
```
