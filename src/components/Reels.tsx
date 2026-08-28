import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useGame } from '../store/gameStore';
import {
  SYMBOLS, PAYLINES, LINE_COLORS, REEL_COUNT, ROW_COUNT,
  SPIN_BASE_MS, REEL_STAGGER_MS, ANTICIPATION_MS,
  type SymbolId, type Cell,
} from '../game/core';
import { asset } from '../assets';

/**
 * Барабан прокручивается по-настоящему: лента из случайных символов
 * уезжает вверх и тормозит ровно на итоговой тройке. Замедление с
 * лёгким отскоком в конце — именно оно даёт ощущение веса барабана.
 *
 * Смещение задаётся в процентах от высоты ленты, поэтому ничего
 * не нужно измерять в пикселях: работает на любом размере экрана.
 */

/** Сколько случайных символов проматывается перед итоговой тройкой. */
const LEAD = 20;

/** Символы для промотки — только мелкие, чтобы не мелькали крупные выигрышные. */
const FILLER: SymbolId[] = ['10', 'J', 'Q', 'K', 'A', 'fish', 'mouse', 'kitten'];

function fillerStrip(seed: number): SymbolId[] {
  return Array.from({ length: LEAD }, (_, i) => FILLER[Math.abs(seed * 7 + i * 3) % FILLER.length]);
}

function SymbolArt({ id, multiplier }: { id: SymbolId; multiplier: number }) {
  return (
    <div className="cell-art">
      <img src={asset(SYMBOLS[id].art)} alt="" draggable={false} />
      {id === 'wild' && multiplier > 1 && <span className="mult">×{multiplier}</span>}
    </div>
  );
}

interface ReelProps {
  index: number;
  cells: Cell[];
  spinKey: number;
  spinning: boolean;
  lit: Set<string>;
  /** Барабан тянет время в ожидании скаттера. */
  teasing: boolean;
}

function Reel({ index, cells, spinKey, spinning, lit, teasing }: ReelProps) {
  const [rolling, setRolling] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);

  const filler = useMemo(() => fillerStrip(spinKey + index), [spinKey, index]);
  const strip = rolling ? [...filler, ...cells.map((c) => c.symbol)] : cells.map((c) => c.symbol);

  useLayoutEffect(() => {
    if (!spinning) return;
    const el = stripRef.current;
    if (!el) return;

    setRolling(true);

    // Ставим ленту в начало без анимации…
    el.style.transition = 'none';
    el.style.transform = 'translate3d(0, 0, 0)';
    void el.offsetHeight; // принудительный пересчёт, иначе браузер склеит оба состояния

    const total = LEAD + ROW_COUNT;
    const shift = (LEAD / total) * 100;
    const duration = SPIN_BASE_MS + index * REEL_STAGGER_MS + (teasing ? ANTICIPATION_MS : 0);

    // …и запускаем прокрутку в следующем кадре
    const id = requestAnimationFrame(() => {
      el.style.transition = `transform ${duration}ms cubic-bezier(0.16, 0.62, 0.16, 1.03)`;
      el.style.transform = `translate3d(0, -${shift}%, 0)`;
    });

    const done = window.setTimeout(() => setRolling(false), duration + 40);
    return () => {
      cancelAnimationFrame(id);
      clearTimeout(done);
    };
  }, [spinKey, spinning, index, teasing]);

  // После остановки лента снова показывает ровно три символа
  useEffect(() => {
    if (rolling) return;
    const el = stripRef.current;
    if (!el) return;
    el.style.transition = 'none';
    el.style.transform = 'translate3d(0, 0, 0)';
  }, [rolling]);

  return (
    <div className={`reel${rolling ? ' rolling' : ''}${rolling && teasing ? ' teasing' : ''}`}>
      <div
        className="strip"
        ref={stripRef}
        style={{ '--rows': rolling ? LEAD + ROW_COUNT : ROW_COUNT } as React.CSSProperties}
      >
        {strip.map((sym, i) => {
          const row = rolling ? i - LEAD : i;
          const cell = row >= 0 ? cells[row] : undefined;
          const key = `${index}:${row}`;
          const isLit = !rolling && lit.has(key);
          return (
            <div
              key={i}
              className={
                'cell' +
                (isLit ? ' lit' : '') +
                (cell?.sticky && !rolling ? ' sticky' : '') +
                (sym === 'scatter' && !rolling ? ' scatter' : '')
              }
            >
              <SymbolArt id={sym} multiplier={cell?.multiplier ?? 1} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Reels() {
  const grid = useGame((s) => s.grid);
  const spinning = useGame((s) => s.spinning);
  const spinKey = useGame((s) => s.spinKey);
  const lineWins = useGame((s) => s.lineWins);
  const highlight = useGame((s) => s.highlight);
  const anticipation = useGame((s) => s.anticipation);

  const lit = useMemo(() => {
    const set = new Set<string>();
    const source = highlight >= 0 ? [lineWins[highlight]] : lineWins;
    for (const w of source) {
      if (!w) continue;
      for (const [r, row] of w.cells) set.add(`${r}:${row}`);
    }
    return set;
  }, [lineWins, highlight]);

  const drawn = highlight >= 0
    ? (lineWins[highlight] ? [lineWins[highlight]] : [])
    : lineWins;

  return (
    <div className="reels-wrap">
      <div className="reels-frame" data-tour="reels">
        <div className="reels">
          {Array.from({ length: REEL_COUNT }, (_, reel) => (
            <Reel
              key={reel}
              index={reel}
              cells={grid[reel]}
              spinKey={spinKey}
              spinning={spinning}
              lit={lit}
              teasing={anticipation >= 0 && reel >= anticipation}
            />
          ))}
        </div>

        {!spinning && drawn.length > 0 && (
          <svg className="lines" viewBox="0 0 100 60" preserveAspectRatio="none">
            {drawn.map((w) => {
              if (!w) return null;
              const pts = PAYLINES[w.lineIndex]
                .slice(0, w.count)
                .map((row, reel) => `${reel * 20 + 10},${row * 20 + 10}`)
                .join(' ');
              return (
                <g key={w.lineIndex}>
                  <polyline points={pts} stroke="rgba(0,0,0,0.55)" strokeWidth={5}
                    strokeLinecap="round" strokeLinejoin="round" fill="none"
                    vectorEffect="non-scaling-stroke" />
                  <polyline points={pts} stroke={LINE_COLORS[w.lineIndex]} strokeWidth={3}
                    strokeLinecap="round" strokeLinejoin="round" fill="none"
                    vectorEffect="non-scaling-stroke" className="line-draw" />
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}
