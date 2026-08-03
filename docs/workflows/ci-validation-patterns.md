# CI and Validation Patterns

How Zencode games enforce architecture as executable contracts — not markdown essays.

---

## Core principle

> Architecture rules that aren't executable will erode. Validators, codegen, and boundary tests are tier-2 authority — they win over informal docs when they disagree with stale markdown.

---

## Validation tiers

All TypeScript games use a similar tier model. C# games use test suites + eng scripts.

| Tier | Command (typical) | When to run |
|---|---|---|
| **Focus** | `validate:focus` / `npm run build:fast` | Every PR, agent task completion |
| **Agent gates** | `ci:agent-gates` | CI parity, pre-push |
| **Full** | `validate:all` / `eng/bootstrap.ps1` | Release, nightly |

### Spawnwords (PowerShell / dotnet)

```powershell
eng/bootstrap.ps1                    # full loop
eng/sync-unity-managed.ps1 -CheckOnly  # DLL drift
dotnet test tests/Spawnwords.Architecture.Tests/
```

### BattleBrats (PowerShell / Unity)

```powershell
scripts/check-unity-compile.ps1      # editor open
scripts/run-editmode-tests.ps1       # editor closed
```

### Scrapfall / Beastwright (npm)

```bash
npm run validate:focus
npm run ci:agent-gates
npm run ci:core-systems    # policy + generated registry diff
npm run ci:ratchets        # any/unknown cast ratchets
```

---

## Validation manifest pattern

Scrapfall `tools/validation-manifest.json` groups validators into suites:

```json
{
  "suites": {
    "focus": ["validate:board-access", "validate:gamescene-authority", ...],
    "full": ["...all validators..."]
  }
}
```

`tools/run-validate.js` executes manifest suites. Adding a new architectural rule means adding a validator to the manifest — not just writing a doc paragraph.

---

## Validator categories

### Architecture boundary validators

| Validator | Catches |
|---|---|
| `validate:gamescene-authority` | GameScene mutating gameplay state |
| `validate:board-access` | Board accessed outside `BoardService` |
| `validate:factory-scoped-deps` | Factory keys cached in system fields |
| `validate:gameplay-rng` | `Math.random` in sim packages |
| `validate:content-paths` | Hardcoded content file paths |
| `validate:effect-actions` | Catalog ↔ executor ↔ ownership drift |
| `DependencyRuleTests` (C#) | Assembly import violations |
| `ArchitectureBoundaryTests` (C#) | `UnityEngine` in pure layers |

### Content validators

| Validator | Catches |
|---|---|
| `validate:content` | Schema, cross-refs, required fields |
| `validate:tags` | Unknown tags not in vocabulary |
| `validate:stable-robot-id` | Array index used as identity |
| `validate:zod-passthrough` | Silent JSON key stripping |
| Content hash drift | Gameplay vs visual hash mismatch |

### Codegen drift validators

| Validator | Catches |
|---|---|
| `ci:core-systems` | `system-loading-policy.json` ≠ generated registry |
| `gen:core-systems` diff | Hand-edited generated files |
| `sync-unity-managed.ps1 -CheckOnly` | Stale managed DLLs in Unity |
| Stable-sorted manifest diff | Non-deterministic codegen output |

### Typing ratchets

Instead of big-bang `any` cleanup:

```
lint-typing-ratchet.mjs  — count of any/unknown casts
ci:ratchets              — fail if count increases
```

Allows incremental improvement without regression.

---

## Codegen policy pattern

When system/handler order matters:

1. Declare in policy JSON (`system-loading-policy.json`, ownership JSON)
2. Run codegen (`gen:core-systems`, export scripts)
3. CI diffs generated output
4. Never hand-edit generated files

**Fragile adjacency warning:** Document ordering dependencies in policy comments. Reordering without understanding command/event flow causes one-frame desyncs.

---

## Golden test pattern

Headless sim produces deterministic digests:

```
test:sim:update-goldens     # intentional outcome change
update-sim-goldens.mjs      # Beastwright
```

Goldens gate on **gameplay content hash only** — visual churn does not invalidate them.

BattleBrats uses named golden combat scenarios (10 regression anchors) as EditMode tests.

---

## Proof map pattern

Spawnwords `docs/evidence/contract-enforcement.md` maps contract IDs to proof status:

```
M5 (done = named proof)     → enforced via PR checklist + test suites
A1 (host-free)              → enforced via DependencyRuleTests
C26 (no concept-ID branches)  → enforced via CapabilityBranchGuardTests
```

Every contract should trend toward `enforced`. `declared` without proof is technical debt.

---

## Fast-fail culture

Shared across Beastwright, Scrapfall, and Spawnwords:

| Pattern | Implementation |
|---|---|
| Required missing data throws | `ErrorLogger.critical`, validation exceptions |
| No empty catch blocks | `validate-no-empty-catch.mjs` |
| Unknown effect actions throw | `default: break` is banned |
| Missing registry entry fails build | Bidirectional ownership CI |
| Load-time schema failure | No runtime repair of corrupt content |

**Anti-pattern:** Silent fallback that invents default content or skips unknown actions.

---

## CONTRIBUTING change matrix

Beastwright and Scrapfall map change types to required validators:

| Change type | Required proof |
|---|---|
| New effect action | executor + ownership + `validate:effect-actions` |
| New ECS system | policy JSON + `gen:core-systems` + `ci:core-systems` |
| Content schema | `validate:content` + fixture |
| Sim rule change | unit test + golden update if intentional |
| Unity presentation | EditMode/PlayMode or human checklist |
| Contract change | ADR + enforcement update |

Copy this matrix into new game CONTRIBUTING docs.

---

## Doc link integrity

`validate-doc-links.mjs` (Beastwright) — broken internal doc links fail CI.

Prevents agent onboarding paths from rotting silently.

---

## Retired-system guards

Beastwright validators prevent reintroducing deprecated mechanics:

- `validate-no-grid-construction`
- `validate-no-route-snapshot`

**Pattern:** When deprecating a system, add a CI guard that fails if old patterns reappear. Cheaper than re-fighting the same architectural battle.

---

## Setting up validation for a new game

Minimum viable enforcement stack:

1. **Assembly/import boundary test** — host-free core verified
2. **Content schema validator** — fail closed on load
3. **Effect/action ownership validator** — bidirectional registry
4. **RNG validator** — no engine random in sim path
5. **Focus suite** — fast PR gate (< 2 min)
6. **Agent gates suite** — CI parity
7. **Codegen drift check** — if policy-driven registries exist
8. **Typing ratchet** — if TypeScript

Add game-specific validators only when a scar repeats twice.

---

## What not to validate

- Per-class documentation existence
- Code style beyond lint (let formatter handle it)
- Design bible flavor alignment
- Archive folder contents

Validate **behaviour and boundaries**, not prose.
