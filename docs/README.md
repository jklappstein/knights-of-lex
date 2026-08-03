# Zencode Games — Shared Game DNA

Cross-product architecture, design, and workflow patterns distilled from **Spawnwords**, **BattleBrats**, **Scrapfall**, and **Beastwright**.

**Goal:** Spawn new games faster with proven patterns — good code, good design, minimal churn. Product repos keep their own ADRs and contracts; this folder is the reusable operating system underneath them.

---

## Start here

| I want to… | Go to |
|---|---|
| **Spin up a new game** | [bootstrap/new-game-starter.md](bootstrap/new-game-starter.md) |
| **Pick Unity vs Phaser vs monorepo** | [bootstrap/stack-decision-guide.md](bootstrap/stack-decision-guide.md) |
| **Copy a repo folder layout** | [bootstrap/repo-scaffolds.md](bootstrap/repo-scaffolds.md) |
| **Ship the week-1 playable loop** | [bootstrap/first-vertical-slice.md](bootstrap/first-vertical-slice.md) |
| **One-page cheat sheet** | [quick-reference.md](quick-reference.md) |
| Understand core architecture | [architecture/core-contracts.md](architecture/core-contracts.md) |
| Add a gameplay effect | [playbooks/new-effect-action.md](playbooks/new-effect-action.md) |
| Add a content type | [playbooks/new-content-type.md](playbooks/new-content-type.md) |
| Add a domain command | [playbooks/new-domain-command.md](playbooks/new-domain-command.md) |
| Add UI/VFX/audio | [playbooks/new-presentation-feature.md](playbooks/new-presentation-feature.md) |
| Work in Unity | [engines/unity-host-patterns.md](engines/unity-host-patterns.md) |
| Work in Phaser 4 | [engines/phaser-4-host-patterns.md](engines/phaser-4-host-patterns.md) |
| Configure agents / CI | [workflows/](workflows/) |
| Trace a pattern to source repos | [sources.md](sources.md) |

---

## North-star sentence

> Preview, lock validation, battle replay, telemetry, and economy settlement all consume the **same committed domain evaluation**.

Presentation displays and forwards intents. It never authors outcomes.

---

## Documentation precedence

When docs disagree:

1. **Runtime code + generated registries** — executable truth
2. **Validators / CI gates** — enforced contracts
3. **Product contracts + ADRs** — intended behaviour
4. **This folder** — cross-game patterns (guidance, not override)
5. **Guides, templates, handoff packs** — how-to
6. **Design bibles / flavor docs** — lowest authority for implementation

---

## Folder layout

```
zencode games/
├── README.md                              ← you are here
├── quick-reference.md                     ← one-page cheat sheet
├── sources.md                             ← provenance map to each repo
│
├── bootstrap/                             ← NEW GAME START HERE
│   ├── new-game-starter.md                day 0 → week 1 → bootstrapped
│   ├── stack-decision-guide.md            Unity vs Phaser vs monorepo
│   ├── repo-scaffolds.md                  copy-ready folder trees (4 stacks)
│   └── first-vertical-slice.md            minimum provable loop per stack
│
├── architecture/                          ← engine-agnostic rules
│   ├── core-contracts.md
│   ├── command-fact-events.md
│   ├── content-pipeline.md
│   ├── determinism-and-rng.md
│   ├── presentation-ownership.md
│   └── governance-and-proof.md
│
├── engines/
│   ├── unity-host-patterns.md
│   └── phaser-4-host-patterns.md
│
├── playbooks/                             ← feature implementation checklists
│   ├── new-effect-action.md
│   ├── new-content-type.md
│   ├── new-domain-command.md
│   └── new-presentation-feature.md
│
├── templates/                             ← copy into new game repos
│   ├── adr-template.md
│   └── contract-starter.md
│
└── workflows/
    ├── agent-discipline.md
    └── ci-validation-patterns.md
```

---

## The 10 patterns every new game inherits

These survived across all four titles. Details in [quick-reference.md](quick-reference.md).

1. Sim/domain is host-free
2. Presentation is bridge only
3. Command → one handler → facts → observers
4. One execution owner per effect type
5. Kernel doesn't branch on content IDs
6. JSON/catalog is authoritative
7. Split gameplay vs visual content hashes
8. Three RNG categories (committed / seeded / VFX)
9. Done = named proof
10. Contract change = ADR + enforcement in same PR

---

## Recommended path for a new game

```
Day 0:  stack-decision-guide → ADR-0001 → repo-scaffolds (pick layout)
Day 1:  contract-starter → cursor rules → AGENTS.md → boundary test
Day 2:  content validator → CI focus suite
Day 3-5: first-vertical-slice (command → fact → test → presentation)
Week 2: playbooks for top 3 feature types your game needs
Week 3+: tranche build order (see new-game-starter.md Phase 5)
```

---

## What belongs here vs in product repos

| Here (agnostic) | Product repo (specific) |
|---|---|
| "Presentation never authors outcomes" | Spawnwords `INVIOLABLE_CONTRACTS.md` A2 |
| "One execution owner per effect type" | Scrapfall doodad effect registry |
| "Bake JSON → immutable runtime DB" | BattleBrats `ContentBakePipeline` |
| Repo scaffold folder tree | Actual `Assets/` or `packages/` files |
| Week-1 vertical slice definition | Game-specific lock/combat/place mechanic |

Do not duplicate full product contracts here. Link via [sources.md](sources.md).

---

## Contributing

When a pattern proves itself in **two or more** games, add or update a doc here. Prefer tightening existing sections over adding new files. Keep engine-specific detail in `engines/`.
