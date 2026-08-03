# ADR Template

Copy to `docs/adr/ADR-NNNN-short-title.md` in your game repo.

```markdown
# ADR-NNNN: [Title]

**Status:** Proposed | Accepted | Superseded by ADR-XXXX  
**Date:** YYYY-MM-DD  
**Deciders:** [names or roles]

## Context

What is the issue or decision point? What forces are at play?
Include sister-title scars if this decision prevents re-learning a lesson.

## Decision

What is the change being proposed or accepted?

Be specific. "Use Unity" is not enough — "Unity 6 (6000.x) as product
presentation host; Domain/Simulation remain host-free via managed DLL sync."

## Consequences

### Positive
- ...

### Negative
- ...

### Enforcement
- Contract IDs: [A1, M6, ...]
- Tests/validators: [DependencyRuleTests, validate:gameplay-rng, ...]
- Migration: [impact on saves, content hashes, replays]

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| ... | ... |

## References
- [Zencode Games: relevant pattern](../../zencode games/architecture/...)
- Sister title: [what we learned from Scrapfall/BattleBrats/...]
```

---

## ADR numbering guide

| Range | Purpose |
|---|---|
| ADR-0001 | Baseline architecture (always first) |
| ADR-0002–0009 | Core product locks (engine, content model, multiplayer) |
| ADR-0010–0019 | Major subsystem decisions |
| ADR-0020+ | Feature-specific or refinement |

**ADR-0001 should always cover:**
- Engine host choice
- Sim location (in-repo vs DLL vs packages)
- Content authority model
- Presentation bridge pattern
- Proof strategy (what "done" means)

---

## When to write an ADR

| Write | Don't write |
|---|---|
| Engine host selection | Bug fix restoring intended behaviour |
| Breaking schema change | Internal refactor, same behaviour |
| New architectural layer | Renaming a variable |
| Deprecating a retired system | Adding a test for existing rule |
| Changing contract ID semantics | Bumping a content hash because data changed |

---

## Supersession

When an ADR is replaced:

```markdown
**Status:** Superseded by [ADR-0020](ADR-0020-new-approach.md)
```

Keep the old ADR. Mark it superseded. Do not delete — agents and humans need the history.

Example: Spawnwords ADR-0015 (Phaser host) superseded by ADR-0020 (Unity host), with lessons retained in `PHASER_PRESENTATION_LESSONS.md`.
