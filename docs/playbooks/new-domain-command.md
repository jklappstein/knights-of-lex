# Playbook: New Domain Command

Use when adding a player or system action that mutates authoritative state and produces committed facts.

Applies to: C# Domain/Application (Spawnwords, BattleBrats), server commands (Beastwright), or command events (Scrapfall).

---

## Checklist

### 1. Define command contract

- [ ] Command type name (imperative verb: `LockFormation`, `PurchaseItem`, `SubmitBeast`)
- [ ] Input payload with all required fields
- [ ] Output: success result OR explicit error code (never ambiguous partial success)
- [ ] Idempotency expectation documented (single-shot vs retry-safe)
- [ ] Content/ruleset version pin if gameplay truth depends on content

### 2. Implement handler (single owner)

- [ ] One handler class / method — not scattered across layers
- [ ] Validation is fail-closed: unknown version → reject, illegal input → reject
- [ ] Handler resolves all values from pinned content + payload — no invented defaults
- [ ] Handler produces immutable output artifact (snapshot, receipt, fact)

### 3. State mutation rules

- [ ] Mutations happen inside handler (or domain aggregate method it calls)
- [ ] No I/O, clock, RNG (Category B), telemetry, or audio in domain entities
- [ ] Entities return committed facts; they don't emit side effects directly

### 4. Facts

- [ ] Handler emits at least one fact on success
- [ ] Facts are sufficient for all observers (presentation, telemetry, audio)
- [ ] Observers subscribe to facts — they don't re-derive from command inputs

### 5. Presentation path

- [ ] UI sends command through facade (never mutates state directly)
- [ ] Presentation receives facts and updates view-models
- [ ] If player-visible: thin UI path or human checklist

### 6. Tests

- [ ] Accept path: valid command → expected state + facts
- [ ] Reject paths: each validation rule has a test
- [ ] Immutability: output artifact cannot be mutated after production
- [ ] Idempotency: if applicable, duplicate command → same result or explicit reject
- [ ] Architecture: handler doesn't import engine/platform

### 7. Versioning

- [ ] Snapshot/schema version on output artifacts
- [ ] Migration note if changing existing command semantics
- [ ] ADR if this changes a product contract (M6)

---

## Command flow template

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐     ┌────────────┐
│ Presentation │────▶│   Command    │────▶│  Handler (one)  │────▶│   Facts    │
│  (intent)    │     │  (typed)     │     │  validate+mutate│     │ (committed)│
└─────────────┘     └──────────────┘     └─────────────────┘     └────────────┘
                                                │                      │
                                                ▼                      ▼
                                          Immutable output        Observers:
                                          (snapshot/receipt)      presentation,
                                                                  telemetry,
                                                                  audio, stats
```

---

## C# example shape (Spawnwords)

```csharp
// Application layer — orchestration only
public sealed class LockFormationHandler
{
    public Result<LockedBattleSnapshot> Handle(LockFormationCommand cmd)
    {
        var validation = _locker.Validate(cmd.Draft, cmd.ContentVersion);
        if (validation.IsFailure) return Result.Fail(validation.Error);
        
        var snapshot = _locker.Lock(cmd.Draft, cmd.ContentVersion);
        return Result.Ok(snapshot);  // immutable
    }
}
```

## TypeScript example shape (Scrapfall)

```typescript
// Command event — single consumer
class ClearResolved extends GameEvent<{ lines: number[] }> {}

// BoardMutationSystem — sole handler
onClearResolved(event: ClearResolved) {
    this.mutateBoard(event.payload);
    this.emit(new ClearCommitted({ ... }));  // fact for observers
}
```

---

## Proof

```
Proof:
- Unit: LockFormationHandlerTests.ValidDraft_ProducesSnapshot
- Unit: LockFormationHandlerTests.IllegalPlacement_Rejects
- Architecture: no UnityEngine in handler assembly
- Human: (if visible) lock button → battle starts with correct formation
```
