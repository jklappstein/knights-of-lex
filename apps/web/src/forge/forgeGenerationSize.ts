/** gpt-image-2 hard limits (mirrors Zencode Forge visual_routes.py). */
const IMAGE2_MIN_PIXELS = 655_360;
const IMAGE2_MAX_PIXELS = 8_294_400;
const IMAGE2_MAX_EDGE = 3840;
const IMAGE2_MAX_ASPECT = 3.0;

/**
 * Preferred gpt-image-2 sizes (multiples of 16, within limits).
 * Prefer these over odd minimums like 816² when the aspect matches.
 */
const CANONICAL_SIZES: readonly { width: number; height: number }[] = [
  { width: 1024, height: 1024 },
  { width: 1536, height: 1536 },
  { width: 2048, height: 2048 },
  { width: 1024, height: 1536 },
  { width: 1536, height: 1024 },
  { width: 1024, height: 2048 },
  { width: 2048, height: 1024 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 512, height: 1024 },
  { width: 1024, height: 512 },
  { width: 1088, height: 1920 },
  { width: 1920, height: 1088 },
  { width: 1280, height: 720 },
  { width: 720, height: 1280 },
];

export interface ForgeGenerationDimensions {
  /** Width sent to Forge provider (multiples of 16). */
  readonly width: number;
  /** Height sent to Forge provider. */
  readonly height: number;
  /** Catalogue / in-game target width. */
  readonly targetWidth: number;
  /** Catalogue / in-game target height. */
  readonly targetHeight: number;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y !== 0) {
    const next = x % y;
    x = y;
    y = next;
  }
  return x || 1;
}

function aspectRatioTerms(targetWidth: number, targetHeight: number): {
  readonly aspectW: number;
  readonly aspectH: number;
} {
  const g = gcd(targetWidth, targetHeight);
  return { aspectW: targetWidth / g, aspectH: targetHeight / g };
}

function roundUpTo16(value: number): number {
  return Math.max(16, Math.ceil(value / 16) * 16);
}

function meetsImage2Constraints(width: number, height: number): boolean {
  const pixels = width * height;
  const longEdge = Math.max(width, height);
  const shortEdge = Math.min(width, height);
  const aspect = shortEdge === 0 ? Infinity : longEdge / shortEdge;
  return (
    pixels >= IMAGE2_MIN_PIXELS
    && pixels <= IMAGE2_MAX_PIXELS
    && width <= IMAGE2_MAX_EDGE
    && height <= IMAGE2_MAX_EDGE
    && aspect <= IMAGE2_MAX_ASPECT + 1e-6
  );
}

function dimensionsAtUnitScale(aspectW: number, aspectH: number, unitScale: number): {
  width: number;
  height: number;
} {
  return {
    width: roundUpTo16(aspectW * unitScale),
    height: roundUpTo16(aspectH * unitScale),
  };
}

function minValidUnitScale(
  aspectW: number,
  aspectH: number,
  minimumScale: number,
): number {
  const maxUnitScale = Math.floor(IMAGE2_MAX_EDGE / Math.max(aspectW, aspectH));
  let lo = Math.max(1, minimumScale);
  let hi = Math.max(lo, maxUnitScale);
  let best = hi;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const { width, height } = dimensionsAtUnitScale(aspectW, aspectH, mid);
    if (meetsImage2Constraints(width, height)) {
      best = mid;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }

  return best;
}

function aspectDistance(width: number, height: number, targetRatio: number): number {
  const ratio = width / height;
  return Math.abs(ratio - targetRatio) / targetRatio;
}

/**
 * Prefer a well-known gpt-image-2 size when it covers the catalogue target
 * and matches aspect within tolerance; otherwise keep the algorithmic minimum.
 */
function preferCanonicalSize(
  targetWidth: number,
  targetHeight: number,
  algorithmic: { width: number; height: number },
  tolerance = 0.08,
): { width: number; height: number } {
  const targetRatio = targetWidth / targetHeight;
  let best: { width: number; height: number } | null = null;
  let bestPixels = Infinity;

  for (const candidate of CANONICAL_SIZES) {
    if (!meetsImage2Constraints(candidate.width, candidate.height)) continue;
    if (candidate.width < targetWidth || candidate.height < targetHeight) continue;
    if (aspectDistance(candidate.width, candidate.height, targetRatio) > tolerance) continue;

    const pixels = candidate.width * candidate.height;
    if (pixels < bestPixels) {
      best = candidate;
      bestPixels = pixels;
    }
  }

  if (!best) return algorithmic;

  // Prefer canonical when it is not dramatically larger than the minimum valid size.
  const algoPixels = algorithmic.width * algorithmic.height;
  if (bestPixels <= algoPixels * 2.5) {
    return best;
  }
  return algorithmic;
}

/**
 * gpt-image-2 size that preserves the catalogue aspect ratio.
 * Prefers canonical sizes (1024², 1024×2048, …) when they fit; otherwise scales
 * reduced integer ratio terms until pixel/edge/3:1 limits are satisfied.
 */
export function resolveForgeGenerationDimensions(
  targetWidth: number,
  targetHeight: number,
): ForgeGenerationDimensions {
  if (targetWidth <= 0 || targetHeight <= 0) {
    const fallback = preferCanonicalSize(1024, 1024, { width: 1024, height: 1024 });
    return {
      ...fallback,
      targetWidth,
      targetHeight,
    };
  }

  // Catalogue size already valid — keep it (e.g. surfaces 1024×2048).
  if (meetsImage2Constraints(targetWidth, targetHeight)
    && targetWidth % 16 === 0
    && targetHeight % 16 === 0) {
    return {
      width: targetWidth,
      height: targetHeight,
      targetWidth,
      targetHeight,
    };
  }

  const { aspectW, aspectH } = aspectRatioTerms(targetWidth, targetHeight);
  const catalogueScale = Math.max(
    Math.ceil(targetWidth / aspectW),
    Math.ceil(targetHeight / aspectH),
  );
  const unitScale = minValidUnitScale(aspectW, aspectH, catalogueScale);
  const algorithmic = dimensionsAtUnitScale(aspectW, aspectH, unitScale);
  const preferred = preferCanonicalSize(targetWidth, targetHeight, algorithmic);
  return { ...preferred, targetWidth, targetHeight };
}

export function forgeDerivativeSizes(targetWidth: number, targetHeight: number): number[] {
  if (targetWidth <= 0 || targetHeight <= 0) return [];
  if (targetWidth === targetHeight) return [targetWidth];
  return [Math.max(targetWidth, targetHeight)];
}

/** @internal Test helper — validates a synced gfx spec meets provider limits. */
export function isValidForgeGenerationSize(width: number, height: number): boolean {
  return width % 16 === 0 && height % 16 === 0 && meetsImage2Constraints(width, height);
}

/** @internal Test helper — generation aspect matches catalogue within tolerance. */
export function generationAspectMatchesTarget(
  dims: ForgeGenerationDimensions,
  tolerance = 0.08,
): boolean {
  const targetRatio = dims.targetWidth / dims.targetHeight;
  const generationRatio = dims.width / dims.height;
  return Math.abs(generationRatio - targetRatio) / targetRatio <= tolerance;
}
