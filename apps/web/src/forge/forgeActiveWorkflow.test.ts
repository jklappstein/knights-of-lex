import { describe, expect, it } from 'vitest';
import { isActiveProductionGenerateError } from './forgeActiveWorkflow.js';

describe('isActiveProductionGenerateError', () => {
  it('detects Forge active_production 409 responses', () => {
    const err = new Error(
      "Forge /assets/ast_t97abe3uz7w8/generate failed (409): "
      + '{"detail":"Asset lifecycle \'active_production\' cannot start generation; allowed: blocked, ready, rejected"}',
    );
    expect(isActiveProductionGenerateError(err)).toBe(true);
  });

  it('ignores unrelated errors', () => {
    expect(isActiveProductionGenerateError(new Error('network down'))).toBe(false);
    expect(isActiveProductionGenerateError(new Error('Forge failed (409): review_pending'))).toBe(false);
  });
});
