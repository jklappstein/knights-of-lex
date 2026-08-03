# Playbook: New Effect / Action

Use when adding a data-driven gameplay effect that the sim executes. Applies to all stacks.

**Time estimate:** 2-4 hours if registry infrastructure exists; build infrastructure first if not.

---

## Prerequisites

- [ ] Effect/action registry exists (executor + ownership map + CI validator)
- [ ] Content schema supports effect arrays on definitions
- [ ] At least one existing effect serves as reference slice

---

## Checklist

### 1. Define the action in content schema

- [ ] Add action type to schema enum / union (e.g. `deal_damage`, `apply_status`, `spawn_unit`)
- [ ] Define required and optional parameters with types
- [ ] Schema rejects unknown fields (passthrough or strict — pick one, be consistent)
- [ ] Add example fixture JSON with the new action

### 2. Implement executor handler

**C# (BattleBrats / Spawnwords):**
- [ ] Add handler class (one file per handler)
- [ ] Register in dispatcher (`CombatHookDispatcher`, `CapabilityExecutor`, etc.)
- [ ] Handler reads **generic parameters only** — no catalog ID branches
- [ ] Unknown action type → throw with diagnostic (never silent skip)

**TypeScript (Scrapfall / Beastwright):**
- [ ] Add `case` in `EffectExecutor.ts` (or equivalent)
- [ ] Add to `IMPLEMENTED_EFFECT_ACTIONS` const array
- [ ] Use `StrictRng` / named stream for any randomness

### 3. Register ownership (bidirectional)

- [ ] Add to `EFFECT_ACTION_OWNERS` / `effect-ownership.json`
- [ ] Owner = the system/class that executes this action
- [ ] CI validator checks: catalog ↔ executor ↔ ownership (all three match)

### 4. Wire content

- [ ] Use action in at least one content definition (JSON)
- [ ] Content validator passes
- [ ] Rules text generated from same structured data (if applicable)

### 5. Tests

- [ ] Unit test: action executes with valid params → expected state change
- [ ] Unit test: action with invalid params → throws/rejects
- [ ] Unit test: unknown action type → fails at validation (not runtime silent)
- [ ] Golden/sim digest update if combat outcomes change

### 6. Proof

```bash
# TypeScript
npm run validate:effect-actions
npm test

# C#
dotnet test --filter "EffectName"
# + EditMode if Unity presentation reacts to the fact
```

---

## Anti-patterns

| Don't | Do instead |
|---|---|
| `if (itemId == "lava_lamp")` in kernel | Data-driven action with generic params |
| `default: break` in executor switch | Throw on unknown |
| Handler in presentation layer | Handler in sim/executor |
| Register handler without ownership entry | Full bidirectional registration |
| Ship handler without test | Test in same PR |

---

## Reference implementations

| Game | Executor | Ownership |
|---|---|---|
| Beastwright | `packages/sim/src/effects/EffectExecutor.ts` | `content/meta/effect-ownership.json` |
| BattleBrats | `CombatHookDispatcher` + effect handlers | Registry validator in Tests |
| Scrapfall | Doodad effect architecture (triple path) | `validate:doodad-grant-path` |
| Spawnwords | `CapabilityExecutor` | ADR-0022 capability catalog |
