# Forge adapter — CLI / disk sync

**Primary integration path for Knights of Lex is browser sync**, not this folder. See:

- [`docs/integrations/zencode-forge.md`](../../../docs/integrations/zencode-forge.md) — full consumer guide
- [`../README.md`](../README.md) — in-repo index

---

## What Forge expects from an adapter

Zencode Forge's `ProjectAdapter` (`forge_project_sdk`) reads a `tools/forge/` tree:

```text
tools/forge/
  project.yaml           # required — forge.project.v1
  profiles/*.json        # required for sync — forge.profile.v1
  assets/*.json          # optional on disk — forge.asset.v1 (one file per logical key)
```

It produces a payload identical to what Kol sends from `buildForgeSyncPayload.ts`:

```json
{
  "repositoryRevision": "local",
  "adapterVersion": "1",
  "manifestHash": "sha256:…",
  "manifest": { },
  "profiles": [ ],
  "assets": [ ]
}
```

Posted to: `POST /v1/projects/{projectId}/syncs`

---

## Kol's two sync paths

| Path | When | Asset specs source |
|---|---|---|
| **Browser** (implemented) | Forge panel **Sync** or auto-sync on generate | `buildForgeSyncPayload.ts` builds from `GfxForgeCatalog` + audio JSON |
| **CLI** (not fully implemented) | `forge sync knights-of-lex` from Forge CLI | Would read `tools/forge/assets/*.json` from disk |

Knights of Lex does **not** commit per-slot `assets/*.json` files (100+ gfx entries). The browser path is authoritative for day-to-day work.

To enable CLI sync later:

1. Add a script (e.g. `pnpm forge:emit-specs`) that writes `tools/forge/assets/{logicalKey}.json` using the same logic as `forgeAssetSpecs.ts`.
2. Point Forge fixtures at this repo root, or run promote via `POST /promotions/{id}/execute-local` with the repo mounted on the Forge host.

---

## Executable adapter

`project.yaml` declares:

```yaml
adapter:
  protocolVersion: 1
  entrypoint: tools/forge/adapter
```

There is no Python/Node entrypoint here yet — only this README. The entrypoint is a placeholder for a future `ProjectAdapter`-compatible package if Kol moves asset specs to disk.

---

## Promotion from CLI

Forge CLI flow (reference — Scrapfall / BattleBrats):

1. Sync project
2. Generate via `POST /assets/{ast_id}/generate`
3. Review approve
4. Create promotion with `destination.relativePath`
5. Local agent: `POST /promotions/{id}/execute-local` **or** manual `promote_via_api` with project root on disk

Kol dev shortcut: `HttpForgePort.promote()` writes via Vite `POST /api/kol/promote-art` then reports hashes to Forge.

Allowed write roots (from `project.yaml`):

- `content/images`
- `content/sounds`
- `content/music`

---

## Checklist for another consumer forking this pattern

- [ ] Copy `tools/forge/project.yaml` — change `projectId`, `displayName`, `allowedWriteRoots`
- [ ] Copy/adapt `profiles/*.json` — matte + aesthetic per asset family
- [ ] Implement catalogue → `forge.asset.v1` (runtime builder or `assets/*.json`)
- [ ] Map product media keys → `logicalKey` convention (document it)
- [ ] Implement `ForgePort`: sync → resolve `ast_*` → generate → poll workflow → promote
- [ ] Proxy Forge API in dev; never call Forge from gameplay/sim packages
- [ ] Link your repo's integration doc from `tools/forge/README.md`
