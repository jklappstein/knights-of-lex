# Playbook: New Content Type

Use when adding a new kind of game definition (item, unit, card, part, toy, word, etc.).

---

## Checklist

### 1. Schema & contract

- [ ] Define JSON schema for the new type (required fields, enums, refs)
- [ ] Assign branded ID format (e.g. `toy.<brand>.<name>`)
- [ ] Document in contracts doc with C-series ID if cross-cutting
- [ ] Schema version field on the type

### 2. Authoring interchange

- [ ] Define authoring JSON shape (may differ from runtime shape)
- [ ] Interchange parser validates and normalizes
- [ ] Unknown keys: passthrough or reject (match project convention)

### 3. Validation rules

- [ ] Cross-reference validation (IDs point to existing definitions)
- [ ] Tag validation against vocabulary registry
- [ ] Budget/balance bounds if applicable
- [ ] Demo allowlist entry if public-demo visible

### 4. Bake / load path

**C# bake:**
- [ ] Add to `ContentBakePipeline` output
- [ ] Immutable runtime record type
- [ ] Included in `ContentHash` computation

**TS load:**
- [ ] Add path to `ContentPaths` / `DataJsonPaths`
- [ ] Zod reader with validation
- [ ] Frozen after load (no runtime mutation)

### 5. Runtime accessor

- [ ] Catalog lookup by branded ID
- [ ] Missing ID → fail closed with diagnostic
- [ ] No fallback defaults that invent content

### 6. Tests

- [ ] Fixture JSON loads and validates
- [ ] Invalid fixture rejected with specific error
- [ ] Round-trip: author → bake/load → runtime lookup
- [ ] Content hash changes when definition changes
- [ ] Content hash stable when unrelated definitions change

### 7. Template & docs

- [ ] Add recipe to `docs/templates/new-<type>.md`
- [ ] Update `docs/README.md` fast lookup table
- [ ] Update `implementation-checklist.md` if one exists

---

## Full slice definition (BattleBrats reference)

From BattleBrats implementation spec — every new definition type needs:

```
Contract definition
  + Interchange parser
  + Validator rules
  + Bake output field
  + Runtime accessor
  + Tests
  + (optional) Editor tooling
```

Copy an existing type as reference (e.g. `CombatRules*` in BattleBrats, `parts/` in Beastwright).

---

## ID conventions

```json
{
  "id": "toy.dragonkeep.wind_up_barracks",
  "schemaVersion": 1,
  "tags": ["spawner", "dragonkeep"],
  "effects": [
    { "action": "spawn_unit", "params": { "unitId": "unit.soldier", "interval": 4 } }
  ],
  "artKey": "toy_dragonkeep_barracks",
  "localeKey": "toy.dragonkeep.wind_up_barracks.name"
}
```

**Rules:**
- `id` is hierarchical dot notation — never an enum
- `artKey` and `localeKey` assigned at first authoring (placeholders OK)
- `tags` must exist in `vocabulary.json` / tag registry
- `effects` use registered action types only

---

## Proof

```
Proof:
- Validator: validate:content (or dotnet content tests)
- Unit: <Type>LoaderTests.Load_ValidFixture_Succeeds
- Hash: content hash changes only when this type changes
```
