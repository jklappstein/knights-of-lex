export const UiTheme = {
  bg: 0x0f1419,
  panel: 0x1a2332,
  panelBorder: 0x2d3f5a,
  textPrimary: '#f0e6d3',
  textSecondary: '#a89f91',
  textMuted: '#6b7a8d',
  accent: '#4ecdc4',
  accentGold: '#c9a959',
  danger: '#e74c3c',
  success: '#2ecc71',
  heroTint: '#4ecdc4',
  enemyTint: '#e67e22',
  bossTint: '#e74c3c',
  hexFill: 0x243044,
  hexFillActive: 0x2a5a6a,
  hexFillTrace: 0x3a8a9a,
  hexStroke: 0x4a6080,
  fontTitle: 'Georgia, serif',
  fontBody: 'Segoe UI, system-ui, sans-serif',
  fontMono: 'Consolas, monospace',
} as const;

export const Layout = {
  heroPanelX: 12,
  heroPanelW: 155,
  enemyPanelX: 223,
  enemyPanelW: 155,
  combatTop: 52,
  combatHeight: 200,
  boardCenterY: 520,
  boardLabelY: 340,
  wordPreviewY: 370,
  actionBarY: 720,
  toastY: 280,
} as const;

export const SymbolColors: Record<string, number> = {
  strike: 0xe74c3c,
  shot: 0x3498db,
  spark: 0x9b59b6,
  guard: 0x2ecc71,
  heal: 0xf1c40f,
};

export const SymbolGlyphs: Record<string, string> = {
  strike: '⚔',
  shot: '◈',
  spark: '✦',
  guard: '⛨',
  heal: '✚',
};
