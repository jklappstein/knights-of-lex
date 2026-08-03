import type { HexCoord } from '@kol/shared-types';
import type { FoundationalSymbol } from '@kol/shared-types';

export interface LexiconTile {
  readonly coord: HexCoord;
  readonly letter: string;
  readonly combatSymbol: FoundationalSymbol;
}

export interface LexiconRuntime {
  isValidWord(word: string): boolean;
  normalizeWord(word: string): string;
  getSemanticTags(word: string): readonly string[];
  findWordsOnBoard(
    tiles: readonly LexiconTile[],
    minLength: number,
    usedWords: ReadonlySet<string>,
  ): readonly { word: string; path: readonly HexCoord[] }[];
}

interface TrieNode {
  children: Map<string, TrieNode>;
  isWord: boolean;
}

function createTrieNode(): TrieNode {
  return { children: new Map(), isWord: false };
}

function insertWord(root: TrieNode, word: string): void {
  let node = root;
  for (const char of word) {
    let child = node.children.get(char);
    if (!child) {
      child = createTrieNode();
      node.children.set(char, child);
    }
    node = child;
  }
  node.isWord = true;
}

const HEX_DIRECTIONS: readonly HexCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

function coordKey(coord: HexCoord): string {
  return `${coord.q},${coord.r}`;
}

function getNeighbors(coord: HexCoord): readonly HexCoord[] {
  return HEX_DIRECTIONS.map((dir) => ({ q: coord.q + dir.q, r: coord.r + dir.r }));
}

export function createLexiconRuntime(
  words: readonly string[],
  semanticAffinities: Readonly<Record<string, readonly string[]>>,
): LexiconRuntime {
  const root = createTrieNode();
  const normalizedWords = new Set<string>();

  for (const word of words) {
    const normalized = word.toUpperCase().trim();
    if (normalized.length >= 3) {
      insertWord(root, normalized);
      normalizedWords.add(normalized);
    }
  }

  function isValidWord(word: string): boolean {
    return normalizedWords.has(normalizeWord(word));
  }

  function normalizeWord(word: string): string {
    return word.toUpperCase().trim();
  }

  function getSemanticTags(word: string): readonly string[] {
    return semanticAffinities[normalizeWord(word)] ?? [];
  }

  function findWordsOnBoard(
    tiles: readonly LexiconTile[],
    minLength: number,
    usedWords: ReadonlySet<string>,
  ): readonly { word: string; path: readonly HexCoord[] }[] {
    const tileMap = new Map<string, LexiconTile>();
    for (const tile of tiles) {
      tileMap.set(coordKey(tile.coord), tile);
    }

    const results: { word: string; path: readonly HexCoord[] }[] = [];

    function dfs(
      coord: HexCoord,
      path: HexCoord[],
      letters: string,
      visited: Set<string>,
      node: TrieNode,
    ): void {
      const key = coordKey(coord);
      if (visited.has(key)) return;

      const tile = tileMap.get(key);
      if (!tile) return;

      const nextLetters = letters + tile.letter;
      const child = node.children.get(tile.letter);
      if (!child) return;

      const nextPath = [...path, coord];
      const nextVisited = new Set(visited);
      nextVisited.add(key);

      if (child.isWord && nextLetters.length >= minLength && !usedWords.has(nextLetters)) {
        results.push({ word: nextLetters, path: nextPath });
      }

      for (const neighbor of getNeighbors(coord)) {
        dfs(neighbor, nextPath, nextLetters, nextVisited, child);
      }
    }

    for (const tile of tiles) {
      dfs(tile.coord, [], '', new Set(), root);
    }

    return results.sort((a, b) => b.word.length - a.word.length);
  }

  return { isValidWord, normalizeWord, getSemanticTags, findWordsOnBoard };
}

export const DEFAULT_WORDS: readonly string[] = [
  'CAT', 'DOG', 'RAT', 'BAT', 'HAT', 'MAT', 'SAT', 'FAT', 'PAT', 'VAT',
  'CAR', 'BAR', 'FAR', 'JAR', 'TAR', 'WAR', 'MAR', 'PAR',
  'ART', 'ANT', 'ACT', 'ACE', 'ARC', 'ARM', 'ASH', 'ASK', 'ATE', 'AWE',
  'BED', 'BEG', 'BET', 'BIG', 'BIT', 'BOX', 'BOY', 'BUS', 'BUY', 'BUT',
  'CAB', 'CAN', 'CAP', 'COP', 'COT', 'COW', 'CRY', 'CUB', 'CUP', 'CUT',
  'DAM', 'DAY', 'DEN', 'DEW', 'DID', 'DIE', 'DIG', 'DIM', 'DIP', 'DOC',
  'EAR', 'EAT', 'EEL', 'EGG', 'ELF', 'ELK', 'ELM', 'END', 'ERA', 'EVE',
  'EYE', 'FAN', 'FAX', 'FED', 'FEE', 'FEW', 'FIG', 'FIN', 'FIR', 'FIT',
  'FIX', 'FLU', 'FLY', 'FOE', 'FOG', 'FOP', 'FOR', 'FOX', 'FRY', 'FUN',
  'FUR', 'GAB', 'GAG', 'GAP', 'GAS', 'GAY', 'GEL', 'GEM', 'GET', 'GIG',
  'GIN', 'GNU', 'GOB', 'GOD', 'GOT', 'GUM', 'GUN', 'GUT', 'GUY', 'GYM',
  'HAD', 'HAG', 'HAM', 'HAS', 'HAY', 'HEM', 'HEN', 'HER', 'HEW', 'HEX',
  'HID', 'HIM', 'HIP', 'HIS', 'HIT', 'HOB', 'HOD', 'HOG', 'HOP', 'HOT',
  'HOW', 'HUB', 'HUE', 'HUG', 'HUM', 'HUT', 'ICE', 'ICY', 'ILL', 'IMP',
  'INK', 'INN', 'ION', 'IRE', 'IRK', 'IVY', 'JAB', 'JAG', 'JAM', 'JAR',
  'JAW', 'JAY', 'JET', 'JIG', 'JOB', 'JOG', 'JOT', 'JOY', 'JUG', 'JUT',
  'KEG', 'KEN', 'KEY', 'KID', 'KIN', 'KIT', 'LAB', 'LAD', 'LAG', 'LAP',
  'LAW', 'LAX', 'LAY', 'LED', 'LEG', 'LET', 'LID', 'LIE', 'LIP', 'LIT',
  'LOG', 'LOT', 'LOW', 'LUG', 'MAD', 'MAN', 'MAP', 'MAW', 'MAY', 'MEN',
  'MET', 'MID', 'MIX', 'MOB', 'MOD', 'MOP', 'MOW', 'MUD', 'MUG', 'NAB',
  'NAG', 'NAP', 'NET', 'NEW', 'NIB', 'NIL', 'NIP', 'NIT', 'NOD', 'NOR',
  'NOT', 'NOW', 'NUB', 'NUN', 'NUT', 'OAF', 'OAK', 'OAR', 'OAT', 'ODD',
  'ODE', 'OFF', 'OFT', 'OHM', 'OIL', 'OLD', 'ONE', 'OPT', 'ORB', 'ORE',
  'OUR', 'OUT', 'OWE', 'OWL', 'OWN', 'PAD', 'PAL', 'PAN', 'PAP', 'PAT',
  'PAW', 'PAY', 'PEA', 'PEG', 'PEN', 'PEP', 'PER', 'PET', 'PEW', 'PIE',
  'PIG', 'PIN', 'PIT', 'PLY', 'POD', 'POP', 'POT', 'POW', 'PRO', 'PRY',
  'PUB', 'PUG', 'PUN', 'PUP', 'PUT', 'RAG', 'RAM', 'RAN', 'RAP', 'RAW',
  'RAY', 'RED', 'REP', 'RIB', 'RID', 'RIG', 'RIM', 'RIP', 'ROB', 'ROD',
  'ROT', 'ROW', 'RUB', 'RUG', 'RUM', 'RUN', 'RUT', 'RYE', 'SAC', 'SAD',
  'SAG', 'SAP', 'SAW', 'SAY', 'SEA', 'SET', 'SEW', 'SHE', 'SHY', 'SIN',
  'SIP', 'SIR', 'SIT', 'SIX', 'SKI', 'SKY', 'SLY', 'SOB', 'SOD', 'SON',
  'SOP', 'SOT', 'SOW', 'SOY', 'SPA', 'SPY', 'SUB', 'SUM', 'SUN', 'SUP',
  'TAB', 'TAD', 'TAG', 'TAN', 'TAP', 'TAX', 'TEA', 'TEN', 'THE', 'TIE',
  'TIN', 'TIP', 'TOE', 'TON', 'TOO', 'TOP', 'TOT', 'TOW', 'TOY', 'TRY',
  'TUB', 'TUG', 'TUN', 'TWO', 'URN', 'USE', 'VAN', 'VAT', 'VET', 'VIA',
  'VIE', 'VOW', 'WAD', 'WAG', 'WAN', 'WAR', 'WAS', 'WAX', 'WAY', 'WEB',
  'WED', 'WET', 'WHO', 'WHY', 'WIG', 'WIN', 'WIT', 'WOE', 'WOK', 'WON',
  'WOO', 'WOW', 'YAK', 'YAM', 'YAP', 'YAW', 'YEA', 'YES', 'YET', 'YEW',
  'YON', 'YOU', 'ZAP', 'ZED', 'ZEN', 'ZIP', 'ZIT', 'ZOO',
  'HELLO', 'WORLD', 'GUARD', 'SHIELD', 'HELM', 'BLOCK', 'WARD', 'PROTECT',
  'STRIKE', 'HEAL', 'SPARK', 'SHOT', 'BLADE', 'ARROW', 'MAGIC', 'LIGHT',
  'STORM', 'FLAME', 'FROST', 'POWER', 'GLORY', 'HONOR', 'BRAVE', 'MIGHT',
  'CLEAN', 'CLEAR', 'CRANE', 'CRATE', 'GRACE', 'GRAND', 'GREAT', 'GREEN',
  'HEART', 'HERO', 'HORSE', 'HOUSE', 'KNIFE', 'KNIGHT', 'LEARN', 'LEAST',
  'LEMON', 'LEVEL', 'LIGHT', 'LUNCH', 'MAGIC', 'MAJOR', 'MARCH', 'MATCH',
  'MERCY', 'METAL', 'MIGHT', 'MINOR', 'MONEY', 'MORAL', 'MOTOR', 'MOUNT',
  'MOUSE', 'MOUTH', 'MOVIE', 'MUSIC', 'NIGHT', 'NOBLE', 'NORTH', 'NOTED',
  'OCEAN', 'OFFER', 'OFTEN', 'ORDER', 'OTHER', 'OUGHT', 'PAINT', 'PANEL',
  'PAPER', 'PARTY', 'PEACE', 'PHASE', 'PHONE', 'PHOTO', 'PIANO', 'PIECE',
  'PILOT', 'PITCH', 'PLACE', 'PLAIN', 'PLANE', 'PLANT', 'PLATE', 'POINT',
  'POUND', 'POWER', 'PRESS', 'PRICE', 'PRIDE', 'PRIME', 'PRINT', 'PRIOR',
  'PRIZE', 'PROOF', 'PROUD', 'PROVE', 'QUEEN', 'QUICK', 'QUIET', 'QUITE',
  'RADIO', 'RAISE', 'RANGE', 'RAPID', 'RATIO', 'REACH', 'READY', 'REFER',
  'RIGHT', 'RIVAL', 'RIVER', 'ROBIN', 'ROGER', 'ROMAN', 'ROUGH', 'ROUND',
  'ROUTE', 'ROYAL', 'RURAL', 'SALAD', 'SALES', 'SALON', 'SAUCE', 'SAVED',
  'SCALE', 'SCENE', 'SCOPE', 'SCORE', 'SENSE', 'SERVE', 'SEVEN', 'SHADE',
  'SHAKE', 'SHALL', 'SHAME', 'SHAPE', 'SHARE', 'SHARP', 'SHEET', 'SHELF',
  'SHELL', 'SHIFT', 'SHINE', 'SHIRT', 'SHOCK', 'SHOOT', 'SHORT', 'SHOWN',
  'SIGHT', 'SINCE', 'SIXTH', 'SIXTY', 'SIZED', 'SKILL', 'SLEEP', 'SLIDE',
  'SMALL', 'SMART', 'SMILE', 'SMOKE', 'SOLID', 'SOLVE', 'SORRY', 'SOUND',
  'SOUTH', 'SPACE', 'SPARE', 'SPEAK', 'SPEED', 'SPEND', 'SPENT', 'SPLIT',
  'SPOKE', 'SPORT', 'STAFF', 'STAGE', 'STAKE', 'STAND', 'START', 'STATE',
  'STEAM', 'STEEL', 'STICK', 'STILL', 'STOCK', 'STONE', 'STOOD', 'STORE',
  'STORM', 'STORY', 'STRIP', 'STUCK', 'STUDY', 'STUFF', 'STYLE', 'SUGAR',
  'SUITE', 'SUPER', 'SWEET', 'TABLE', 'TAKEN', 'TASTE', 'TAXES', 'TEACH',
  'TEETH', 'TERRY', 'TEXAS', 'THANK', 'THEFT', 'THEIR', 'THEME', 'THERE',
  'THESE', 'THICK', 'THING', 'THINK', 'THIRD', 'THOSE', 'THREE', 'THREW',
  'THROW', 'THUMB', 'TIGHT', 'TIRED', 'TITLE', 'TODAY', 'TOPIC', 'TOTAL',
  'TOUCH', 'TOUGH', 'TOWER', 'TRACK', 'TRADE', 'TRAIN', 'TREAT', 'TREND',
  'TRIAL', 'TRIBE', 'TRICK', 'TRIED', 'TRIES', 'TROOP', 'TRUCK', 'TRULY',
  'TRUNK', 'TRUST', 'TRUTH', 'TWICE', 'UNCLE', 'UNDER', 'UNDUE', 'UNION',
  'UNITY', 'UNTIL', 'UPPER', 'UPSET', 'URBAN', 'USAGE', 'USUAL', 'VALID',
  'VALUE', 'VIDEO', 'VIRUS', 'VISIT', 'VITAL', 'VOCAL', 'VOICE', 'WASTE',
  'WATCH', 'WATER', 'WHEEL', 'WHERE', 'WHICH', 'WHILE', 'WHITE', 'WHOLE',
  'WHOSE', 'WOMAN', 'WOMEN', 'WORLD', 'WORRY', 'WORSE', 'WORST', 'WORTH',
  'WOULD', 'WOUND', 'WRITE', 'WRONG', 'WROTE', 'YIELD', 'YOUNG', 'YOUTH',
];

export const DEFAULT_SEMANTIC_AFFINITIES: Readonly<Record<string, readonly string[]>> = {
  GUARD: ['guard_word'],
  SHIELD: ['guard_word'],
  HELM: ['guard_word'],
  BLOCK: ['guard_word'],
  WARD: ['guard_word'],
  PROTECT: ['guard_word'],
  HELLO: ['greeting_word'],
  WORLD: ['nature_word'],
};
