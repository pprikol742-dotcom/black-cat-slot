import { useEffect, useState } from 'react';
import { useGame } from '../store/gameStore';
import CountUp from './CountUp';
import { asset } from '../assets';

const TITLES: Record<string, string> = {
  big: 'Крупный выигрыш!',
  mega: 'Огромный занос!',
};

/**
 * Заставка для крупных выигрышей. Показывается только на big и mega —
 * если праздновать каждую мелочь, праздник обесценится.
 */
export default function BigWin() {
  const tier = useGame((s) => s.tier);
  const amount = useGame((s) => s.lastWin);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (tier !== 'big' && tier !== 'mega') return;
    setShow(true);
    const t = setTimeout(() => setShow(false), tier === 'mega' ? 3600 : 2600);
    return () => clearTimeout(t);
  }, [tier, amount]);

  if (!show) return null;

  const coinCount = tier === 'mega' ? 14 : 9;

  return (
    <div className={`bigwin ${tier}`} onClick={() => setShow(false)}>
      {/* Монеты разлетаются из центра и падают вниз */}
      <div className="coin-burst">
        {Array.from({ length: coinCount }, (_, i) => (
          <img
            key={i}
            src={asset("symbols/coin.png")}
            alt=""
            draggable={false}
            style={{
              '--i': i,
              '--n': coinCount,
              '--delay': `${(i % 5) * 0.13}s`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      <div className="sparks">
        {Array.from({ length: 18 }, (_, i) => (
          <span key={i} style={{ '--i': i } as React.CSSProperties} />
        ))}
      </div>

      <h2>{TITLES[tier]}</h2>

      <div className="bigwin-row">
        <img className="bigwin-coin" src={asset("symbols/coin.png")} alt="" draggable={false} />
        <CountUp className="bigwin-amount" value={amount} />
      </div>
    </div>
  );
}
