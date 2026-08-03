# Governance and Proof

How Zencode games prevent architecture erosion through contracts, ADRs, and named proof gates.

---

## Contract-first governance

**Rule:** Changing intended behaviour requires updating the contract, enforcement, and migration in the **same change**. No silent exceptions.

Spawnwords formalizes this as **M6**. Scrapfall uses tier-2 validators. Beastwright uses architecture contract + CI. BattleBrats uses Proof Foundation Contract.

### What counts as a contract change

- New gameplay rule or invariant
- Changed event ownership
- New content type or schema field
- Engine host decision
- RNG category boundary shift
- Presentation authority boundary shift

### Required artifacts for contract changes

1. **ADR or decision record** — why, alternatives rejected, consequences
2. **Contract doc update** — the rule in plain language with ID
3. **Enforcement update** — test, validator, asmdef, or lint rule
4. **Migration note** — impact on saves, replays, content hashes
5. **Template/recipe update** — if agents use a workflow doc

---

## ADR conventions

All games use Architecture Decision Records with similar shape:

```markdown
# ADR-NNNN: Title
Status: Proposed | Accepted | Superseded by ADR-XXXX
Date: YYYY-MM-DD

## Context
## Decision
## Consequences
```

**Rules:**
- Newest Accepted ADR wins over older docs for the same topic
- Superseded ADRs stay for history — mark clearly, don't delete
- ADRs are for **decisions**, not tutorials (those go in templates/guides)
- Template: see any product's `docs/adr/TEMPLATE.md`

### When to write an ADR

| Write ADR | Don't write ADR |
|---|---|
| Engine host choice (Unity vs Phaser) | Bug fix restoring intended behaviour |
| Breaking schema change | Refactor with no behaviour change |
| New architectural layer | Renaming a variable |
| Deprecating a retired system | Adding a test for existing rule |

---

## Done = named proof

**Compile-only is not done.**

| Change type | Minimum proof |
|---|---|
| Domain/sim rule | Unit test or golden digest |
| Content schema | Validator + fixture |
| Effect handler | Handler + registry + ownership + test |
| Player-visible UX | EditMode/PlayMode test, capture, or human checklist |
| Architecture boundary | Boundary scan test |

Agents must name the proof in their completion summary:

```
Proof: Spawnwords.Architecture.Tests/CapabilityBranchGuardTests
Proof: npm run validate:focus
Proof: Human — start run, lock formation, verify battle plays without scene reload
```

---

## Vertical slice discipline

**Smallest complete change in one PR:**

```
data/schema → validator → owner/handler → test → presentation (if visible)
```

**Hard reject:** Half-wired effect that silently no-ops or double-fires because registry/validator/tests landed in a follow-up PR.

BattleBrats workflow rule: one vertical slice per task. Scrapfall: copy template first, then implement. Beastwright: recipe checklist per feature type.

---

## Documentation tiers

Do not auto-generate one markdown file per system class. Use:

| Tier | Content | When to write |
|---|---|---|
| **Contract** | Enforceable rules | Always for cross-cutting concerns |
| **Pattern** | How multiple features work the same way | When 2+ features share a shape |
| **Recipe/Template** | Step-by-step for one feature type | When agents repeatedly invent workflows |
| **Risk-based spec** | Deep dive on fragile/complex feature | When failure cost is high |
| **Per-class doc** | Almost never | Only for public API surfaces |

Scrapfall `DOCUMENTATION-TIERS.md` is the reference implementation of this model.

---

## Agent onboarding bounds

Bounded read paths prevent token burn and wrong-era design:

**Spawnwords:** ≤20 doc LLM handoff pack  
**Scrapfall:** 8-doc handoff sequence  
**Beastwright:** fast lookup table in `docs/README.md`  
**BattleBrats:** Design Bible section + closest feature + tests

**Universal rule:** Read contracts before implementing. Copy existing patterns before inventing APIs.

---

## Enforcement registry

Spawnwords maps every contract ID to proof status:

```
declared → partial → gated → enforced
```

Other games achieve the same via:
- `ArchitectureBoundaryTests.cs` (BattleBrats)
- `validation-manifest.json` suites (Scrapfall)
- `validate:*` npm scripts (Beastwright)

**Goal:** Every contract either has executable proof or is explicitly marked `declared` with a tracked gap.

---

## Proof Foundation forbidden list

From BattleBrats Proof Foundation Contract — applies across games:

1. Hardcoded sim behavior that should be data-driven
2. Post-bake mutation of runtime catalogs
3. Presentation calculating rules
4. Bypassing bake/validation pipeline
5. Engine RNG/time in pure layers
6. ScriptableObject or scene object as runtime truth (when JSON-canonical is the decision)
7. Unvalidated test fixtures that don't match production load path

---

## Feature bundle checklist

Ship a feature as a bundle, not scattered commits:

- [ ] Content definition + schema
- [ ] Validator / ownership registration
- [ ] Sim handler / executor
- [ ] Tests (unit + integration where needed)
- [ ] Presentation (if player-visible)
- [ ] Locale keys (if text)
- [ ] Art/audio keys (placeholders OK)
- [ ] Proof named in PR description

Beastwright `feature-bundle-checklist.md` is the fullest version of this pattern.

---

## Archive discipline

`archive/**` is historical recovery only — not product authority.

Agents must not read or extend archive unless explicitly recovering history. Current architecture lives in active `docs/`, ADRs, and contracts.

---

## Implementation state tracking

Every game repo should maintain `docs/implementation-state.md` (or equivalent). Update after every tranche.

```markdown
## Tranche status
| Tranche | Status | Proof |
|---|---|---|
| 0 — Authority spine | ✅ | PlacementServiceTests |
| 1 — Content load | ✅ | validate:content |
| 2 — Presentation bridge | 🔄 | PlayMode pending |
| 3 — Authoring loop | ⬜ | — |

## Shipped features
- [x] Place toy command
- [ ] Combat tick
- [ ] Shop roll

## Known gaps
- C16 split hashes: declared, not enforced
```

Agents read this before implementing to avoid rebuilding shipped systems or conflicting with in-progress work.

---

## Changing this folder

This folder is **guidance**, not law. Product contracts override it.

Update here when:
- A pattern appears in 2+ games with the same intent
- A sister-title scar gets a named rule in a new game
- Engine-specific guidance needs correction

Do not copy entire product contracts here — link via [sources.md](../sources.md).
