/** Provider model entry from Forge GET /v1/providers. */
export interface ForgeProviderModelInfo {
  readonly id: string;
  readonly label: string;
  readonly default?: boolean;
}

/** Provider entry from Forge GET /v1/providers. */
export interface ForgeProviderInfo {
  readonly id: string;
  readonly label: string;
  readonly kind: string;
  readonly models: readonly ForgeProviderModelInfo[];
  readonly defaultModel: string | null;
}
