/**
 * Векторные иконки интерфейса.
 *
 * Эмодзи в игре не используются: набор шрифтов у Windows, Android и
 * старых WebView разный, и часть значков рисуется пустыми квадратами.
 * Вектор выглядит одинаково везде и красится под тему через currentColor.
 */

interface Props {
  size?: number;
  className?: string;
}

export function GiftIcon({ size = 18, className }: Props) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className}
      fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="9" width="18" height="12" rx="1.5" />
      <path d="M3 13h18M12 9v12" />
      <path d="M12 9S9.5 9 8 7.5A2.1 2.1 0 0 1 11 4.6c1 1 1 4.4 1 4.4z" />
      <path d="M12 9s2.5 0 4-1.5A2.1 2.1 0 0 0 13 4.6c-1 1-1 4.4-1 4.4z" />
    </svg>
  );
}

export function InfoIcon({ size = 18, className }: Props) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className}
      fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-5M12 8h.01" />
    </svg>
  );
}

export function ShareIcon({ size = 17, className }: Props) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className}
      fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  );
}

export function SoundOnIcon({ size = 18, className }: Props) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className}
      fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5L6.5 9H3v6h3.5L11 19z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" />
    </svg>
  );
}

export function SoundOffIcon({ size = 18, className }: Props) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className}
      fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5L6.5 9H3v6h3.5L11 19z" />
      <path d="M16 9.5l5 5M21 9.5l-5 5" />
    </svg>
  );
}

export function MenuIcon({ size = 18, className }: Props) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className}
      fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function PlayIcon({ size = 16, className }: Props) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
      <path d="M8 5.5v13l11-6.5z" />
    </svg>
  );
}

export function PawIcon({ size = 26, className }: Props) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} fill="currentColor">
      <ellipse cx="9" cy="10.5" rx="3.1" ry="4.1" transform="rotate(-16 9 10.5)" />
      <ellipse cx="15.6" cy="7.8" rx="3.1" ry="4.3" />
      <ellipse cx="22.3" cy="10.5" rx="3.1" ry="4.1" transform="rotate(16 22.3 10.5)" />
      <ellipse cx="26.4" cy="17.4" rx="2.7" ry="3.4" transform="rotate(28 26.4 17.4)" />
      <path d="M16 15.2c4.3 0 7.9 3.2 7.9 6.6 0 2.6-2.2 4.3-5 4.3-1.1 0-2-.3-2.9-.3s-1.8.3-2.9.3c-2.8 0-5-1.7-5-4.3 0-3.4 3.6-6.6 7.9-6.6z" />
      <ellipse cx="5.6" cy="17.4" rx="2.7" ry="3.4" transform="rotate(-28 5.6 17.4)" />
    </svg>
  );
}

/** Монета — картинка из арта игры, а не значок шрифта. */
export function Coin({ size = 22, className }: Props) {
  return (
    <img
      src="/symbols/coin.png"
      alt=""
      width={size}
      height={size}
      className={className}
      draggable={false}
      style={{ display: 'inline-block', verticalAlign: 'middle', objectFit: 'contain' }}
    />
  );
}
