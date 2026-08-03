# Sources — Provenance Map

Where each pattern in this folder comes from. Use this to drill into product-specific enforcement.

---

## Spawnwords

| Topic | Path |
|---|---|
| Inviolable contracts (A/M/C/F/R/P) | `E:\Projects\Spawnwords\docs\INVIOLABLE_CONTRACTS.md` |
| ADRs (27) | `E:\Projects\Spawnwords\docs\adr\` |
| LLM handoff pack | `E:\Projects\Spawnwords\docs\llm-handoff\` |
| Presentation contract (ADR-0014) | `E:\Projects\Spawnwords\docs\adr\ADR-0014-presentation-contract.md` |
| Unity host (ADR-0020) | `E:\Projects\Spawnwords\docs\adr\ADR-0020-unity-volumetric-presentation-host.md` |
| Capability kernel (ADR-0022) | `E:\Projects\Spawnwords\docs\adr\ADR-0022-gameplay-capability-kernel.md` |
| Phaser lessons (historical) | `E:\Projects\Spawnwords\docs\design\PHASER_PRESENTATION_LESSONS.md` |
| Unity lifecycle template | `E:\Projects\Spawnwords\docs\templates\unity-run-scene-lifecycle.md` |
| Managed DLL sync | `E:\Projects\Spawnwords\eng\sync-unity-managed.ps1` |
| Cursor rule | `E:\Projects\Spawnwords\.cursor\rules\spawnwords-unity-host.mdc` |
| Architecture tests | `E:\Projects\Spawnwords\tests\Spawnwords.Architecture.Tests\` |

---

## BattleBrats

| Topic | Path |
|---|---|
| Implementation spec (LLM contract) | `E:\Projects\BattleBrats\docs\Battle_Brats_Design_Bible\07_Unity_Implementation_Spec.md` |
| Content contract | `E:\Projects\BattleBrats\docs\Battle_Brats_Design_Bible\08_Content_Contract_v0.1.md` |
| Proof foundation | `E:\Projects\BattleBrats\docs\Battle_Brats_Design_Bible\09_Proof_Foundation_Contract.md` |
| Decision records | `E:\Projects\BattleBrats\docs\Decision_Records\` |
| Cursor rules (6) | `E:\Projects\BattleBrats\.cursor\rules\` |
| Content bake | `E:\Projects\BattleBrats\Assets\BattleBrats\Content\Bake\ContentBakePipeline.cs` |
| Run facade | `E:\Projects\BattleBrats\Assets\BattleBrats\UI\RunController.cs` |
| Seed derivation | `E:\Projects\BattleBrats\Assets\BattleBrats\Core\SeedDerivation.cs` |
| Boundary tests | `E:\Projects\BattleBrats\Assets\BattleBrats\Tests\ArchitectureBoundaryTests.cs` |
| Engineering scripts | `E:\Projects\BattleBrats\scripts\` |

---

## Scrapfall

| Topic | Path |
|---|---|
| Architecture contract | `E:\Projects\Scrapfall\docs\architecture\architecture-contract.md` |
| Handoff contracts summary | `E:\Projects\Scrapfall\docs\handoff\important-code-contracts.md` |
| Event-driven systems | `E:\Projects\Scrapfall\docs\architecture\event-driven-systems.md` |
| ECS overview | `E:\Projects\Scrapfall\docs\architecture\ecs-overview.md` |
| Doc tiers | `E:\Projects\Scrapfall\docs\systems\DOCUMENTATION-TIERS.md` |
| Agent guide | `E:\Projects\Scrapfall\AGENTS.md` |
| AI assistant workflow | `E:\Projects\Scrapfall\docs\for-ai-assistants.md` |
| Cursor rules (24) | `E:\Projects\Scrapfall\.cursor\rules\` |
| Validation manifest | `E:\Projects\Scrapfall\tools\validation-manifest.json` |
| System loading policy | `E:\Projects\Scrapfall\tools\system-loading-policy.json` |
| Templates | `E:\Projects\Scrapfall\templates\`, `E:\Projects\Scrapfall\docs\templates\` |

---

## Beastwright

| Topic | Path |
|---|---|
| Architecture contract | `E:\Projects\Beastwright\docs\architecture\architecture-contract.md` |
| Event boundaries | `E:\Projects\Beastwright\docs\architecture\event-boundaries.md` |
| Async multiplayer model | `E:\Projects\Beastwright\docs\architecture\async-multiplayer.md` |
| Hybrid Phaser+Three renderer | `E:\Projects\Beastwright\docs\architecture\hybrid-beast-renderer.md` |
| Feature bundle checklist | `E:\Projects\Beastwright\docs\architecture\feature-bundle-checklist.md` |
| Agent guide + Scrapfall borrow list | `E:\Projects\Beastwright\AGENTS.md` |
| Cursor rules | `E:\Projects\Beastwright\.cursor\rules\` |
| Content paths registry | `E:\Projects\Beastwright\packages\content-runtime\src\ContentPaths.ts` |
| CI validators | `E:\Projects\Beastwright\tools\` |
| Recipe templates | `E:\Projects\Beastwright\docs\templates\` |

---

## Zencode Forge (art/production platform)

| Topic | Path |
|---|---|
| Implementation spec | `E:\Projects\Zencode Forge\docs\design\FORGE_IMPLEMENTATION_SPEC.md` |
| Cross-product rules (Addendum E) | Same file, Addendum E |
| ADRs | `E:\Projects\Zencode Forge\docs\adr\` |
| Profile schema | `E:\Projects\Zencode Forge\schemas\forge-profile.schema.json` |

Forge is the offline art boundary for Scrapfall, BattleBrats, Beastwright, and JamPanels. Spawnwords uses VolumeFoundry with a similar promote-only contract.

---

## Sister-title scar lineage

Patterns in this folder often trace to lessons learned across titles:

```
Crackwords  → no god scenes, no scene reach-through, host-free sim
Scrapfall   → command/fact events, ECS lifecycle, presentation ownership
BattleBrats → pure C# layers, bake pipeline, facade controller, split hashes
Beastwright → async authority, stats-as-facts, hybrid renderer, validator culture
Spawnwords  → contracts + ADRs + capability kernel + Unity managed sync
```
