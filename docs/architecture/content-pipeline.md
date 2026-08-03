# Content Pipeline

How Zencode games treat data as authoritative, bake it for runtime, and keep visual churn from breaking gameplay proofs.

---

## Core principle

> Validated content artifacts are authoritative. No class-per-definition as the source of truth.

Ordinary game definitions live in **JSON (or equivalent) catalogs**, not in handwritten subclasses. Code provides generic executors, validators, and loaders.

---

## Pipeline shape

All four games converge on the same flow:

```
Author (JSON/YAML) → validate → bake/compile → immutable runtime catalog → sim reads frozen records
```

| Stage | Responsibility |
|---|---|
| **Author** | Designers, tools, LLM-assisted drafts in version-controlled files |
| **Validate** | Schema, cross-references, ownership, tags, budgets — fail closed |
| **Bake** | Produce immutable runtime structures + content hashes |
| **Runtime** | Sim loads baked catalog only; no ad-hoc file reads, no runtime compile |

### BattleBrats (C# bake)

```
Content/Data/*.json → ContentPackLoader → ContentBakePipeline.BakeAndValidate()
  → RuntimeContentDatabase + ContentHash
```

Sim reads `RuntimeContentDatabase` only — not ScriptableObjects, not editable `.asset` files.

### Spawnwords (offline compiler)

```
GameplayCapabilityCatalog → ContentCompiler (offline only) → CompiledGameplayRecord
  → frozen onto lock snapshot at LockFormation
```

Simulation executes frozen records. Compiler never runs at lock time or in battle.

### Scrapfall / Beastwright (TypeScript loaders)

```
data/catalog/*.json → DataLoader / ContentPaths → Zod validation → frozen in-memory catalogs
```

All paths through `ContentPaths` or `DataJsonPaths` registry — no ad-hoc relative strings.

---

## Content hashes

### Split hashes (critical for minimal churn)

| Hash | Gates | Invalidates |
|---|---|---|
| **Gameplay** | Saves, replays, sim goldens, ranked play | Balance, rules, capability records |
| **Visual** | Presentation refresh, asset reload | Art, textures, animations |
| **Full** | Complete fingerprint, CI manifests | Everything |

**Rule:** Visual churn must not invalidate gameplay goldens. BattleBrats and Spawnwords both enforce this explicitly.

### Version pins

Saves, locks, ghosts, and replays carry:
- `schemaVersion`
- `rulesetId` / `rulesetVersion`
- `contentManifestHash` (gameplay)
- `catalogueVersion` where contracts are versioned

Mismatch at load → fail loud, not silent wrong replay.

---

## ID conventions

| Pattern | Use |
|---|---|
| Hierarchical dot IDs | `brand.dragonkeep`, `toy.dragonkeep.wind_up_barracks` |
| Branded / registry-backed IDs | Parse at boundaries; never raw strings in kernel |
| Stable option IDs | Event choices, shop slots — not array indices |
| Tags as vocabulary only | Selectors and filters; no hidden numeric power from tags alone |

**Hard reject:** Content IDs as language enums (`enum Brand { DragonKeep }`). Enums don't scale; they require code changes for every new item.

---

## Schema discipline

### Do not silently strip unknown keys

Zod `.passthrough()` or equivalent — unknown authoring keys must survive validation or fail explicitly. Silent stripping caused real data loss in production pipelines.

### No assumed defaults that invent content

Missing required fields → validation error. Not "default to 1 damage."

### No hardcoded balance in product code

Tuning lives in versioned config/content. Engineers are not the bottleneck for balance iteration.

### LOCKED vs OPEN design numbers

Do not invent OPEN curves in code. Prefer RECOMMENDED defaults behind config flags until design locks them.

---

## Bake-at-lock / bake-at-runtime boundary

| Pattern | When | Games |
|---|---|---|
| **Bake at build** | Content pack compiled before runtime | BattleBrats, Scrapfall catalog load |
| **Bake at lock** | Player commits a formation/loadout; exact values frozen | Spawnwords `LockFormation` |
| **Never bake in sim** | Compiler/baker is offline or pre-lock only | Spawnwords ADR-0022, BattleBrats Content |

**Anti-pattern:** Runtime compile of abilities during battle. Creates dual writers and non-reproducible outcomes.

---

## Generated registries

When codegen exists:

- Registries are **stable-sorted** and **byte-deterministic**
- Generated files are never hand-edited
- Policy file drives generation (`system-loading-policy.json`, `IMPLEMENTED_EFFECT_ACTIONS`)
- CI diffs generated output — drift fails the build

---

## New definition type checklist

Adding a new content type requires the full slice in one PR:

1. Schema / contract definition
2. Authoring interchange format
3. Validator rules
4. Bake / loader field
5. Runtime accessor
6. At least one test fixture
7. Recipe/template doc update (if templates exist)

**Reference slices:**
- BattleBrats: `CombatRules*` pattern
- Scrapfall: `docs/templates/new-doodad-effect.md`
- Beastwright: `docs/templates/new-effect-action.md`
- Spawnwords: `docs/templates/new-canonical-word-or-concept.md`

---

## Offline art boundary

Visual production is a **separate boundary** from gameplay:

| Product | Art boundary |
|---|---|
| Spawnwords | VolumeFoundry |
| Scrapfall / BattleBrats / Beastwright | Zencode Forge |
| BattleBrats (3D) | Forge → `Assets/Generated/Forge/` |

**Rules:**
- Gameplay never blocks on generation
- Placeholders are first-class (missing art ≠ missing logic)
- Runtime loads **approved releases only**
- Contract ≠ Release: recipe can stay stable while asset binaries regen
- Final `artKey` / sound keys assigned at first authoring — no borrowing another feature's media

Forge/VolumeFoundry produce candidates. Product repos decide what ships.
