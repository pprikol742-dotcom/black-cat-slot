/**
 * Платформенный адаптер.
 *
 * Игра собирается для двух площадок из одного кода:
 *   npm run build      → RuStore (Capacitor, APK)
 *   npm run build:vk   → ВК Игры (iframe, VK Bridge)
 *
 * Различаются только три вещи: показ рекламы, сохранение прогресса
 * и способ выхода. Всё остальное общее.
 */

export type PlatformId = 'rustore' | 'vk' | 'web';

export const PLATFORM: PlatformId =
  import.meta.env.VITE_PLATFORM === 'vk' ? 'vk'
  : (window as any).Capacitor?.isNativePlatform?.() ? 'rustore'
  : 'web';

export interface Platform {
  id: PlatformId;
  init(): Promise<void>;
  /** Показать ролик за награду. true — досмотрен до конца. */
  showRewarded(): Promise<boolean>;
  /** Межстраничная реклама. Тихо игнорируется, если недоступна. */
  showInterstitial(): Promise<void>;
  load<T>(key: string, fallback: T): Promise<T>;
  save(key: string, value: unknown): Promise<void>;
  /** Поделиться игрой. Пустая заглушка там, где нечем. */
  share(text: string): Promise<void>;
}

// ─────────────────────────────────────────────────────────────
// Локальное хранилище — общая база для RuStore и web
// ─────────────────────────────────────────────────────────────

const PREFIX = 'bcs:';

const localStore = {
  async load<T>(key: string, fallback: T): Promise<T> {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  },
  async save(key: string, value: unknown): Promise<void> {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      /* приватный режим или переполнение — прогресс просто не сохранится */
    }
  },
};

// ─────────────────────────────────────────────────────────────
// RuStore: Capacitor + VK Ad SDK (myTarget) через нативный плагин
// ─────────────────────────────────────────────────────────────

/**
 * Слоты myTarget подставь свои из кабинета VK Ads.
 * Нативный плагин VkAdsPlugin регистрируется в MainActivity.java —
 * см. android-setup.md в корне проекта.
 */
const AD_SLOTS = { rewarded: 0, interstitial: 0 };

const rustorePlatform: Platform = {
  id: 'rustore',
  ...localStore,

  async init() {
    const plugin = (window as any).Capacitor?.Plugins?.VkAds;
    if (!plugin) return;
    try {
      await plugin.init({ slots: AD_SLOTS });
    } catch (e) {
      console.warn('VkAds init failed', e);
    }
  },

  async showRewarded() {
    const plugin = (window as any).Capacitor?.Plugins?.VkAds;
    if (!plugin) return false;
    try {
      const res = await plugin.showRewarded({ slotId: AD_SLOTS.rewarded });
      return Boolean(res?.rewarded);
    } catch {
      return false;
    }
  },

  async showInterstitial() {
    const plugin = (window as any).Capacitor?.Plugins?.VkAds;
    if (!plugin) return;
    try {
      await plugin.showInterstitial({ slotId: AD_SLOTS.interstitial });
    } catch {
      /* нет заливки — не страшно */
    }
  },

  async share(text: string) {
    const nav = navigator as any;
    if (nav.share) {
      try { await nav.share({ text }); } catch { /* отменено пользователем */ }
    }
  },
};

// ─────────────────────────────────────────────────────────────
// ВК Игры: VK Bridge
// ─────────────────────────────────────────────────────────────

/**
 * Мост подгружается динамически: в сборке для RuStore этот код не нужен
 * и в бандл не попадёт. Ссылку держим в модульной переменной, чтобы не
 * импортировать библиотеку на каждый вызов.
 */
let bridgeRef: any = null;

async function loadBridge(): Promise<any> {
  if (bridgeRef) return bridgeRef;
  try {
    const mod = await import('@vkontakte/vk-bridge');
    bridgeRef = mod.default ?? mod;
  } catch {
    // на случай подключения моста скриптом в index.html
    bridgeRef = (window as any).vkBridge ?? null;
  }
  return bridgeRef;
}

function vkBridge(): any {
  return bridgeRef ?? (window as any).vkBridge ?? null;
}

const vkPlatform: Platform = {
  id: 'vk',

  async init() {
    const bridge = await loadBridge();
    if (!bridge) return;
    try {
      await bridge.send('VKWebAppInit');
    } catch (e) {
      console.warn('VKWebAppInit failed', e);
    }
  },

  async showRewarded() {
    const bridge = vkBridge();
    if (!bridge) return false;
    try {
      const res = await bridge.send('VKWebAppShowNativeAds', { ad_format: 'reward' });
      return Boolean(res?.result);
    } catch {
      return false;
    }
  },

  async showInterstitial() {
    const bridge = vkBridge();
    if (!bridge) return;
    try {
      await bridge.send('VKWebAppShowNativeAds', { ad_format: 'interstitial' });
    } catch {
      /* реклама недоступна */
    }
  },

  /**
   * Прогресс во ВКонтакте живёт в облаке — игрок не теряет его
   * при смене устройства. При отказе API откатываемся на localStorage.
   */
  async load<T>(key: string, fallback: T): Promise<T> {
    const bridge = vkBridge();
    if (!bridge) return localStore.load(key, fallback);
    try {
      const res = await bridge.send('VKWebAppStorageGet', { keys: [key] });
      const item = res?.keys?.find((k: any) => k.key === key);
      if (!item?.value) return fallback;
      return JSON.parse(item.value) as T;
    } catch {
      return localStore.load(key, fallback);
    }
  },

  async save(key: string, value: unknown) {
    const bridge = vkBridge();
    const payload = JSON.stringify(value);
    if (!bridge) return localStore.save(key, value);
    try {
      await bridge.send('VKWebAppStorageSet', { key, value: payload });
    } catch {
      await localStore.save(key, value);
    }
  },

  async share(text: string) {
    const bridge = vkBridge();
    if (!bridge) return;
    try {
      await bridge.send('VKWebAppShare', { link: window.location.href, text });
    } catch {
      /* отменено пользователем */
    }
  },
};

// ─────────────────────────────────────────────────────────────
// Web — режим разработки в браузере
// ─────────────────────────────────────────────────────────────

const webPlatform: Platform = {
  id: 'web',
  ...localStore,
  async init() {},
  /** В браузере рекламы нет — считаем ролик просмотренным, чтобы тестировать награду. */
  async showRewarded() { return true; },
  async showInterstitial() {},
  async share(text: string) {
    const nav = navigator as any;
    if (nav.share) {
      try { await nav.share({ text }); } catch { /* отменено */ }
    }
  },
};

export const platform: Platform =
  PLATFORM === 'vk' ? vkPlatform
  : PLATFORM === 'rustore' ? rustorePlatform
  : webPlatform;
