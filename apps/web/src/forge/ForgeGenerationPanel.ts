import type Phaser from 'phaser';
import type {
  ForgeGenerateRequest,
  ForgePort,
  ForgeReferenceImage,
} from '../ports/ForgePort.js';
import type { SfxPort } from '../ports/SfxPort.js';
import { ArtResolver } from '../gfx/ArtResolver.js';
import { applyPromotedArtToScene } from './applyPromotedArt.js';
import { ensurePlaceholderTexture } from '../gfx/PlaceholderGfx.js';
import { textureKeyFromArtKey, artUrlFromKey } from '../gfx/artKeys.js';
import {
  kolPromotionDestForTarget,
  previewArtKeyForTarget,
  runtimeArtKeysForPromote,
  forgeTargetArtKeyForRuntime,
} from './forgeArtPromotion.js';
import { promotionPathForArtKey } from './createForgePort.js';
import {
  defaultProviderModel,
  filterProvidersForRecipe,
  OFFLINE_FORGE_PROVIDERS,
} from './forgeProviderPolicy.js';
import type { ForgeProviderInfo } from './ForgeProviderInfo.js';
import type { ForgeBatchArtifact } from './ForgeBatchArtifact.js';
import { buildCompositeCellPreviews } from './forgeCompositeCellPreviews.js';
import type { ForgeReferenceSelection } from './ForgeReferenceCandidate.js';
import { ForgeReferencePicker } from './ForgeReferencePicker.js';
import {
  buildArtifactReferenceCandidates,
  buildPromotedReferenceCandidates,
} from './forgeReferenceCandidates.js';
import { readBlobAsDataUrl } from './forgeReferenceMedia.js';
import {
  debounce,
  FORGE_PROMPT_SAVE_DEBOUNCE_MS,
  mergeForgePromptDraft,
  saveForgePromptDraft,
  type DebouncedFn,
} from './ForgePromptStore.js';
import type { ForgeGfxTarget, ForgeItemTarget } from './ForgeGfxTarget.js';
import {
  buildForgeRequestForGfxEntry,
  describeArtKey,
  gfxForgeEntryForArtKey,
  gfxForgeFamilyLabel,
  listGfxForgeEntries,
  listGfxForgeEntriesByFamily,
  listGfxForgeFamilies,
  type GfxForgeFamily,
} from '../gfx/GfxForgeCatalog.js';

export type { ForgeGfxTarget, ForgeItemTarget } from './ForgeGfxTarget.js';
export class ForgeGenerationPanel {
  private readonly root: HTMLElement;
  private readonly previewImg: HTMLImageElement;
  private readonly previewWrap: HTMLElement;
  private readonly cellPreviewGrid: HTMLElement;
  private readonly logEl: HTMLElement;
  private readonly statusEl: HTMLElement;
  private readonly variantGrid: HTMLElement;
  private readonly variantSection: HTMLElement;
  private readonly refPreviewImg: HTMLImageElement;
  private readonly refPromotedWrap: HTMLElement;
  private readonly refUploadWrap: HTMLElement;
  private referencePicker: ForgeReferencePicker;
  private referenceUploadDataUrl: string | null = null;
  private request: ForgeGenerateRequest | null = null;
  private target: ForgeGfxTarget | null = null;
  private abort: AbortController | null = null;
  private activeGenerationId = 0;
  private generationInFlight = false;
  private forgeOnline = false;
  private forgeProviders: ForgeProviderInfo[] = [...OFFLINE_FORGE_PROVIDERS];
  private batchArtifacts: ForgeBatchArtifact[] = [];
  private selectedArtifactId: string | null = null;
  private promptSaveDebounced: DebouncedFn | null = null;
  constructor(
    mount: HTMLElement,
    private readonly forge: ForgePort,
    private readonly sfx: SfxPort,
    private readonly getScene: () => Phaser.Scene | null,
  ) {
    this.root = document.createElement('div');
    this.root.className = 'kol-forge-panel';
    this.root.setAttribute('data-testid', 'forge-panel');
    this.root.innerHTML = `
      <header class="kol-forge-header">
        <h2>Zencode Forge</h2>
        <p class="kol-forge-sub">Realtime generation — left margin (non-playable)</p>
        <div class="kol-forge-status" data-status>Checking Forge…</div>
      </header>
      <section class="kol-forge-browser" data-browser>
        <h3>Asset Browser</h3>
        <label>Family<select name="gfxFamily" data-testid="forge-family"></select></label>
        <label>Asset<select name="gfxAsset" data-testid="forge-asset"></select></label>
        <button type="button" data-load-asset data-testid="forge-load-asset">Load asset</button>
      </section>
      <section class="kol-forge-target" data-target>
        <p class="kol-forge-muted">Browse a gfx slot or tap an inventory item in-game.</p>
      </section>
      <form class="kol-forge-form" data-form hidden>
        <label>Provider<select name="provider"></select></label>
        <label>Model<select name="model"></select></label>
        <label>Prompt<textarea name="prompt" rows="4"></textarea></label>
        <label>Negative<textarea name="negativePrompt" rows="2"></textarea></label>
        <fieldset class="kol-forge-fieldset">
          <legend>Transparency</legend>
          <label class="kol-forge-check">
            <input name="transparentBackground" type="checkbox" />
            Request transparent output (Forge processes alpha)
          </label>
        </fieldset>
        <fieldset class="kol-forge-fieldset">
          <legend>Reference image</legend>
          <label>Mode<select name="refMode">
            <option value="none">None</option>
            <option value="artKey">Promoted asset</option>
            <option value="upload">Upload image</option>
          </select></label>
          <div class="kol-forge-ref-section" data-ref-promoted-wrap>
            <div class="kol-forge-ref-section-head">
              <span>Promoted assets</span>
              <select name="refFamily" class="kol-forge-ref-family"></select>
            </div>
            <div class="kol-forge-ref-grid" data-ref-promoted-grid></div>
          </div>
          <div class="kol-forge-ref-section">
            <div class="kol-forge-ref-section-head">
              <span>Session generations</span>
            </div>
            <p class="kol-forge-muted kol-forge-ref-empty" data-ref-session-empty hidden>No variants yet — generate first.</p>
            <div class="kol-forge-ref-grid" data-ref-session-grid></div>
          </div>
          <label data-ref-upload-wrap>Upload<input name="refUpload" type="file" accept="image/png,image/jpeg,image/webp" /></label>
          <label>Strength <span data-ref-strength-label>65%</span>
            <input name="refStrength" type="range" min="0" max="100" value="65" />
          </label>
          <div class="kol-forge-ref-selected">
            <span class="kol-forge-muted" data-ref-selected-label>No reference selected</span>
            <img data-ref-preview class="kol-forge-ref-preview" alt="Reference preview" hidden />
          </div>
          <select name="refArtKey" hidden aria-hidden="true"></select>
        </fieldset>
        <div class="kol-forge-actions">
          <button type="button" data-sync>Sync Specs</button>
          <button type="submit" data-generate data-testid="forge-generate">Generate</button>
          <button type="button" data-promote disabled data-testid="forge-promote">Promote pick</button>
        </div>
      </form>
      <section class="kol-forge-variants" data-variants hidden>
        <h3>Pick version <span data-variant-count></span></h3>
        <div class="kol-forge-variant-grid" data-variant-grid data-testid="forge-variant-grid"></div>
      </section>
      <section class="kol-forge-preview">
        <h3>Selected preview</h3>
        <div class="kol-forge-preview-wrap" data-preview-wrap>
          <img data-preview alt="Forge preview" data-testid="forge-preview" />
          <div class="kol-forge-cell-preview-grid" data-cell-preview-grid data-testid="forge-cell-preview-grid" hidden></div>
        </div>
      </section>
      <section class="kol-forge-log">
        <h3>Stream</h3>
        <pre data-log data-testid="forge-log"></pre>
      </section>
    `;
    mount.appendChild(this.root);
    this.previewImg = this.root.querySelector('[data-preview]') as HTMLImageElement;
    this.previewWrap = this.root.querySelector('[data-preview-wrap]') as HTMLElement;
    this.cellPreviewGrid = this.root.querySelector('[data-cell-preview-grid]') as HTMLElement;
    this.logEl = this.root.querySelector('[data-log]') as HTMLElement;
    this.statusEl = this.root.querySelector('[data-status]') as HTMLElement;
    this.variantGrid = this.root.querySelector('[data-variant-grid]') as HTMLElement;
    this.variantSection = this.root.querySelector('[data-variants]') as HTMLElement;
    this.refPreviewImg = this.root.querySelector('[data-ref-preview]') as HTMLImageElement;
    this.refPromotedWrap = this.root.querySelector('[data-ref-promoted-wrap]') as HTMLElement;
    this.refUploadWrap = this.root.querySelector('[data-ref-upload-wrap]') as HTMLElement;
    this.referencePicker = new ForgeReferencePicker({
      promotedGrid: this.root.querySelector('[data-ref-promoted-grid]') as HTMLElement,
      sessionGrid: this.root.querySelector('[data-ref-session-grid]') as HTMLElement,
      sessionEmptyEl: this.root.querySelector('[data-ref-session-empty]') as HTMLElement,
      familySelect: this.root.querySelector('[name="refFamily"]') as HTMLSelectElement,
      previewImg: this.refPreviewImg,
      selectedLabel: this.root.querySelector('[data-ref-selected-label]') as HTMLElement,
      getScene: this.getScene,
      onSelectionChange: (selection) => this.applyReferenceSelection(selection),
    });
    this.populateSelects();
    this.populateAssetBrowser();
    this.bindForm();
    this.bindPromptAutosave();
    void this.refreshHealth();
  }
  private populateSelects(): void {
    const form = this.root.querySelector('[data-form]') as HTMLFormElement;
    const refArtKey = form.elements.namedItem('refArtKey') as HTMLSelectElement;
    for (const entry of listGfxForgeEntries()) {
      const el = document.createElement('option');
      el.value = entry.artKey;
      el.textContent = entry.artKey;
      refArtKey.appendChild(el);
    }
    const provider = form.elements.namedItem('provider') as HTMLSelectElement;
    provider.addEventListener('change', () => this.refreshModelOptions());
    void this.refreshProviderOptionsForRecipe();
  }

  private activeRecipeId(): ForgeGenerateRequest['recipeId'] {
    return this.request?.recipeId ?? 'kol.item-icon.v1';
  }
  private async refreshProviderCatalog(): Promise<void> {
    try {
      this.forgeProviders = [...await this.forge.listProviders()];
    } catch {
      this.forgeProviders = [...OFFLINE_FORGE_PROVIDERS];
    }
    await this.refreshProviderOptionsForRecipe();
  }
  private async refreshProviderOptionsForRecipe(): Promise<void> {
    if (this.forgeProviders.length === 0) {
      await this.refreshProviderCatalog();
    }
    const form = this.root.querySelector('[data-form]') as HTMLFormElement;
    if (!form || form.hidden) return;
    const recipeId = this.activeRecipeId();
    const providerSelect = form.elements.namedItem('provider') as HTMLSelectElement;
    const previousProvider = providerSelect.value;
    const filtered = filterProvidersForRecipe(this.forgeProviders, recipeId);
    providerSelect.innerHTML = '';
    for (const provider of filtered) {
      const el = document.createElement('option');
      el.value = provider.id;
      el.textContent = provider.label;
      providerSelect.appendChild(el);
    }
    const stillValid = filtered.some((p) => p.id === previousProvider);
    if (stillValid) {
      providerSelect.value = previousProvider;
    } else {
      const defaults = defaultProviderModel(this.forgeProviders, recipeId);
      providerSelect.value = defaults.provider;
    }
    this.refreshModelOptions();
  }
  private populateAssetBrowser(): void {
    const familySelect = this.root.querySelector('[name="gfxFamily"]') as HTMLSelectElement;
    const families = listGfxForgeFamilies();
    familySelect.innerHTML = '';
    for (const family of families) {
      const el = document.createElement('option');
      el.value = family;
      el.textContent = gfxForgeFamilyLabel(family);
      familySelect.appendChild(el);
    }
    familySelect.addEventListener('change', () => this.refreshAssetOptions());
    this.refreshAssetOptions();
    const loadBtn = this.root.querySelector('[data-load-asset]') as HTMLButtonElement;
    loadBtn.addEventListener('click', () => {
      const assetSelect = this.root.querySelector('[name="gfxAsset"]') as HTMLSelectElement;
      const artKey = assetSelect.value;
      if (artKey) this.openForArtKey(artKey);
    });
  }
  private refreshAssetOptions(): void {
    const family = (this.root.querySelector('[name="gfxFamily"]') as HTMLSelectElement).value as GfxForgeFamily;
    const assetSelect = this.root.querySelector('[name="gfxAsset"]') as HTMLSelectElement;
    assetSelect.innerHTML = '';
    for (const entry of listGfxForgeEntriesByFamily(family)) {
      const el = document.createElement('option');
      el.value = entry.artKey;
      el.textContent = `${describeArtKey(entry.artKey)} (${entry.artKey})`;
      assetSelect.appendChild(el);
    }
  }
  private refreshModelOptions(): void {
    const form = this.root.querySelector('[data-form]') as HTMLFormElement;
    const providerId = (form.elements.namedItem('provider') as HTMLSelectElement).value;
    const recipeId = this.activeRecipeId();
    const model = form.elements.namedItem('model') as HTMLSelectElement;
    const previousModel = model.value;
    const provider = filterProvidersForRecipe(this.forgeProviders, recipeId)
      .find((entry) => entry.id === providerId);
    model.innerHTML = '';
    for (const entry of provider?.models ?? []) {
      const el = document.createElement('option');
      el.value = entry.id;
      el.textContent = entry.label;
      model.appendChild(el);
    }
    const modelIds = provider?.models.map((m) => m.id) ?? [];
    if (modelIds.includes(previousModel)) {
      model.value = previousModel;
    } else if (provider?.defaultModel && modelIds.includes(provider.defaultModel)) {
      model.value = provider.defaultModel;
    } else if (modelIds[0]) {
      model.value = modelIds[0];
    }
  }
  private bindForm(): void {
    const form = this.root.querySelector('[data-form]') as HTMLFormElement;
    const syncBtn = this.root.querySelector('[data-sync]') as HTMLButtonElement;
    const promoteBtn = this.root.querySelector('[data-promote]') as HTMLButtonElement;
    const refMode = form.elements.namedItem('refMode') as HTMLSelectElement;
    const refStrength = form.elements.namedItem('refStrength') as HTMLInputElement;
    const refUpload = form.elements.namedItem('refUpload') as HTMLInputElement;
    syncBtn.addEventListener('click', () => {
      void this.handleSync();
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      void this.handleGenerate();
    });
    promoteBtn.addEventListener('click', () => {
      void this.handlePromote();
    });
    refMode.addEventListener('change', () => this.refreshReferenceUi());
    refStrength.addEventListener('input', () => {
      const label = this.root.querySelector('[data-ref-strength-label]') as HTMLElement;
      label.textContent = `${refStrength.value}%`;
    });
    refUpload.addEventListener('change', () => {
      void this.handleReferenceUpload(refUpload);
    });
    this.applyPreviewBackdrop();
    this.refreshReferenceUi();
  }
  private bindPromptAutosave(): void {
    const form = this.root.querySelector('[data-form]') as HTMLFormElement;
    const promptEl = form.elements.namedItem('prompt') as HTMLTextAreaElement;
    const negativeEl = form.elements.namedItem('negativePrompt') as HTMLTextAreaElement;
    const transparentEl = form.elements.namedItem('transparentBackground') as HTMLInputElement;
    this.promptSaveDebounced = debounce(
      () => this.persistPromptDraft(),
      FORGE_PROMPT_SAVE_DEBOUNCE_MS,
    );
    const onEdit = (): void => {
      this.promptSaveDebounced?.schedule();
    };
    promptEl.addEventListener('input', onEdit);
    negativeEl.addEventListener('input', onEdit);
    transparentEl.addEventListener('change', onEdit);
  }
  private persistPromptDraft(): void {
    if (!this.target || !this.request) return;
    const form = this.root.querySelector('[data-form]') as HTMLFormElement;
    const prompt = (form.elements.namedItem('prompt') as HTMLTextAreaElement).value;
    const negativePrompt = (form.elements.namedItem('negativePrompt') as HTMLTextAreaElement).value;
    const transparentBackground = (form.elements.namedItem('transparentBackground') as HTMLInputElement).checked;
    saveForgePromptDraft(this.target.artKey, { prompt, negativePrompt, transparentBackground });
    this.request = { ...this.request, prompt, negativePrompt, transparentBackground };
  }
  private refreshReferencePickerPromoted(): void {
    if (!this.target) return;
    const familySelect = this.root.querySelector('[name="refFamily"]') as HTMLSelectElement;
    const family = familySelect.value as GfxForgeFamily;
    const candidates = buildPromotedReferenceCandidates(
      listGfxForgeEntries(),
      family,
      this.target.artKey,
    );
    this.referencePicker.setPromotedCandidates(candidates);
  }
  private refreshSessionReferenceCandidates(): void {
    const sourceLabel = this.target?.displayName ?? 'Generated';
    const cellLabels = new Map<number, string>();
    if (this.target?.compositeGroup) {
      this.target.compositeGroup.cells.forEach((cell, index) => {
        cellLabels.set(index, cell.label);
      });
    }
    const candidates = buildArtifactReferenceCandidates(this.batchArtifacts, sourceLabel, cellLabels);
    this.referencePicker.setSessionCandidates(candidates);
  }
  private applyReferenceSelection(selection: ForgeReferenceSelection | null): void {
    const form = this.root.querySelector('[data-form]') as HTMLFormElement;
    const refMode = form.elements.namedItem('refMode') as HTMLSelectElement;
    const refArtKey = form.elements.namedItem('refArtKey') as HTMLSelectElement;
    this.referenceUploadDataUrl = null;
    if (!selection) {
      refMode.value = 'none';
      refArtKey.value = '';
      return;
    }
    if (selection.mode === 'artKey') {
      refMode.value = 'artKey';
      refArtKey.value = selection.artKey;
      return;
    }
    refMode.value = 'upload';
    refArtKey.value = '';
    this.referenceUploadDataUrl = selection.dataUrl;
  }
  private refreshReferenceUi(): void {
    const form = this.root.querySelector('[data-form]') as HTMLFormElement;
    const mode = (form.elements.namedItem('refMode') as HTMLSelectElement).value;
    this.refPromotedWrap.hidden = mode !== 'artKey';
    this.refUploadWrap.hidden = mode !== 'upload';
    if (mode === 'none') {
      this.referencePicker.clearSelection(false);
      this.referenceUploadDataUrl = null;
    } else if (mode === 'artKey') {
      this.refreshReferencePickerPromoted();
    }
  }
  private async handleReferenceUpload(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    if (!file) return;
    const dataUrl = await readBlobAsDataUrl(file);
    this.referenceUploadDataUrl = dataUrl;
    this.refPreviewImg.src = dataUrl;
    this.refPreviewImg.hidden = false;
    const label = this.root.querySelector('[data-ref-selected-label]') as HTMLElement;
    label.textContent = file.name;
    const form = this.root.querySelector('[data-form]') as HTMLFormElement;
    (form.elements.namedItem('refMode') as HTMLSelectElement).value = 'upload';
    this.refreshReferenceUi();
  }
  async refreshHealth(): Promise<void> {
    this.forgeOnline = await this.forge.health();
    const imageReady = this.forgeOnline ? await this.forge.imageGenerationReady() : false;
    this.statusEl.textContent = !this.forgeOnline
      ? 'Forge offline — generation unavailable'
      : imageReady
        ? 'Forge online — live generation'
        : 'Forge online — image provider not configured (set FORGE_OPENAI_API_KEY, restart worker)';
    this.statusEl.classList.toggle('online', this.forgeOnline && imageReady);
    this.statusEl.classList.toggle('offline', !this.forgeOnline || !imageReady);
    // Providers first so the form is usable; sync runs in the background.
    await this.refreshProviderCatalog();
    if (this.forgeOnline) {
      void this.backgroundEnsureSynced();
    }
  }

  private async backgroundEnsureSynced(): Promise<void> {
    try {
      const synced = await this.forge.ensureSynced();
      if (synced) {
        this.appendLog('Synced asset specs to Forge');
      }
      if (this.target) {
        void this.restorePendingVariants(this.target);
      }
    } catch (err) {
      this.appendLog(`Sync failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  openForArtKey(artKey: string): void {
    const entry = gfxForgeEntryForArtKey(artKey);
    this.openForGfxTarget({
      artKey: entry.artKey,
      assetId: entry.assetId,
      displayName: entry.displayName,
      family: entry.family,
      ...(entry.compositeGroup !== undefined ? { compositeGroup: entry.compositeGroup } : {}),
    }, buildForgeRequestForGfxEntry(entry));
  }
  openForItem(target: ForgeItemTarget): void {
    const entry = gfxForgeEntryForArtKey(forgeTargetArtKeyForRuntime(target.artKey));
    this.openForGfxTarget(
      {
        ...target,
        artKey: entry.artKey,
        assetId: entry.assetId,
        displayName: entry.displayName,
        family: entry.family,
        ...(entry.compositeGroup !== undefined ? { compositeGroup: entry.compositeGroup } : {}),
      },
      buildForgeRequestForGfxEntry(entry),
    );
  }
  private openForGfxTarget(target: ForgeGfxTarget, request: ForgeGenerateRequest): void {
    this.target = target;
    const promptDraft = mergeForgePromptDraft(target.artKey, {
      prompt: request.prompt,
      negativePrompt: request.negativePrompt,
      transparentBackground: request.transparentBackground,
    });
    this.request = { ...request, ...promptDraft };
    this.batchArtifacts = [];
    this.selectedArtifactId = null;
    this.clearVariantGrid();
    const targetEl = this.root.querySelector('[data-target]') as HTMLElement;
    targetEl.innerHTML = `
      <div class="kol-forge-target-card">
        <strong>${target.displayName}</strong>
        <span>${target.family}${target.slot ? ` · ${target.slot}` : ''}</span>
        <span class="kol-forge-muted">artKey: ${target.artKey}</span>
        <span class="kol-forge-muted">asset: ${target.assetId}</span>
        <span class="kol-forge-muted">recipe: ${request.recipeId}</span>
        <span class="kol-forge-muted">profile: ${request.profileId}</span>
        <span class="kol-forge-muted">size: ${request.width}×${request.height}</span>
        ${target.instanceId ? `<span class="kol-forge-muted">instance: ${target.instanceId}</span>` : ''}
      </div>
    `;
    const form = this.root.querySelector('[data-form]') as HTMLFormElement;
    form.hidden = false;
    this.applyRequestToForm(this.request);
    void this.refreshProviderOptionsForRecipe();
    this.referencePicker.setFamily(target.family as GfxForgeFamily);
    this.refreshReferencePickerPromoted();
    this.refreshSessionReferenceCandidates();
    void this.showTargetPreview(target);
    void this.restorePendingVariants(target);
    this.appendLog(`Opened forge target ${target.artKey}`);
  }
  private async restorePendingVariants(target: ForgeGfxTarget): Promise<void> {
    if (!this.request) return;
    if (!(await this.forge.health())) return;
    try {
      const review = await this.forge.loadPendingReview(this.request);
      if (!review || review.variants.length === 0) return;
      if (this.batchArtifacts.length > 0) return;
      if (review.compositeSliceSet && target.compositeGroup && !target.compositeGroup.sheetPromotionArtKey) {
        const destinationPaths = target.compositeGroup.cells.map((cell) =>
          promotionPathForArtKey(cell.artKey),
        );
        this.batchArtifacts = [{
          artifactId: review.compositeSliceSet.previewArtifactId,
          batchIndex: 0,
          previewUrl: null,
          destinationPath: destinationPaths[0] ?? null,
          mediaKind: review.variants[0]?.mediaKind ?? 'image',
          cellArtifactIds: review.compositeSliceSet.cellArtifactIds,
          destinationPaths,
          cellPreviews: buildCompositeCellPreviews(
            review.compositeSliceSet.cellArtifactIds,
            destinationPaths,
            target.compositeGroup,
          ),
        }];
        this.renderVariantGrid();
        for (const artifact of this.batchArtifacts) {
          void this.hydrateArtifactPreview(artifact, target.artKey);
        }
        this.appendLog('Loaded pending composite set from Forge');
        return;
      }
      this.batchArtifacts = review.variants.map((variant) => ({
        artifactId: variant.artifactId,
        batchIndex: variant.batchIndex,
        previewUrl: null,
        destinationPath: variant.destinationPath,
        mediaKind: variant.mediaKind,
      }));
      this.renderVariantGrid();
      for (const artifact of this.batchArtifacts) {
        void this.hydrateArtifactPreview(artifact, target.artKey);
      }
      this.appendLog(`Loaded ${this.batchArtifacts.length} pending variant(s) from Forge`);
    } catch (err) {
      this.appendLog(`Could not load pending variants: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  clear(): void {
    this.target = null;
    this.request = null;
    this.batchArtifacts = [];
    this.selectedArtifactId = null;
    this.abort?.abort();
    const form = this.root.querySelector('[data-form]') as HTMLFormElement;
    form.hidden = true;
    this.variantSection.hidden = true;
    this.clearVariantGrid();
    const targetEl = this.root.querySelector('[data-target]') as HTMLElement;
    targetEl.innerHTML = '<p class="kol-forge-muted">Browse a gfx slot or tap an inventory item in-game.</p>';
    this.previewImg.removeAttribute('src');
    this.previewImg.hidden = false;
    this.cellPreviewGrid.hidden = true;
    this.cellPreviewGrid.innerHTML = '';
  }
  private applyRequestToForm(request: ForgeGenerateRequest): void {
    const form = this.root.querySelector('[data-form]') as HTMLFormElement;
    (form.elements.namedItem('provider') as HTMLSelectElement).value = request.provider;
    this.refreshModelOptions();
    (form.elements.namedItem('model') as HTMLSelectElement).value = request.model;
    (form.elements.namedItem('prompt') as HTMLTextAreaElement).value = request.prompt;
    (form.elements.namedItem('negativePrompt') as HTMLTextAreaElement).value = request.negativePrompt;
    (form.elements.namedItem('transparentBackground') as HTMLInputElement).checked = request.transparentBackground;
    (form.elements.namedItem('refMode') as HTMLSelectElement).value = request.referenceImage.mode;
    if (request.referenceImage.artKey) {
      (form.elements.namedItem('refArtKey') as HTMLSelectElement).value = request.referenceImage.artKey;
      this.referencePicker.setSelectedArtKey(request.referenceImage.artKey);
    } else if (request.referenceImage.mode === 'upload' && request.referenceImage.dataUrl) {
      this.referenceUploadDataUrl = request.referenceImage.dataUrl;
      this.refPreviewImg.src = request.referenceImage.dataUrl;
      this.refPreviewImg.hidden = false;
      const label = this.root.querySelector('[data-ref-selected-label]') as HTMLElement;
      label.textContent = 'Uploaded reference';
    } else {
      this.referencePicker.clearSelection(false);
      this.referenceUploadDataUrl = null;
      const label = this.root.querySelector('[data-ref-selected-label]') as HTMLElement;
      label.textContent = 'No reference selected';
      this.refPreviewImg.hidden = true;
      this.refPreviewImg.removeAttribute('src');
    }
    (form.elements.namedItem('refStrength') as HTMLInputElement).value = String(Math.round(request.referenceImage.strength * 100));
    const strengthLabel = this.root.querySelector('[data-ref-strength-label]') as HTMLElement;
    strengthLabel.textContent = `${Math.round(request.referenceImage.strength * 100)}%`;
    this.applyPreviewBackdrop();
    this.refreshReferenceUi();
  }
  private readRequestFromForm(): ForgeGenerateRequest {
    if (!this.target || !this.request) {
      throw new Error('No forge target selected');
    }
    const form = this.root.querySelector('[data-form]') as HTMLFormElement;
    const refMode = (form.elements.namedItem('refMode') as HTMLSelectElement).value as ForgeReferenceImage['mode'];
    const refStrengthPct = Number((form.elements.namedItem('refStrength') as HTMLInputElement).value);
    const refUpload = form.elements.namedItem('refUpload') as HTMLInputElement;
    let referenceImage: ForgeReferenceImage = {
      mode: refMode,
      artKey: refMode === 'artKey'
        ? (form.elements.namedItem('refArtKey') as HTMLSelectElement).value || null
        : null,
      dataUrl: refMode === 'upload'
        ? (this.referenceUploadDataUrl
          ?? (this.refPreviewImg.src.startsWith('data:') ? this.refPreviewImg.src : null))
        : null,
      strength: Math.max(0, Math.min(1, refStrengthPct / 100)),
    };
    if (refMode === 'upload' && !referenceImage.dataUrl && refUpload.files?.[0]) {
      throw new Error('Reference upload still loading — try again');
    }
    return {
      ...this.request,
      assetId: this.target.assetId,
      artKey: this.target.artKey,
      provider: (form.elements.namedItem('provider') as HTMLSelectElement).value,
      model: (form.elements.namedItem('model') as HTMLSelectElement).value,
      prompt: (form.elements.namedItem('prompt') as HTMLTextAreaElement).value,
      negativePrompt: (form.elements.namedItem('negativePrompt') as HTMLTextAreaElement).value,
      transparentBackground: (form.elements.namedItem('transparentBackground') as HTMLInputElement).checked,
      referenceImage,
    };
  }

  private applyPreviewBackdrop(): void {
    this.previewWrap.dataset.backdrop = 'checker';
    this.variantGrid.dataset.backdrop = 'checker';
  }
  private appendLog(line: string): void {
    const stamp = new Date().toLocaleTimeString();
    this.logEl.textContent = `${this.logEl.textContent}[${stamp}] ${line}\n`;
    this.logEl.scrollTop = this.logEl.scrollHeight;
  }
  private async handleSync(): Promise<void> {
    const scene = this.getScene();
    if (scene) this.sfx.play(scene, 'ui_click');
    try {
      await this.forge.sync();
      this.appendLog('Synced asset specs to Forge');
    } catch (err) {
      this.appendLog(`Sync failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  private setGenerating(active: boolean): void {
    this.generationInFlight = active;
    const generateBtn = this.root.querySelector('[data-generate]') as HTMLButtonElement;
    generateBtn.disabled = active;
    generateBtn.textContent = active ? 'Generating…' : 'Generate';
  }
  private async handleGenerate(): Promise<void> {
    if (!this.target) return;
    if (this.generationInFlight) {
      this.appendLog('Generation already in progress — wait for variants to appear');
      return;
    }
    const scene = this.getScene();
    if (scene) this.sfx.play(scene, 'forge_generate');
    const generationId = ++this.activeGenerationId;
    this.abort?.abort();
    this.abort = new AbortController();
    const abortSignal = this.abort.signal;
    const request = this.readRequestFromForm();
    this.request = request;
    this.promptSaveDebounced?.flush();
    this.persistPromptDraft();
    const keptVariants = this.batchArtifacts.length;
    const variantOffset = keptVariants;
    const promoteBtn = this.root.querySelector('[data-promote]') as HTMLButtonElement;
    if (keptVariants === 0) {
      this.selectedArtifactId = null;
      this.clearVariantGrid();
      promoteBtn.disabled = true;
    } else {
      this.renderVariantGrid();
    }
    this.setGenerating(true);
    try {
      await this.forge.ensureSynced(request.assetId);
      const result = await this.forge.generate(request);
      const versionLabel = keptVariants > 0
        ? `${request.batchSize} more version(s) (${keptVariants} kept)`
        : `${request.batchSize} version(s)`;
      this.appendLog(`Started execution ${result.executionId} (${versionLabel})`);
      await this.forge.streamEvents(result.executionId, (event) => {
        if (event.event === 'workflow.progress') {
          const data = event.data as { businessState?: string };
          const state = data.businessState ?? 'unknown';
          this.statusEl.textContent = `Forge: generating (${state})`;
          this.appendLog(`Workflow state: ${state}`);
          return;
        }
        this.appendLog(`${event.event} ${JSON.stringify(event.data)}`);
        if (event.event === 'artifact.set.ready') {
          const data = event.data as {
            previewArtifactId?: string;
            cellArtifactIds?: string[];
            destinationPaths?: string[];
            batchIndex?: number;
            mediaKind?: string;
          };
          const previewId = data.previewArtifactId ?? data.cellArtifactIds?.[0];
          if (previewId && data.cellArtifactIds && data.destinationPaths) {
            const cellPreviews = buildCompositeCellPreviews(
              data.cellArtifactIds,
              data.destinationPaths,
              this.target?.compositeGroup,
            );
            const artifact: ForgeBatchArtifact = {
              artifactId: previewId,
              batchIndex: (data.batchIndex ?? 0) + variantOffset,
              previewUrl: null,
              destinationPath: data.destinationPaths[0] ?? null,
              mediaKind: data.mediaKind ?? 'image',
              cellArtifactIds: data.cellArtifactIds,
              destinationPaths: data.destinationPaths,
              cellPreviews,
            };
            this.batchArtifacts.push(artifact);
            void this.hydrateArtifactPreview(artifact, request.artKey);
          }
        } else if (event.event === 'artifact.ready') {
          const data = event.data as {
            artifactId?: string;
            batchIndex?: number;
            destinationPath?: string;
            mediaKind?: string;
          };
          if (data.artifactId) {
            const artifact: ForgeBatchArtifact = {
              artifactId: data.artifactId,
              batchIndex: (data.batchIndex ?? 0) + variantOffset,
              previewUrl: null,
              destinationPath: data.destinationPath ?? null,
              mediaKind: data.mediaKind ?? 'image',
            };
            this.batchArtifacts.push(artifact);
            void this.hydrateArtifactPreview(artifact, request.artKey);
          }
        }
        if (event.event === 'workflow.completed') {
          if (scene) this.sfx.play(scene, 'forge_complete');
          if (this.batchArtifacts.length > 0 && !this.selectedArtifactId) {
            const first = this.batchArtifacts[0]!;
            this.selectArtifact(first.artifactId);
          }
        }
      }, abortSignal);
    } catch (err) {
      if (generationId !== this.activeGenerationId) return;
      if (this.isSupersededGenerationAbort(err, abortSignal)) return;
      this.appendLog(`Generate failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      if (generationId === this.activeGenerationId) {
        this.setGenerating(false);
        void this.refreshHealth();
      }
    }
  }

  private isSupersededGenerationAbort(err: unknown, signal: AbortSignal): boolean {
    if (!signal.aborted) return false;
    if (err instanceof DOMException && err.name === 'AbortError') return true;
    if (err instanceof Error && err.name === 'AbortError') return true;
    const message = err instanceof Error ? err.message : String(err);
    return message.toLowerCase().includes('aborted');
  }
  private async hydrateArtifactPreview(artifact: ForgeBatchArtifact, artKey: string): Promise<void> {
    let updated: ForgeBatchArtifact;
    if (artifact.cellPreviews && artifact.cellPreviews.length > 0) {
      const cellPreviews = await Promise.all(
        artifact.cellPreviews.map(async (cell) => {
          const url = await this.forge.getArtifactPreviewUrl(cell.artifactId);
          const resolved = url ?? await this.placeholderDataUrl(artKey, artifact.batchIndex);
          return { ...cell, previewUrl: resolved };
        }),
      );
      updated = {
        ...artifact,
        cellPreviews,
        previewUrl: cellPreviews.find((cell) => cell.previewUrl)?.previewUrl ?? null,
      };
    } else {
      const url = await this.forge.getArtifactPreviewUrl(artifact.artifactId);
      const resolved = url ?? await this.placeholderDataUrl(artKey, artifact.batchIndex);
      updated = { ...artifact, previewUrl: resolved };
    }
    const idx = this.batchArtifacts.findIndex((a) => a.artifactId === artifact.artifactId);
    if (idx >= 0) this.batchArtifacts[idx] = updated;
    this.renderVariantGrid();
    if (this.batchArtifacts.length === 1) {
      this.selectArtifact(updated.artifactId);
    } else if (this.selectedArtifactId === updated.artifactId) {
      this.renderSelectedPreview(updated);
    }
    const promoteBtn = this.root.querySelector('[data-promote]') as HTMLButtonElement;
    promoteBtn.disabled = false;
    this.refreshSessionReferenceCandidates();
  }
  private async placeholderDataUrl(artKey: string, batchIndex: number): Promise<string> {
    const scene = this.getScene();
    if (!scene) return '';
    ensurePlaceholderTexture(scene, artKey);
    const canvas = scene.textures.get(textureKeyFromArtKey(artKey)).getSourceImage() as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(212, 183, 106, 0.85)';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`v${batchIndex + 1}`, canvas.width / 2, canvas.height / 2 + 5);
    }
    return canvas.toDataURL('image/png');
  }
  private clearVariantGrid(): void {
    this.variantGrid.innerHTML = '';
    this.variantSection.hidden = true;
    const countEl = this.root.querySelector('[data-variant-count]') as HTMLElement;
    countEl.textContent = '';
  }
  private renderVariantGrid(): void {
    if (this.batchArtifacts.length === 0) return;
    this.variantSection.hidden = false;
    const countEl = this.root.querySelector('[data-variant-count]') as HTMLElement;
    countEl.textContent = `(${this.batchArtifacts.length})`;
    this.variantGrid.innerHTML = '';
    const sorted = [...this.batchArtifacts].sort((a, b) => a.batchIndex - b.batchIndex);
    for (const artifact of sorted) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'kol-forge-variant';
      btn.dataset.artifactId = artifact.artifactId;
      const cellLabel = this.target?.compositeGroup?.cells[artifact.batchIndex]?.label;
      const versionLabel = artifact.cellArtifactIds
        ? `Set ${artifact.batchIndex + 1}`
        : (cellLabel ?? `v${artifact.batchIndex + 1}`);
      btn.title = versionLabel;
      if (artifact.artifactId === this.selectedArtifactId) {
        btn.classList.add('selected');
      }
      const img = document.createElement('img');
      img.alt = versionLabel;
      if (artifact.cellPreviews && artifact.cellPreviews.length > 0) {
        const thumbGrid = document.createElement('div');
        thumbGrid.className = 'kol-forge-variant-cells';
        for (const cell of artifact.cellPreviews) {
          const cellImg = document.createElement('img');
          cellImg.alt = cell.label;
          if (cell.previewUrl) cellImg.src = cell.previewUrl;
          thumbGrid.appendChild(cellImg);
        }
        btn.appendChild(thumbGrid);
      } else {
        if (artifact.previewUrl) img.src = artifact.previewUrl;
        btn.appendChild(img);
      }
      const label = document.createElement('span');
      label.textContent = versionLabel;
      btn.appendChild(label);
      btn.addEventListener('click', () => this.selectArtifact(artifact.artifactId));
      this.variantGrid.appendChild(btn);
    }
  }
  private selectArtifact(artifactId: string): void {
    this.selectedArtifactId = artifactId;
    const artifact = this.batchArtifacts.find((a) => a.artifactId === artifactId);
    if (artifact) {
      this.renderSelectedPreview(artifact);
    }
    this.renderVariantGrid();
    const promoteBtn = this.root.querySelector('[data-promote]') as HTMLButtonElement;
    promoteBtn.disabled = false;
    this.appendLog(`Picked ${artifact?.cellArtifactIds ? `set ${artifact.batchIndex + 1}` : `version ${artifact?.batchIndex !== undefined ? artifact.batchIndex + 1 : '?'}`}`);
  }
  private renderSelectedPreview(artifact: ForgeBatchArtifact): void {
    if (artifact.cellPreviews && artifact.cellPreviews.length > 0) {
      this.previewImg.hidden = true;
      this.previewImg.removeAttribute('src');
      this.cellPreviewGrid.hidden = false;
      this.cellPreviewGrid.innerHTML = '';
      for (const cell of artifact.cellPreviews) {
        const card = document.createElement('div');
        card.className = 'kol-forge-cell-preview';
        const img = document.createElement('img');
        img.alt = cell.label;
        if (cell.previewUrl) img.src = cell.previewUrl;
        const label = document.createElement('span');
        label.className = 'kol-forge-cell-preview-label';
        label.textContent = cell.label;
        const path = document.createElement('span');
        path.className = 'kol-forge-cell-preview-path';
        path.textContent = cell.destinationPath;
        card.append(img, label, path);
        this.cellPreviewGrid.appendChild(card);
      }
      return;
    }
    this.cellPreviewGrid.hidden = true;
    this.cellPreviewGrid.innerHTML = '';
    this.previewImg.hidden = false;
    if (artifact.previewUrl) {
      this.previewImg.src = artifact.previewUrl;
    } else {
      this.previewImg.removeAttribute('src');
    }
  }
  private async showTargetPreview(target: ForgeGfxTarget): Promise<void> {
    const previewKey = previewArtKeyForTarget(target);
    if (await ArtResolver.probe(previewKey)) {
      this.showWirePreview([previewKey]);
      return;
    }
    await this.showPlaceholderPreview(previewKey);
  }

  private showWirePreview(artKeys: readonly string[]): void {
    const previewKey = artKeys[0];
    if (!previewKey) return;
    this.cellPreviewGrid.hidden = true;
    this.cellPreviewGrid.innerHTML = '';
    this.previewImg.hidden = false;
    this.previewImg.src = `${artUrlFromKey(previewKey)}?v=${Date.now()}`;
  }

  private async showPlaceholderPreview(artKey: string): Promise<void> {
    this.cellPreviewGrid.hidden = true;
    this.cellPreviewGrid.innerHTML = '';
    this.previewImg.hidden = false;
    const dataUrl = await this.placeholderDataUrl(artKey, 0);
    if (dataUrl) this.previewImg.src = dataUrl;
  }
  private async handlePromote(): Promise<void> {
    if (!this.target || !this.selectedArtifactId) return;
    const scene = this.getScene();
    if (scene) this.sfx.play(scene, 'ui_click');
    const promoteBtn = this.root.querySelector('[data-promote]') as HTMLButtonElement;
    promoteBtn.disabled = true;
    const dest = kolPromotionDestForTarget(this.target);
    const artifact = this.batchArtifacts.find((a) => a.artifactId === this.selectedArtifactId);
    const compositeCells = artifact?.cellArtifactIds && artifact.destinationPaths
      ? { cellArtifactIds: artifact.cellArtifactIds, destinationPaths: artifact.destinationPaths }
      : undefined;
    try {
      await this.forge.promote(this.selectedArtifactId, dest, compositeCells);
      const runtimeKeys = runtimeArtKeysForPromote(this.target);
      if (scene) {
        await applyPromotedArtToScene(scene, runtimeKeys);
        scene.game.events.emit('kol-art-promoted', runtimeKeys);
      }
      void this.showWirePreview(runtimeKeys);
      this.refreshReferencePickerPromoted();
      this.appendLog(
        compositeCells
          ? `Promoted set (${compositeCells.cellArtifactIds.length} cells)`
          : `Promoted ${this.selectedArtifactId} → ${dest}`,
      );
    } catch (err) {
      this.appendLog(`Promote failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      promoteBtn.disabled = !this.selectedArtifactId;
    }
  }
  destroy(): void {
    this.promptSaveDebounced?.flush();
    this.promptSaveDebounced?.cancel();
    this.abort?.abort();
    this.root.remove();
  }
}
