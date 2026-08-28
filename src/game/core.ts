/**
 * СОКРОВИЩА ЧЁРНОГО КОТА — ядро игровой математики
 * ---------------------------------------------------
 * 5 барабанов × 3 ряда, 20 линий, выплаты слева направо от 1-го барабана.
 * Вся случайность — через взвешенные ленты барабанов (reel strips),
 * как в настоящих автоматах, а не через «выбрать случайный символ».
 * Это даёт правильное распределение выигрышей: долгие спокойные серии
 * и редкие крупные заходы.
 *
 * Файл чистый: никакого React, никакого DOM. Только логика.
 */

// ─────────────────────────────────────────────────────────────
// СИМВОЛЫ
// ─────────────────────────────────────────────────────────────

export type SymbolId =
  | 'black_cat'   // чёрный кот — старший символ
  | 'white_cat'   // белая кошечка
  | 'ginger_cat'  // рыжий кот
  | 'kitten'      // чёрно-белый котёнок
  | 'fish'        // рыбка
  | 'mouse'       // мышка
  | 'A' | 'K' | 'Q' | 'J' | '10'
  | 'wild'        // корзинка — вайлд
  | 'scatter';    // самоцвет — скаттер

export interface SymbolMeta {
  id: SymbolId;
  /** Название для таблицы выплат */
  title: string;
  /** Выплаты за 3, 4, 5 в линию. Множитель ставки на линию. */
  pays: { 3: number; 4: number; 5: number };
  /** Имя файла в public/symbols. Полный путь собирает asset(). */
  art: string;
}

export const SYMBOLS: Record<SymbolId, SymbolMeta> = {
  black_cat:  { id: 'black_cat',  title: 'Чёрный кот',       pays: { 3: 28, 4: 100, 5:  330 }, art: 'symbols/black_cat.png' },
  white_cat:  { id: 'white_cat',  title: 'Белая кошечка',    pays: { 3: 22, 4:  80, 5:  265 }, art: 'symbols/white_cat.png' },
  ginger_cat: { id: 'ginger_cat', title: 'Рыжий кот',        pays: { 3: 18, 4:  62, 5:  210 }, art: 'symbols/ginger_cat.png' },
  kitten:     { id: 'kitten',     title: 'Котёнок',          pays: { 3: 14, 4:  46, 5:  165 }, art: 'symbols/kitten.png' },
  fish:       { id: 'fish',       title: 'Рыбка',            pays: { 3:   9, 4:  30, 5:   100 }, art: 'symbols/fish.png' },
  mouse:      { id: 'mouse',      title: 'Мышка',            pays: { 3:   8, 4:  24, 5:    78 }, art: 'symbols/mouse.png' },
  A:          { id: 'A',          title: 'Туз',              pays: { 3:   7, 4:  19, 5:    55 }, art: 'symbols/a.png' },
  K:          { id: 'K',          title: 'Король',           pays: { 3:   7, 4:  19, 5:    55 }, art: 'symbols/k.png' },
  Q:          { id: 'Q',          title: 'Дама',             pays: { 3:   6, 4:  14, 5:    42 }, art: 'symbols/q.png' },
  J:          { id: 'J',          title: 'Валет',            pays: { 3:   6, 4:  14, 5:    42 }, art: 'symbols/j.png' },
  '10':       { id: '10',         title: 'Десятка',          pays: { 3:   4, 4:  12, 5:    33 }, art: 'symbols/10.png' },
  wild:       { id: 'wild',       title: 'Корзинка (вайлд)', pays: { 3:  0, 4:  0, 5:   0 }, art: 'symbols/wild.png' },
  scatter:    { id: 'scatter',    title: 'Самоцвет',         pays: { 3:   2, 4:  11, 5:    55 }, art: 'symbols/scatter.png' },
};

/** Порядок вывода в таблице выплат — от старших к младшим. */
export const PAYTABLE_ORDER: SymbolId[] = [
  'black_cat', 'white_cat', 'ginger_cat', 'kitten',
  'fish', 'mouse', 'A', 'K', 'Q', 'J', '10', 'scatter',
];

// ─────────────────────────────────────────────────────────────
// ГЕОМЕТРИЯ
// ─────────────────────────────────────────────────────────────

export const REEL_COUNT = 5;
export const ROW_COUNT = 3;
export const LINE_COUNT = 20;

// ─────────────────────────────────────────────────────────────
// ТАЙМИНГИ АНИМАЦИИ
// ─────────────────────────────────────────────────────────────

/**
 * Длительность прокрутки первого барабана и добавка на каждый следующий.
 * Последний барабан встаёт через SPIN_BASE_MS + 4 × REEL_STAGGER_MS.
 * Эти же числа использует игровой цикл, чтобы звук совпадал с картинкой.
 */
export const SPIN_BASE_MS = 850;
export const REEL_STAGGER_MS = 190;

export const SPIN_TOTAL_MS = SPIN_BASE_MS + (REEL_COUNT - 1) * REEL_STAGGER_MS;

/** Ставка на спин = betPerLine × 20. В UI показываем именно общую ставку. */
export const BET_STEPS = [20, 40, 60, 100, 200, 400, 600, 1000, 2000, 4000];

/**
 * 20 линий выплат. Каждая линия — ряд для каждого из 5 барабанов.
 * Ряды: 0 — верхний, 1 — средний, 2 — нижний.
 */
export const PAYLINES: readonly (readonly number[])[] = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [0, 0, 1, 0, 0],
  [2, 2, 1, 2, 2],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [1, 0, 1, 0, 1],
  [1, 2, 1, 2, 1],
  [0, 1, 0, 1, 0],
  [2, 1, 2, 1, 2],
  [1, 1, 0, 1, 1],
  [1, 1, 2, 1, 1],
  [0, 0, 2, 0, 0],
  [2, 2, 0, 2, 2],
  [0, 2, 0, 2, 0],
  [2, 0, 2, 0, 2],
  [0, 2, 2, 2, 0],
] as const;

/** Цвет линии для подсветки выигрыша — 20 различимых оттенков. */
export const LINE_COLORS: readonly string[] = [
  '#ffd447', '#7ee787', '#79c0ff', '#ff9ecd', '#c39bff',
  '#ffa657', '#5fe3d0', '#ff7b72', '#a5d6ff', '#e3b341',
  '#8ddb8c', '#b392f0', '#ffb3c7', '#6ee7f0', '#ffcc80',
  '#9be9a8', '#d2a8ff', '#f0883e', '#7fd1f7', '#ffe07a',
];

// ─────────────────────────────────────────────────────────────
// ЛЕНТЫ БАРАБАНОВ
// ─────────────────────────────────────────────────────────────

/**
 * Разворачивает описание {символ: количество} в перемешанную ленту.
 * Перемешивание детерминированное по seed — ленты одинаковы при каждом
 * запуске приложения, но выглядят естественно вперемешку.
 */
function buildStrip(weights: Partial<Record<SymbolId, number>>, seed: number): SymbolId[] {
  const strip: SymbolId[] = [];
  for (const [id, count] of Object.entries(weights) as [SymbolId, number][]) {
    for (let i = 0; i < count; i++) strip.push(id);
  }
  // Fisher–Yates с простым LCG — чтобы одинаковые символы не липли подряд
  let state = seed;
  const rnd = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  for (let i = strip.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [strip[i], strip[j]] = [strip[j], strip[i]];
  }
  return strip;
}

/**
 * Вайлд стоит только на барабанах 2, 3, 4 — классическая схема.
 * Скаттер есть на всех барабанах, но редко.
 */
export const BASE_REELS: SymbolId[][] = [
  buildStrip({ black_cat: 1, white_cat: 2, ginger_cat: 3, kitten: 4, fish: 6, mouse: 6, A: 9, K: 9, Q: 10, J: 10, '10': 11, scatter: 2 }, 11),
  buildStrip({ black_cat: 1, white_cat: 2, ginger_cat: 3, kitten: 4, fish: 6, mouse: 6, A: 9, K: 9, Q: 10, J: 10, '10': 11, scatter: 2, wild: 5 }, 22),
  buildStrip({ black_cat: 1, white_cat: 2, ginger_cat: 3, kitten: 4, fish: 6, mouse: 6, A: 9, K: 9, Q: 10, J: 10, '10': 11, scatter: 2, wild: 5 }, 33),
  buildStrip({ black_cat: 1, white_cat: 2, ginger_cat: 3, kitten: 4, fish: 6, mouse: 6, A: 9, K: 9, Q: 10, J: 10, '10': 11, scatter: 2, wild: 5 }, 44),
  buildStrip({ black_cat: 1, white_cat: 2, ginger_cat: 3, kitten: 4, fish: 6, mouse: 6, A: 9, K: 9, Q: 10, J: 10, '10': 11, scatter: 2 }, 55),
];

/**
 * Во фриспинах вайлдов заметно больше — отсюда и берётся почти половина
 * всех выплат игры. Липкие вайлды делают серию заметно живее.
 */
export const FREE_REELS: SymbolId[][] = [
  buildStrip({ black_cat: 2, white_cat: 3, ginger_cat: 4, kitten: 5, fish: 6, mouse: 6, A: 8, K: 8, Q: 9, J: 9, '10': 10, scatter: 1 }, 511),
  buildStrip({ black_cat: 2, white_cat: 3, ginger_cat: 4, kitten: 5, fish: 6, mouse: 6, A: 8, K: 8, Q: 9, J: 9, '10': 10, scatter: 1, wild: 5 }, 522),
  buildStrip({ black_cat: 2, white_cat: 3, ginger_cat: 4, kitten: 5, fish: 6, mouse: 6, A: 8, K: 8, Q: 9, J: 9, '10': 10, scatter: 1, wild: 5 }, 533),
  buildStrip({ black_cat: 2, white_cat: 3, ginger_cat: 4, kitten: 5, fish: 6, mouse: 6, A: 8, K: 8, Q: 9, J: 9, '10': 10, scatter: 1, wild: 5 }, 544),
  buildStrip({ black_cat: 2, white_cat: 3, ginger_cat: 4, kitten: 5, fish: 6, mouse: 6, A: 8, K: 8, Q: 9, J: 9, '10': 10, scatter: 1 }, 555),
];

// ─────────────────────────────────────────────────────────────
// РЕЗУЛЬТАТ СПИНА
// ─────────────────────────────────────────────────────────────

/** Одна ячейка сетки. */
export interface Cell {
  symbol: SymbolId;
  /** Множитель вайлда: 2 или 3. Для остальных символов — 1. */
  multiplier: number;
  /** Липкий вайлд, оставшийся с прошлого фриспина. */
  sticky: boolean;
}

/** Сетка 5×3: grid[reel][row] */
export type Grid = Cell[][];

export interface LineWin {
  lineIndex: number;
  symbol: SymbolId;
  count: 3 | 4 | 5;
  /** Множитель от вайлдов, участвующих в комбинации. */
  multiplier: number;
  /** Выигрыш в монетах. */
  amount: number;
  /** Координаты выигрышных ячеек: [reel, row][] */
  cells: [number, number][];
}

export interface SpinResult {
  grid: Grid;
  lineWins: LineWin[];
  /** Количество скаттеров на поле. */
  scatterCount: number;
  /** Выплата за скаттеры (умножается на общую ставку, не на линию). */
  scatterWin: number;
  /** Сколько фриспинов запущено этим спином. 0 — не запущены. */
  freeSpinsAwarded: number;
  /** Общий выигрыш спина в монетах. */
  totalWin: number;
}

// ─────────────────────────────────────────────────────────────
// ГЕНЕРАЦИЯ СЕТКИ
// ─────────────────────────────────────────────────────────────

/** Криптостойкий источник случайности с запасным вариантом. */
function random(): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] / 4294967296;
  }
  return Math.random();
}

/** Вайлд получает множитель ×2 или ×3. ×3 выпадает реже. */
function rollWildMultiplier(): number {
  return random() < 0.3 ? 3 : 2;
}

/**
 * Прокручивает барабаны и собирает сетку.
 * stickyWilds — карта позиций «reel:row» → множитель, для фриспинов.
 */
export function spinGrid(
  reels: SymbolId[][],
  stickyWilds?: Map<string, number>,
): Grid {
  const grid: Grid = [];

  for (let reel = 0; reel < REEL_COUNT; reel++) {
    const strip = reels[reel];
    const stop = Math.floor(random() * strip.length);
    const column: Cell[] = [];

    for (let row = 0; row < ROW_COUNT; row++) {
      const key = `${reel}:${row}`;
      const stuck = stickyWilds?.get(key);

      if (stuck !== undefined) {
        column.push({ symbol: 'wild', multiplier: stuck, sticky: true });
        continue;
      }

      const symbol = strip[(stop + row) % strip.length];
      column.push({
        symbol,
        multiplier: symbol === 'wild' ? rollWildMultiplier() : 1,
        sticky: false,
      });
    }
    grid.push(column);
  }
  return grid;
}

// ─────────────────────────────────────────────────────────────
// ОЦЕНКА ВЫИГРЫША
// ─────────────────────────────────────────────────────────────

/**
 * Считает выигрыш по одной линии.
 * Правило: комбинация читается слева направо начиная с 1-го барабана.
 * Вайлд подменяет любой символ кроме скаттера и умножает всю линию.
 * Если линия начинается с вайлдов, базовым символом становится первый
 * не-вайлд — это стандартное и более щедрое для игрока правило.
 */
function evaluateLine(grid: Grid, lineIndex: number, betPerLine: number): LineWin | null {
  const line = PAYLINES[lineIndex];
  const cells: [number, number][] = [];
  let baseSymbol: SymbolId | null = null;
  let multiplier = 1;
  let count = 0;

  for (let reel = 0; reel < REEL_COUNT; reel++) {
    const row = line[reel];
    const cell = grid[reel][row];

    if (cell.symbol === 'scatter') break;

    if (cell.symbol === 'wild') {
      // Множители не перемножаются, а берётся наибольший — иначе три
      // вайлда ×3 давали бы ×27 и ломали всю математику автомата.
      multiplier = Math.max(multiplier, cell.multiplier);
      cells.push([reel, row]);
      count++;
      continue;
    }

    if (baseSymbol === null) {
      baseSymbol = cell.symbol;
      cells.push([reel, row]);
      count++;
      continue;
    }

    if (cell.symbol === baseSymbol) {
      cells.push([reel, row]);
      count++;
      continue;
    }
    break;
  }

  // Только вайлды на линии — платим по старшему символу
  if (baseSymbol === null && count >= 3) baseSymbol = 'black_cat';
  if (baseSymbol === null || count < 3) return null;

  const pay = SYMBOLS[baseSymbol].pays[count as 3 | 4 | 5];
  if (!pay) return null;

  return {
    lineIndex,
    symbol: baseSymbol,
    count: count as 3 | 4 | 5,
    multiplier,
    amount: pay * betPerLine * multiplier,
    cells: cells.slice(0, count),
  };
}

/** Сколько фриспинов даёт то или иное количество скаттеров. */
function freeSpinsFor(scatterCount: number): number {
  if (scatterCount >= 5) return 20;
  if (scatterCount === 4) return 12;
  if (scatterCount === 3) return 8;
  return 0;
}

/**
 * Полная оценка сетки.
 * betPerLine — ставка на одну линию (общая ставка ÷ 20).
 */
export function evaluateGrid(grid: Grid, betPerLine: number): Omit<SpinResult, 'grid'> {
  const lineWins: LineWin[] = [];

  for (let i = 0; i < LINE_COUNT; i++) {
    const win = evaluateLine(grid, i, betPerLine);
    if (win) lineWins.push(win);
  }

  let scatterCount = 0;
  for (let reel = 0; reel < REEL_COUNT; reel++) {
    for (let row = 0; row < ROW_COUNT; row++) {
      if (grid[reel][row].symbol === 'scatter') scatterCount++;
    }
  }

  const totalBet = betPerLine * LINE_COUNT;
  const scatterPay = scatterCount >= 3
    ? SYMBOLS.scatter.pays[Math.min(scatterCount, 5) as 3 | 4 | 5]
    : 0;
  const scatterWin = scatterPay * totalBet;

  const lineTotal = lineWins.reduce((sum, w) => sum + w.amount, 0);

  return {
    lineWins,
    scatterCount,
    scatterWin,
    freeSpinsAwarded: freeSpinsFor(scatterCount),
    totalWin: lineTotal + scatterWin,
  };
}

/** Один обычный спин. */
export function spin(betPerLine: number): SpinResult {
  const grid = spinGrid(BASE_REELS);
  return { grid, ...evaluateGrid(grid, betPerLine) };
}

/** Один фриспин. Липкие вайлды переносятся из предыдущего. */
export function freeSpin(
  betPerLine: number,
  stickyWilds: Map<string, number>,
): SpinResult {
  const grid = spinGrid(FREE_REELS, stickyWilds);
  return { grid, ...evaluateGrid(grid, betPerLine) };
}

/** Собирает вайлды с сетки, чтобы они «прилипли» к следующему фриспину. */
export function collectStickyWilds(
  grid: Grid,
  existing: Map<string, number>,
): Map<string, number> {
  const next = new Map(existing);
  for (let reel = 0; reel < REEL_COUNT; reel++) {
    for (let row = 0; row < ROW_COUNT; row++) {
      const cell = grid[reel][row];
      if (cell.symbol === 'wild') next.set(`${reel}:${row}`, cell.multiplier);
    }
  }
  return next;
}

// ─────────────────────────────────────────────────────────────
// ПОКУПКА БОНУСА
// ─────────────────────────────────────────────────────────────

/** Цена покупки фриспинов — 50 общих ставок. */
export const BONUS_PRICE_MULTIPLIER = 50;

export function bonusPrice(totalBet: number): number {
  return totalBet * BONUS_PRICE_MULTIPLIER;
}

/**
 * Сколько спинов даёт покупка. Обычно 8, изредка щедрые 12 —
 * это заметно оживляет ощущение от покупки, не ломая математику.
 */
export function purchasedFreeSpins(): number {
  return random() < 0.15 ? 12 : 8;
}

// ─────────────────────────────────────────────────────────────
// ПОДАРКИ НОВИЧКУ
// ─────────────────────────────────────────────────────────────

export type GiftKind = 'blackCats' | 'scatterCats';

/**
 * Заранее заданные поля, которые новичок получает один раз каждое.
 * Это не случайность, и игра говорит об этом прямым текстом: иначе у
 * игрока сложится ложное представление о щедрости математики.
 * После последнего подарка барабаны честны навсегда.
 *
 * Считаются только обычные спины, бесплатные в счёт не идут.
 */
export const GIFT_SCHEDULE: readonly { spin: number; kind: GiftKind }[] = [
  { spin: 37, kind: 'blackCats' },
  { spin: 44, kind: 'scatterCats' },
] as const;

export function giftAt(spinNo: number): GiftKind | null {
  return GIFT_SCHEDULE.find((g) => g.spin === spinNo)?.kind ?? null;
}

function cell(symbol: SymbolId, multiplier = 1): Cell {
  return { symbol, multiplier, sticky: false };
}

/** Поле подарка. */
export function giftGrid(kind: GiftKind): Grid {
  if (kind === 'blackCats') {
    // Одни чёрные коты: все 20 линий по пять символов
    return Array.from({ length: REEL_COUNT }, () =>
      Array.from({ length: ROW_COUNT }, () => cell('black_cat')),
    );
  }

  // Белые кошечки во всю среднюю линию, самоцветы сверху и снизу.
  // Скаттеров десять — это сразу и выплата, и максимальные фриспины.
  return Array.from({ length: REEL_COUNT }, () => [
    cell('scatter'),
    cell('white_cat'),
    cell('scatter'),
  ]);
}

// ─────────────────────────────────────────────────────────────
// ЗАТЯЖКА БАРАБАНОВ
// ─────────────────────────────────────────────────────────────

/**
 * Если на первых барабанах уже лежат два скаттера, оставшиеся крутятся
 * заметно дольше. Приём честный: исход давно определён, меняется только
 * подача. Но именно эти полторы секунды ожидания — самый сильный момент
 * в любом автомате.
 *
 * Возвращает индекс барабана, с которого начинать тянуть, или -1.
 */
export function anticipationFrom(grid: Grid): number {
  let seen = 0;
  for (let reel = 0; reel < REEL_COUNT; reel++) {
    for (let row = 0; row < ROW_COUNT; row++) {
      if (grid[reel][row].symbol === 'scatter') seen++;
    }
    // Два скаттера набрались и ещё есть куда падать третьему
    if (seen >= 2 && reel < REEL_COUNT - 1) return reel + 1;
  }
  return -1;
}

/** Добавка к длительности прокрутки для затянутых барабанов. */
export const ANTICIPATION_MS = 950;

// ─────────────────────────────────────────────────────────────
// КЛАССИФИКАЦИЯ ВЫИГРЫША — для звука и анимации
// ─────────────────────────────────────────────────────────────

export type WinTier = 'none' | 'small' | 'medium' | 'big' | 'mega';

export function winTier(totalWin: number, totalBet: number): WinTier {
  if (totalWin <= 0) return 'none';
  const ratio = totalWin / totalBet;
  if (ratio >= 25) return 'mega';
  if (ratio >= 10) return 'big';
  if (ratio >= 3) return 'medium';
  return 'small';
}
