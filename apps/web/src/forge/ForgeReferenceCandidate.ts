export type ForgeReferenceCandidateKind = 'artKey' | 'artifact';

export interface ForgeReferenceCandidate {
  readonly id: string;
  readonly kind: ForgeReferenceCandidateKind;
  readonly label: string;
  readonly shortLabel: string;
  readonly thumbUrl: string | null;
  readonly artKey: string | null;
  readonly artifactId: string | null;
}

export type ForgeReferenceSelection =
  | {
      readonly mode: 'artKey';
      readonly artKey: string;
      readonly label: string;
      readonly previewUrl: string;
    }
  | {
      readonly mode: 'upload';
      readonly dataUrl: string;
      readonly label: string;
      readonly previewUrl: string;
    };
