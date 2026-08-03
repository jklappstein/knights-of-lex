# Contract Starter

Copy to `docs/contracts/inviolable-contracts.md` in your game repo. Customize IDs and game-specific sections.

---

## Precedence

1. Product contracts (this file)
2. Accepted ADRs
3. Schemas, validators, tests, runtime
4. Design bible / flavor docs
5. Handoff / chat

---

## 0. Meta

| ID | Contract | Why |
|---|---|---|
| M1 | Product contracts define behaviour. CI rejects disagreement. | "Whatever runtime does" legitimized drift |
| M2 | Bounded read path: README → this file → one template → implement → validate | Token burn; wrong-era design |
| M3 | Smallest complete vertical slice per change | Half-wired features silently no-op |
| M4 | Verify before invent — copy existing patterns | LLM-authored surfaces that never existed |
| M5 | Done = named proof. Compile-only is not done. | False confidence |
| M6 | Contract change = ADR + enforcement + migration in same PR | Fossilized rules or informal erosion |
| M7 | Player-visible features ship with content + locale + art keys + validation + proof | "Works in editor" ≠ shippable |
| M8 | Map change area → verification in completion summary | Agents claim done after compile |

---

## 1. Architecture

| ID | Contract | Why |
|---|---|---|
| A1 | Sim/domain layer is host-free (no engine, DOM, HTTP, platform SDK) | Untestable; goldens die |
| A2 | Presentation is bridge only — never authors outcomes, prices, legality, or RNG | Trust breaks |
| A3 | One facade for player-facing mutation | Hidden writers |
| A4 | Commands → one handler → committed facts → observers | Double-fire, invented facts |
| A5 | One execution owner per effect/action type; unknown actions fail closed | Silent no-ops |
| A6 | Kernel does not branch on content catalog IDs | Combinatorial forks |
| A7 | No scene reach-through — typed ports injected at compose time | Invisible contracts |
| A8 | Composition root owns wiring — no god service bags | Soft coupling |
| A10 | Single access path for singleton truth (board, run, wallet) | Two paths disagree |
| A13 | No god scenes — thin hosts, phase transitions without scene reload | Untestable tar pits |
| A16 | No `any` / unchecked casting in product code | Cast cancer |
| A20 | Client never constructs simulators as live settlement authority | Dual writers |

---

## 2. Content

| ID | Contract | Why |
|---|---|---|
| C1 | Validated content artifacts are authoritative | Dual sources diverge |
| C2 | One canonical authoring source per definition | Which-file-won bugs |
| C4 | Content paths through one registry | Tools load different files |
| C5 | Schema version + content hash on saves/replays | Silent wrong replays |
| C6 | Branded/registry-backed IDs | Stringly typing |
| C7 | Tags are vocabulary + selectors only | Hidden power from tags |
| C8 | Schemas must not silently strip unknown keys | Silent data loss |
| C9 | Loaded catalogs are frozen | Cross-run contamination |
| C13 | Missing required fields fail loud | Invented defaults |
| C16 | Split gameplay vs visual content hashes | Visual churn breaks goldens |
| C18 | Validate → freeze; no production fixture fallback | Tests ≠ production |

---

## 3. Randomness

| ID | Contract | Why |
|---|---|---|
| R1 | Category A (committed rolls): store result before UI reveals | Player acts on uncommitted state |
| R2 | Category B (seeded sim): named streams from seed + inputs + content hash | Replay drift |
| R3 | Category C (presentation): non-seeded OK; never feeds A or B | Stolen gameplay rolls |
| R4 | No engine RNG in authority path | Non-deterministic outcomes |

---

## 4. Presentation / lifecycle

| ID | Contract | Why |
|---|---|---|
| P1 | Logical truth ≠ visual body count (capped VFX ok) | Outcome mismatch |
| P2 | Playback ≠ re-sim | Dual authority |
| P3 | One destroy-owner per GO/tween/timer/texture | Leaked objects |
| P8 | Deferred work is scope-owned with stale-callback guards | Stale callbacks |
| P9 | Phase reset: cancel → destroy pools → state reset → release textures | Cross-phase contamination |

---

## 5. [Game-specific section]

Add domain rules here with G-series or feature-specific IDs.

Example (word game):
| ID | Contract | Why |
|---|---|---|
| G1 | Board is domain matrix, not display objects | Display-as-truth |
| G2 | Lock produces immutable snapshot | TOCTOU |

---

## Enforcement map

Track proof status for each ID:

| ID | Status | Proof |
|---|---|---|
| A1 | enforced | `ArchitectureBoundaryTests` |
| A5 | partial | Registry exists; CI pending |
| C16 | declared | Not yet implemented |

Statuses: `declared` → `partial` → `gated` → `enforced`

Update this table as enforcement lands. Target: all IDs at `enforced` before beta.
