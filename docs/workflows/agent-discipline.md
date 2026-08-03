# Agent Discipline

How to work on Zencode games with AI agents (Cursor, etc.) without inventing architecture or claiming false completion.

---

## Verify before implement

**Universal rule across all four games:**

1. Read the relevant contract/ADR section
2. Find the closest existing feature in code
3. Read its tests
4. Copy the pattern — do not invent APIs
5. Implement the smallest complete vertical slice
6. Name the proof before claiming done

Scrapfall: `docs/for-ai-assistants.md`  
Beastwright: `docs/for-ai-assistants.md` + `docs/implementation-checklist.md`  
Spawnwords: `docs/llm-handoff/00-START-HERE.md`  
BattleBrats: `battlebrats-workflow.mdc`

---

## Bounded read paths

Do not browse the entire repo. Use each game's fast lookup:

| Game | Entry |
|---|---|
| Spawnwords | `docs/llm-handoff/00-START-HERE.md` (≤20 docs) |
| Scrapfall | `docs/handoff/README.md` (8 docs in order) |
| Beastwright | `docs/README.md` fast lookup table |
| BattleBrats | Design Bible section + closest feature + tests |
| Cross-game | [README.md](../README.md) → specific architecture doc |

**Never treat `archive/**` as product authority** unless explicitly recovering history.

---

## One vertical slice per task

A single PR/change should include:

```
schema/content (if needed)
  → validator/ownership
  → handler/owner
  → test
  → presentation (if player-visible)
```

**Not:**
- Handler now, registry next PR
- "Compiles = done"
- Refactor unrelated files while fixing a bug

---

## Recipe-first for new feature types

Before implementing an unfamiliar feature type, find or create a recipe:

| Feature type | Example recipe location |
|---|---|
| New effect/action | Beastwright `docs/templates/new-effect-action.md` |
| New doodad | Scrapfall `docs/templates/new-doodad-effect.md` |
| New domain command | Spawnwords `docs/templates/domain-command-slice.md` |
| New visual release | Spawnwords `docs/templates/new-visual-concept-release.md` |
| New content definition | BattleBrats `CombatRules*` reference slice |

Recipes define: authority → required IDs → steps → validation → tests → proof.

---

## Cursor rules pattern

Each game maintains `.cursor/rules/` as short, enforceable guardrails that **point to** canonical docs rather than duplicating them.

### Always-on rules (typical)

| Rule theme | What it enforces |
|---|---|
| Architecture | Layer boundaries, hard rejects |
| Workflow | Read-first, one slice, proof naming |
| Sim purity | No engine imports in authority path |
| Presentation ownership | Semantic vs visual split |
| Randomness | Gameplay RNG vs VFX RNG |
| Strong typing | No `any`, branded IDs |
| Change discipline | Surgical edits, no drive-by refactors |

### Scoped rules (typical)

| Rule theme | Scope |
|---|---|
| C# conventions | `Assets/**/*.cs` or `src/**` |
| Unity UI | Presentation assemblies |
| System lifecycle | `*System` files |
| Codegen policy | When adding systems/handlers |
| JSON/schema | Content authoring files |

When adding a new cross-cutting concern, add a cursor rule **and** a validator **and** a contract line — not just a chat instruction.

---

## Rename discipline

When renaming a type, field, or event:

1. Grep all call sites across the repo
2. Update tests and generated registries
3. Update ownership maps and validators
4. Run focused validation suite

Refactor-rename rules exist in Scrapfall and Beastwright cursor rules.

---

## Completion checklist

Before marking a task done, verify:

- [ ] No new boundary violations (engine imports, scene reach-through, presentation math)
- [ ] Unknown actions/effects registered with ownership + tests
- [ ] Content paths use registry (not ad-hoc strings)
- [ ] Named proof provided (test file, validator command, or human checklist)
- [ ] No hand-edited generated files
- [ ] No `any` / unchecked casts introduced in product code
- [ ] If UI-visible and no automated test: human play checklist included

### Human play checklist format

```
Human proof:
1. Start app → navigate to [feature]
2. Perform [action]
3. Expect [observable result]
4. Remount/reload → expect [no leak / correct reset]
```

---

## What agents must not do

| Forbidden | Why |
|---|---|
| Invent APIs not in codebase | Creates dead code |
| Read `archive/**` for current architecture | Wrong-era design |
| Scaffold deprecated hosts (Phaser/Angular as shipped client for Unity games) | Violates ADR |
| Manual DLL copies or `csc.rsp` hacks | Breaks sync manifest |
| Upgrade engine packages without ADR | Unreviewed breaking changes |
| Skip registry/validator when adding handlers | Silent no-ops |
| Claim done after compile only | False confidence |

---

## Cross-game borrow list

Beastwright `AGENTS.md` documents what was borrowed from Scrapfall. The same list applies as a checklist for any new game:

- [ ] JSON authority + schema validation
- [ ] Named RNG streams + CI gate
- [ ] Command vs fact events
- [ ] Bidirectional effect/action registration
- [ ] Presentation/gameplay split
- [ ] Generated media ownership (final keys from day one)
- [ ] Content path registry + validators
- [ ] Snapshot/ruleset hashing + sim golden digests
- [ ] Fast-fail / no empty catch
- [ ] Tiered CI (`validate:focus` / `ci:agent-gates`)
- [ ] Agent doc protocol + recipes

**Do not port:** Engine-specific ECS/scene patterns into the wrong host. Port the **ownership model**.

---

## Day-1 agent setup for a new game

Copy this checklist when bootstrapping:

1. [ ] Create `AGENTS.md` from Beastwright/Spawnwords template (non-negotiables + commands)
2. [ ] Create `docs/for-ai-assistants.md` or `docs/llm-handoff/00-START-HERE.md`
3. [ ] Copy [../templates/contract-starter.md](../templates/contract-starter.md) → `docs/contracts/`
4. [ ] Copy playbooks from [../playbooks/](../playbooks/) → `docs/templates/`
5. [ ] Create 3-6 `.cursor/rules/` pointing at canonical docs
6. [ ] Add fast lookup table to `docs/README.md`
7. [ ] Link to `e:\projects\zencode games\` in AGENTS.md under "Cross-game patterns"
8. [ ] Create `docs/implementation-state.md` — update after every tranche

### AGENTS.md non-negotiables template

```markdown
## Non-negotiables
- Sim is host-free (no engine imports in authority path)
- Presentation never authors outcomes
- JSON/catalog is authoritative
- One execution owner per effect type
- Named RNG streams for gameplay; Math.random/UnityEngine.Random for VFX only
- Done = named proof (unit test + validator + human checklist if visible)
- Contract change = ADR + enforcement in same PR
- No `any` / unchecked casting in product code
- Final artKey/soundKey from first authoring
- Content hash on saves/replays
```

---

## Suggested cursor rule for any new game

```markdown
---
description: [Game] architecture fences
alwaysApply: true
---

# [Game] agent fences

- Product host is [Unity 6 / Phaser 4] per ADR-XXXX.
- Domain/Simulation stay host-free.
- Do not read archive/** unless recovering history.
- Managed Domain enters host only via [sync script path].
- Changing contracts requires ADR + enforcement in same change.
- Done = named proof, not compile-only.

Canonical docs: [link to handoff pack]
Cross-game patterns: e:\projects\zencode games\
```
