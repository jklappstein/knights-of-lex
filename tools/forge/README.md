# Knights of Lex — Zencode Forge

**Full consumer guide:** [`docs/integrations/zencode-forge.md`](../../docs/integrations/zencode-forge.md)

This folder is the product-side Forge contract. Another game or agent should read the linked guide first; this file is the in-tree index.

---

## Quick start (local dev)

1. Start **Zencode Forge** lean stack (`postgres` + `temporal` + `api` + `worker`) on `http://127.0.0.1:8080`. Prefer `docker compose … up -d` without `--build` once images exist.
   - Set `FORGE_OPENAI_API_KEY` in `Zencode Forge/deploy/compose/.env` (or `OPENAI_API_KEY` in the shell).
   - **Restart `forge-worker` after changing provider keys** — the worker builds its image provider registry from env at startup.
   - `GET /healthz` must report `"imageGenerationReady": true` before gfx generation will work.
2. Start Kol: `pnpm dev` (port `5180`, proxies `/api/forge` → Forge `/v1`).
3. Open the game → **Zencode Forge** panel in the left margin.
4. Pick an asset → **Generate** → select variant → **Promote**.

Specs sync automatically on panel load and before generate when the catalogue, prompts, or Forge registry are stale. **Sync Specs** is optional (forces a refresh).

Optional: `VITE_FORGE_TOKEN` (default `forge-dev-token`).

---

## What lives here

| Path | Schema | Purpose |
|---|---|---|
| `project.yaml` | `forge.project.v1` | Project id `knights-of-lex`, profile aliases, allowed write roots, validation commands |
| `profiles/*.json` | `forge.profile.v1` | Aesthetic + matte (v9) + QA per asset family |
| `adapter/` | — | Notes for CLI `forge sync` from disk (see `adapter/README.md`) |

Runtime asset specs (`forge.asset.v1`) are **not** stored as hundreds of JSON files. They are built in:

`apps/web/src/forge/buildForgeSyncPayload.ts` → `forgeAssetSpecs.ts` from `GfxForgeCatalog` + `content/audio/*.json`.

Profiles exist both here (CLI) and in `apps/web/src/forge/forgeProfiles.ts` (browser sync) — **keep both in sync**.

---

## Integration summary

```text
Sync     POST /v1/projects/knights-of-lex/syncs     full manifest + profiles + assets
Resolve  GET  /v1/assets?projectId=knights-of-lex   kol.gfx.* → ast_*
Generate POST /v1/assets/{ast_id}/generate          provider + model only
Poll     GET  /v1/workflows/{id}                    until awaiting_review | failed
Preview  GET  /v1/artifacts/{id}/content            binary blob
Promote  POST /reviews → /promotions → write file → /promotions/{id}/report
```

**Do not use** `POST /visual/jobs` — that path bypasses asset specs and the review lifecycle.

---

## Identifier cheat sheet

| You have | Example | Use for |
|---|---|---|
| artKey | `items/militia_sword` | Gfx registry, content paths |
| logicalKey | `kol.gfx.items.militia_sword` | `ForgeGenerateRequest.assetId`, sync |
| spec id | `ast_…` | `/assets/{id}/generate`, reviews, promotions |
| artifact id | `art_…` | Preview, promote |

---

## Code map

| File | Role |
|---|---|
| `apps/web/src/forge/HttpForgePort.ts` | `ForgePort` — sync, generate, poll, promote |
| `apps/web/src/forge/buildForgeSyncPayload.ts` | `SyncRequest` builder |
| `apps/web/src/forge/ForgeAssetRegistry.ts` | logicalKey → `ast_*` |
| `apps/web/src/forge/forgeWorkflowStream.ts` | Workflow polling → panel events |
| `apps/web/src/forge/forgeRecipeMapping.ts` | Kol recipe → Forge recipe/profile |
| `apps/web/src/gfx/GfxForgeCatalog.ts` | Gfx slot catalogue |
| `apps/web/vite.kolPromotePlugin.ts` | Dev promote writes to `content/` |

---

## External references

| Resource | Location |
|---|---|
| Forge implementation spec | `E:\Projects\Zencode Forge\docs\design\FORGE_IMPLEMENTATION_SPEC.md` |
| Profile JSON schema | `E:\Projects\Zencode Forge\schemas\forge-profile.schema.json` |
| Reference fixture project | `E:\Projects\Zencode Forge\fixtures\projects\scrapfall\tools\forge\` |

---

## Tests

```bash
pnpm test:unit    # ForgePromptStore, forgeProviderPolicy, GfxForgeCatalog
pnpm e2e          # e2e/tests/media-forge.spec.ts (skips if Forge offline)
```

E2E generation tests call `forge.sync()` before generate. Panel generation auto-syncs on first generate if the registry is empty.
