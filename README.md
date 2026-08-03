# Knights of Lex

A party-based fantasy word RPG where heroes trace words on hex boards to perform combat actions.

## Quick Start

```bash
pnpm install
pnpm build
pnpm dev        # http://localhost:5173
pnpm test:unit  # unit tests
pnpm e2e        # Playwright e2e (beats first boss)
```

## Architecture

- **Authority**: `packages/sim` — host-free combat, board, word evaluation
- **Presentation**: `apps/web` — Phaser 4 scenes and presenters
- **Composition root**: `apps/web/src/boot/BootOrchestrator.ts`

Player input → command → handler → committed facts → presentation observes.

## Stack

- TypeScript monorepo (pnpm workspaces)
- Phaser 4.2.1
- Vitest (unit)
- Playwright (e2e)

## License

Proprietary — Zencode Games
