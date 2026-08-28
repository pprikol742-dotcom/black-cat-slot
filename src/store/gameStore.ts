import { create } from 'zustand';
import {
  spin as coreSpin,
  freeSpin as coreFreeSpin,
  collectStickyWilds,
  spinGrid,
  BASE_REELS,
  bonusPrice,
  purchasedFreeSpins,
  winTier,
  BET_STEPS,
  LINE_COUNT,
  SPIN_BASE_MS,
  REEL_STAGGER_MS,
  ANTICIPATION_MS,
  anticipationFrom,
  evaluateGrid,
  giftGrid,
  GIFT_SPIN,
  type Grid,
  type LineWin,
  type WinTier,
} from '../game/core';
import { platform } from '../platform';
import { sfx, duckMusic } from '../audio/audio';

const START_BALANCE = 5000;
const AD_REWARD = 1000;
const TOPUP_AMOUNT = 300;
const TOPUP_THRESHOLD = 200;
const TOPUP_COOLDOWN_MS = 20 * 60 * 1000;

/** Награда за вход, по дням подряд. */
export const DAILY_REWARDS = [300, 500, 800, 1200, 1800, 2600, 4000];

interface SavedState {
  balance: number;
  betIndex: number;
  dailyStreak: number;
  lastDailyDay: number;
  tutorialDone: boolean;
  soundOn: boolean;
  lastTopUp: number;
  spinCount: number;
  giftDone: boolean;
}

export type Screen = 'menu' | 'game';
export type ModalId =
  | null | 'rules' | 'daily' | 'coins' | 'buyBonus' | 'freeSpinsIntro' | 'freeSpinsEnd' | 'gift';

interface GameState extends SavedState {
  ready: boolean;
  screen: Screen;
  modal: ModalId;

  grid: Grid;
  spinning: boolean;
  /** Меняется на каждом спине — по нему барабаны понимают, что пора крутиться. */
  spinKey: number;
  /** С какого барабана тянуть время. -1 — обычный спин. */
  anticipation: number;
  /** Показать заставку подарка после текущего спина. */
  giftPending: boolean;
  lineWins: LineWin[];
  lastWin: number;
  tier: WinTier;
  /** Индекс подсвечиваемой линии при переборе выигрышей. */
  highlight: number;

  freeSpinsLeft: number;
  freeSpinsTotal: number;
  freeSpinsWin: number;
  inFreeSpins: boolean;

  autoPlay: boolean;
  tutorialStep: number;

  totalBet(): number;
  bonusCost(): number;

  boot(): Promise<void>;
  setScreen(s: Screen): void;
  openModal(m: ModalId): void;
  changeBet(dir: 1 | -1): void;
  toggleSound(): void;
  toggleAuto(): void;
  setTutorialStep(n: number): void;
  finishTutorial(): void;

  doSpin(): Promise<void>;
  buyBonus(): Promise<void>;
  claimDaily(): Promise<void>;
  watchAdForCoins(): Promise<void>;
  maybeTopUp(): void;
  canClaimDaily(): boolean;
}

const dayNumber = () => Math.floor(Date.now() / 86_400_000);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function persist(s: GameState) {
  const data: SavedState = {
    balance: s.balance,
    betIndex: s.betIndex,
    dailyStreak: s.dailyStreak,
    lastDailyDay: s.lastDailyDay,
    tutorialDone: s.tutorialDone,
    soundOn: s.soundOn,
    lastTopUp: s.lastTopUp,
    spinCount: s.spinCount,
    giftDone: s.giftDone,
  };
  void platform.save('state', data);
}

export const useGame = create<GameState>((set, get) => ({
  ready: false,
  screen: 'menu',
  modal: null,

  balance: START_BALANCE,
  betIndex: 1,
  dailyStreak: 0,
  lastDailyDay: 0,
  tutorialDone: false,
  soundOn: true,
  lastTopUp: 0,
  spinCount: 0,
  giftDone: false,

  grid: spinGrid(BASE_REELS),
  spinning: false,
  spinKey: 0,
  anticipation: -1,
  giftPending: false,
  lineWins: [],
  lastWin: 0,
  tier: 'none',
  highlight: -1,

  freeSpinsLeft: 0,
  freeSpinsTotal: 0,
  freeSpinsWin: 0,
  inFreeSpins: false,

  autoPlay: false,
  tutorialStep: 0,

  totalBet: () => BET_STEPS[get().betIndex],
  bonusCost: () => bonusPrice(BET_STEPS[get().betIndex]),

  async boot() {
    const saved = await platform.load<SavedState | null>('state', null);
    if (saved) {
      set({
        balance: saved.balance ?? START_BALANCE,
        betIndex: Math.min(saved.betIndex ?? 1, BET_STEPS.length - 1),
        dailyStreak: saved.dailyStreak ?? 0,
        lastDailyDay: saved.lastDailyDay ?? 0,
        tutorialDone: saved.tutorialDone ?? false,
        soundOn: saved.soundOn ?? true,
        lastTopUp: saved.lastTopUp ?? 0,
        spinCount: saved.spinCount ?? 0,
        giftDone: saved.giftDone ?? false,
      });
    }
    set({ ready: true });
  },

  setScreen(screen) {
    set({ screen });
    // Награду за вход показываем один раз, сразу после входа в игру
    if (screen === 'game' && get().canClaimDaily()) {
      setTimeout(() => set({ modal: 'daily' }), 400);
    }
  },

  openModal(modal) {
    sfx.click();
    set({ modal });
  },

  changeBet(dir) {
    const { betIndex, spinning } = get();
    if (spinning) return;
    const next = Math.min(Math.max(betIndex + dir, 0), BET_STEPS.length - 1);
    if (next === betIndex) return;
    sfx.click();
    set({ betIndex: next });
    persist(get());
  },

  toggleSound() {
    const soundOn = !get().soundOn;
    set({ soundOn });
    persist(get());
  },

  toggleAuto() {
    sfx.click();
    const autoPlay = !get().autoPlay;
    set({ autoPlay });
    if (autoPlay && !get().spinning) void get().doSpin();
  },

  setTutorialStep(tutorialStep) {
    set({ tutorialStep });
  },

  finishTutorial() {
    set({ tutorialDone: true, tutorialStep: 0 });
    persist(get());
  },

  canClaimDaily() {
    return get().lastDailyDay !== dayNumber();
  },

  async claimDaily() {
    const s = get();
    if (!s.canClaimDaily()) return;
    const today = dayNumber();
    // Пропущенный день обнуляет серию — так награда остаётся ценной
    const streak = s.lastDailyDay === today - 1 ? Math.min(s.dailyStreak + 1, 7) : 1;
    const reward = DAILY_REWARDS[streak - 1];
    sfx.reward();
    set({
      balance: s.balance + reward,
      dailyStreak: streak,
      lastDailyDay: today,
    });
    persist(get());
  },

  async watchAdForCoins() {
    sfx.click();
    const ok = await platform.showRewarded();
    if (!ok) return;
    sfx.reward();
    set({ balance: get().balance + AD_REWARD, modal: null });
    persist(get());
  },

  /** Небольшая подстраховка: если монет почти не осталось, изредка добавляем на пару спинов. */
  maybeTopUp() {
    const s = get();
    if (s.balance >= TOPUP_THRESHOLD) return;
    if (Date.now() - s.lastTopUp < TOPUP_COOLDOWN_MS) return;
    set({ balance: s.balance + TOPUP_AMOUNT, lastTopUp: Date.now() });
    persist(get());
  },

  async doSpin() {
    const s = get();
    if (s.spinning) return;

    const bet = BET_STEPS[s.betIndex];
    const betPerLine = bet / LINE_COUNT;

    if (!s.inFreeSpins && s.balance < bet) {
      sfx.denied();
      set({ autoPlay: false, modal: 'coins' });
      return;
    }

    const sticky = s.inFreeSpins
      ? (stickyRef.current ?? new Map<string, number>())
      : new Map<string, number>();

    const spinNo = s.inFreeSpins ? s.spinCount : s.spinCount + 1;
    const isGift = !s.inFreeSpins && !s.giftDone && spinNo === GIFT_SPIN;

    let result;
    if (isGift) {
      const grid = giftGrid();
      result = { grid, ...evaluateGrid(grid, betPerLine) };
    } else {
      result = s.inFreeSpins ? coreFreeSpin(betPerLine, sticky) : coreSpin(betPerLine);
    }

    const anticipation = anticipationFrom(result.grid);

    // Итоговая сетка ставится сразу — барабаны сами доедут до неё,
    // прокрутив ленту-заглушку. Так анимация идёт на GPU без перерисовок.
    set({
      spinning: true,
      spinKey: s.spinKey + 1,
      grid: result.grid,
      anticipation,
      giftPending: isGift,
      spinCount: spinNo,
      lineWins: [],
      lastWin: 0,
      tier: 'none',
      highlight: -1,
      balance: s.inFreeSpins ? s.balance : s.balance - bet,
    });

    sfx.spinStart();

    // Щелчки остановки раскладываем по тем же таймингам, что и анимация
    let elapsed = 0;
    for (let i = 0; i < 5; i++) {
      elapsed = SPIN_BASE_MS + i * REEL_STAGGER_MS
        + (anticipation >= 0 && i >= anticipation ? ANTICIPATION_MS : 0);
      setTimeout(() => sfx.reelStop(i), elapsed);
      if (anticipation >= 0 && i === anticipation - 1) {
        setTimeout(() => sfx.anticipation(), elapsed);
      }
    }

    await wait(elapsed + 60);

    const tier = winTier(result.totalWin, bet);
    set({
      spinning: false,
      lineWins: result.lineWins,
      lastWin: result.totalWin,
      tier,
      balance: get().balance + result.totalWin,
    });

    if (result.totalWin > 0) {
      ({ small: sfx.winSmall, medium: sfx.winMedium, big: sfx.winBig, mega: sfx.winMega, none: () => {} })[tier]();
    }

    if (s.inFreeSpins) {
      stickyRef.current = collectStickyWilds(result.grid, sticky);
      set({ freeSpinsWin: get().freeSpinsWin + result.totalWin });
    }

    if (isGift) {
      set({ giftDone: true });
    }

    persist(get());

    // Перебор выигрышных линий по очереди
    if (result.lineWins.length > 0) {
      void cycleHighlight(set, get, result.lineWins.length);
    }

    if (isGift) {
      sfx.gift();
      // Сначала отыгрывает заставка крупного выигрыша, и только потом
      // игра честно объясняет, что это был подарок, а не везение
      await wait(3800);
      set({ modal: 'gift', giftPending: false });
      return;
    }

    // Запуск фриспинов
    if (result.freeSpinsAwarded > 0 && !s.inFreeSpins) {
      stickyRef.current = collectStickyWilds(result.grid, new Map());
      sfx.freeSpins();
      duckMusic(true);
      await wait(900);
      set({
        freeSpinsLeft: result.freeSpinsAwarded,
        freeSpinsTotal: result.freeSpinsAwarded,
        freeSpinsWin: 0,
        modal: 'freeSpinsIntro',
      });
      return;
    }

    // Ретриггер внутри бонуса
    if (result.freeSpinsAwarded > 0 && s.inFreeSpins) {
      sfx.freeSpins();
      set({ freeSpinsLeft: get().freeSpinsLeft + 3, freeSpinsTotal: get().freeSpinsTotal + 3 });
    }

    // Продолжение серии фриспинов
    if (s.inFreeSpins) {
      const left = get().freeSpinsLeft - 1;
      set({ freeSpinsLeft: left });
      if (left <= 0) {
        await wait(700);
        duckMusic(false);
        set({ inFreeSpins: false, modal: 'freeSpinsEnd' });
        stickyRef.current = null;
      } else {
        await wait(900);
        void get().doSpin();
      }
      return;
    }

    get().maybeTopUp();

    if (get().autoPlay) {
      await wait(result.totalWin > 0 ? 1400 : 700);
      if (get().autoPlay && !get().spinning) void get().doSpin();
    }
  },

  async buyBonus() {
    const s = get();
    const cost = s.bonusCost();
    if (s.balance < cost) {
      sfx.denied();
      set({ modal: 'coins' });
      return;
    }
    sfx.click();
    const count = purchasedFreeSpins();
    stickyRef.current = new Map<string, number>();
    sfx.freeSpins();
    duckMusic(true);
    set({
      balance: s.balance - cost,
      freeSpinsLeft: count,
      freeSpinsTotal: count,
      freeSpinsWin: 0,
      modal: 'freeSpinsIntro',
    });
    persist(get());
  },
}));

/** Липкие вайлды живут вне состояния — их не нужно перерисовывать. */
const stickyRef: { current: Map<string, number> | null } = { current: null };

/** Начинает серию фриспинов после закрытия заставки. */
export function beginFreeSpins(): void {
  useGame.setState({ inFreeSpins: true, modal: null });
  void useGame.getState().doSpin();
}

async function cycleHighlight(
  set: (p: Partial<GameState>) => void,
  get: () => GameState,
  count: number,
): Promise<void> {
  for (let round = 0; round < 2; round++) {
    for (let i = 0; i < count; i++) {
      if (get().spinning) return;
      set({ highlight: i });
      await wait(750);
    }
  }
  if (!get().spinning) set({ highlight: -1 });
}
