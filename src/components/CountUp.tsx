import { useEffect, useRef, useState } from 'react';

/**
 * Плавно доводит число до нового значения.
 *
 * Резко меняющийся баланс читается как «цифра просто подменилась».
 * Когда она набегает за полсекунды, выигрыш ощущается как поступление,
 * а не как правка счётчика.
 */
export default function CountUp({ value, className }: { value: number; className?: string }) {
  const [shown, setShown] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number>();

  useEffect(() => {
    const from = fromRef.current;
    const delta = value - from;

    if (delta === 0) return;

    // Мелкие изменения не анимируем — мельтешение раздражает
    if (Math.abs(delta) < 2) {
      fromRef.current = value;
      setShown(value);
      return;
    }

    const duration = Math.min(900, 260 + Math.abs(delta) * 0.35);
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic: быстрый набор и мягкая остановка
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(from + delta * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fromRef.current = value;
    };
  }, [value]);

  return <span className={className}>{shown.toLocaleString('ru-RU')}</span>;
}
