export interface ForgeProfileDocument {
  readonly schemaVersion: 'forge.profile.v1';
  readonly profileKey: string;
  readonly profileVersion: string;
  readonly aesthetic: {
    readonly constitution: string;
    readonly positiveFragments: readonly string[];
    readonly negativeFragments: readonly string[];
  };
  readonly providerDefaults: Record<string, unknown>;
  readonly matteProfile: Record<string, unknown>;
  readonly qaThresholds: Record<string, unknown>;
}

const KOL_AESTHETIC = {
  constitution: 'Cozy SNES fantasy RPG — readable silhouettes, warm palette',
  positiveFragments: ['cozy SNES fantasy', 'crisp icon readability', 'limited palette'],
  negativeFragments: ['photorealism', 'busy backgrounds', 'modern UI chrome'],
} as const;

const MATTE_V9 = {
  enabled: true,
  version: 'v9',
  keyColor: '#ff00ff',
  processMode: 'recommended',
  fuzz: 8,
} as const;

const OPAQUE_QA_THRESHOLDS = {
  minOccupancy: 0.04,
  allowOpaqueFullFrame: true,
  minTransparentRatio: 0,
} as const;

const DISABLED_MATTE_PROFILE = {
  enabled: false,
  mode: 'disabled',
} as const;

function imageProfile(
  profileKey: string,
  extras: { matte?: boolean; constitution?: string },
): ForgeProfileDocument {
  const opaque = extras.matte === false;
  return {
    schemaVersion: 'forge.profile.v1',
    profileKey,
    profileVersion: profileKey,
    aesthetic: {
      ...KOL_AESTHETIC,
      constitution: extras.constitution ?? KOL_AESTHETIC.constitution,
    },
    providerDefaults: {},
    matteProfile: opaque ? { ...DISABLED_MATTE_PROFILE } : { ...MATTE_V9 },
    qaThresholds: opaque ? { ...OPAQUE_QA_THRESHOLDS } : { minOccupancy: 0.04 },
  };
}

export const FORGE_PROFILE_DOCUMENTS: readonly ForgeProfileDocument[] = [
  imageProfile('knights-of-lex.item-icon.v1', {
    constitution: 'Single centered item icon, soft rim light, board-scale readability',
  }),
  imageProfile('knights-of-lex.hero-portrait.v1', {
    constitution: 'Hero portrait bust, shoulders up, expressive fantasy character',
  }),
  imageProfile('knights-of-lex.enemy-portrait.v1', {
    constitution: 'Enemy portrait bust, threatening readable silhouette',
  }),
  imageProfile('knights-of-lex.ui-surface.v1', {
    constitution: 'Full-bleed scene backdrop, edge-to-edge fill, atmospheric, no UI chrome',
    matte: false,
  }),
  imageProfile('knights-of-lex.ui-button.v1', {
    constitution: 'Pill-shaped RPG button skin, nine-slice friendly edges',
  }),
  imageProfile('knights-of-lex.ui-icon.v1', {
    constitution: 'Flat HUD icon, strong silhouette, no text',
  }),
  imageProfile('knights-of-lex.hex-tile.v1', {
    constitution: 'Hexagonal board tile, symbol-tinted, readable letter area',
  }),
  imageProfile('knights-of-lex.brand-logo.v1', {
    constitution: 'Heraldic logo mark, readable at small size',
  }),
  {
    schemaVersion: 'forge.profile.v1',
    profileKey: 'knights-of-lex.audio.v1',
    profileVersion: 'knights-of-lex.audio.v1',
    aesthetic: {
      constitution: 'Cozy fantasy RPG audio — crisp transients, warm tone',
      positiveFragments: ['short loops', 'muted UI sounds', 'orchestral warmth'],
      negativeFragments: ['harsh highs', 'long reverb tails'],
    },
    providerDefaults: {},
    matteProfile: {},
    qaThresholds: {},
  },
];
