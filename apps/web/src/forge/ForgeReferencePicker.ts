import type Phaser from 'phaser';
import { ensurePlaceholderTexture } from '../gfx/PlaceholderGfx.js';
import { textureKeyFromArtKey } from '../gfx/artKeys.js';
import type { GfxForgeFamily } from '../gfx/GfxForgeCatalog.js';
import { gfxForgeFamilyLabel, listGfxForgeFamilies } from '../gfx/GfxForgeCatalog.js';
import type {
  ForgeReferenceCandidate,
  ForgeReferenceSelection,
} from './ForgeReferenceCandidate.js';
import { urlToDataUrl } from './forgeReferenceMedia.js';

export interface ForgeReferencePickerOptions {
  readonly promotedGrid: HTMLElement;
  readonly sessionGrid: HTMLElement;
  readonly sessionEmptyEl: HTMLElement;
  readonly familySelect: HTMLSelectElement;
  readonly previewImg: HTMLImageElement;
  readonly selectedLabel: HTMLElement;
  readonly getScene: () => Phaser.Scene | null;
  readonly onSelectionChange: (selection: ForgeReferenceSelection | null) => void;
}

export class ForgeReferencePicker {
  private promotedCandidates: ForgeReferenceCandidate[] = [];
  private sessionCandidates: ForgeReferenceCandidate[] = [];
  private selectedId: string | null = null;
  private family: GfxForgeFamily = 'heroes';

  constructor(private readonly options: ForgeReferencePickerOptions) {
    this.populateFamilies();
    this.options.familySelect.addEventListener('change', () => {
      this.family = this.options.familySelect.value as GfxForgeFamily;
      this.renderPromotedGrid();
    });
  }

  setFamily(family: GfxForgeFamily): void {
    this.family = family;
    this.options.familySelect.value = family;
    this.renderPromotedGrid();
  }

  setPromotedCandidates(candidates: readonly ForgeReferenceCandidate[]): void {
    this.promotedCandidates = [...candidates];
    this.renderPromotedGrid();
  }

  setSessionCandidates(candidates: readonly ForgeReferenceCandidate[]): void {
    this.sessionCandidates = [...candidates];
    this.options.sessionEmptyEl.hidden = candidates.length > 0;
    this.renderSessionGrid();
  }

  setSelectedArtKey(artKey: string | null): void {
    if (!artKey) {
      this.clearSelection();
      return;
    }
    const match = this.promotedCandidates.find((c) => c.artKey === artKey);
    if (match) {
      void this.selectCandidate(match);
      return;
    }
    this.selectedId = `artKey:${artKey}`;
    this.renderGrids();
    this.options.selectedLabel.textContent = artKey;
    this.options.previewImg.src = `/content/images/${artKey}.png`;
    this.options.previewImg.hidden = false;
  }

  clearSelection(notify = true): void {
    this.selectedId = null;
    this.renderGrids();
    this.options.selectedLabel.textContent = 'No reference selected';
    this.options.previewImg.hidden = true;
    this.options.previewImg.removeAttribute('src');
    if (notify) {
      this.options.onSelectionChange(null);
    }
  }

  private populateFamilies(): void {
    this.options.familySelect.innerHTML = '';
    for (const family of listGfxForgeFamilies()) {
      const option = document.createElement('option');
      option.value = family;
      option.textContent = gfxForgeFamilyLabel(family);
      this.options.familySelect.appendChild(option);
    }
    this.options.familySelect.value = this.family;
  }

  private renderPromotedGrid(): void {
    this.options.promotedGrid.innerHTML = '';
    if (this.promotedCandidates.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'kol-forge-muted kol-forge-ref-empty';
      empty.textContent = 'No promoted assets in this family yet.';
      this.options.promotedGrid.appendChild(empty);
      return;
    }
    for (const candidate of this.promotedCandidates) {
      this.options.promotedGrid.appendChild(this.createThumbButton(candidate));
    }
  }

  private renderSessionGrid(): void {
    this.options.sessionGrid.innerHTML = '';
    for (const candidate of this.sessionCandidates) {
      this.options.sessionGrid.appendChild(this.createThumbButton(candidate));
    }
  }

  private renderGrids(): void {
    this.renderPromotedGrid();
    this.renderSessionGrid();
  }

  private createThumbButton(candidate: ForgeReferenceCandidate): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'kol-forge-ref-thumb';
    btn.title = candidate.label;
    if (candidate.id === this.selectedId) {
      btn.classList.add('selected');
    }

    const img = document.createElement('img');
    img.alt = candidate.label;
    let visual: HTMLElement = img;

    if (candidate.thumbUrl) {
      img.src = candidate.thumbUrl;
      img.onerror = () => {
        if (candidate.kind === 'artKey' && candidate.artKey) {
          this.applyPlaceholderThumb(img, candidate.artKey);
        } else {
          visual = this.createPlaceholder(candidate.shortLabel);
          img.replaceWith(visual);
        }
      };
    } else {
      visual = this.createPlaceholder(candidate.shortLabel);
    }

    const label = document.createElement('span');
    label.textContent = candidate.shortLabel;

    btn.append(visual, label);
    btn.addEventListener('click', () => {
      void this.selectCandidate(candidate);
    });
    return btn;
  }

  private createPlaceholder(text: string): HTMLElement {
    const el = document.createElement('div');
    el.className = 'kol-forge-ref-thumb-placeholder';
    el.textContent = text.slice(0, 3);
    return el;
  }

  private applyPlaceholderThumb(img: HTMLImageElement, artKey: string): void {
    const scene = this.options.getScene();
    if (!scene) {
      img.replaceWith(this.createPlaceholder(artKey));
      return;
    }
    ensurePlaceholderTexture(scene, artKey);
    const canvas = scene.textures.get(textureKeyFromArtKey(artKey)).getSourceImage() as HTMLCanvasElement;
    img.src = canvas.toDataURL('image/png');
  }

  private async selectCandidate(candidate: ForgeReferenceCandidate): Promise<void> {
    this.selectedId = candidate.id;
    this.renderGrids();
    this.options.selectedLabel.textContent = candidate.label;

    if (candidate.kind === 'artKey' && candidate.artKey && candidate.thumbUrl) {
      this.options.previewImg.src = candidate.thumbUrl;
      this.options.previewImg.hidden = false;
      this.options.onSelectionChange({
        mode: 'artKey',
        artKey: candidate.artKey,
        label: candidate.label,
        previewUrl: candidate.thumbUrl,
      });
      return;
    }

    if (candidate.kind === 'artifact' && candidate.thumbUrl) {
      try {
        const dataUrl = await urlToDataUrl(candidate.thumbUrl);
        this.options.previewImg.src = dataUrl;
        this.options.previewImg.hidden = false;
        this.options.onSelectionChange({
          mode: 'upload',
          dataUrl,
          label: candidate.label,
          previewUrl: dataUrl,
        });
      } catch (err) {
        this.options.selectedLabel.textContent = `Could not load variant: ${
          err instanceof Error ? err.message : String(err)
        }`;
      }
    }
  }
}
