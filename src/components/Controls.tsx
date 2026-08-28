import { useGame } from '../store/gameStore';
import CountUp from './CountUp';
import { GiftIcon, PawIcon } from './Icon';

export default function Controls() {
  const bet = useGame((s) => s.totalBet());
  const balance = useGame((s) => s.balance);
  const lastWin = useGame((s) => s.lastWin);
  const spinning = useGame((s) => s.spinning);
  const autoPlay = useGame((s) => s.autoPlay);
  const inFree = useGame((s) => s.inFreeSpins);
  const freeLeft = useGame((s) => s.freeSpinsLeft);
  const cost = useGame((s) => s.bonusCost());

  const changeBet = useGame((s) => s.changeBet);
  const doSpin = useGame((s) => s.doSpin);
  const toggleAuto = useGame((s) => s.toggleAuto);
  const openModal = useGame((s) => s.openModal);

  return (
    <footer className="controls">
      <div className="bet-block">
        {inFree ? (
          <>
            <span className="label">ОСТАЛОСЬ</span>
            <strong className="free-left">{freeLeft} спинов</strong>
          </>
        ) : (
          <>
            <span className="label">СТАВКА</span>
            <div className="bet-row" data-tour="bet">
              <button className="bet-btn" onClick={() => changeBet(-1)} disabled={spinning} aria-label="Уменьшить ставку">−</button>
              <span className="bet-value">{bet.toLocaleString('ru-RU')}</span>
              <button className="bet-btn" onClick={() => changeBet(1)} disabled={spinning} aria-label="Увеличить ставку">+</button>
            </div>
            <button className="buy-bonus" data-tour="buy" onClick={() => openModal('buyBonus')} disabled={spinning}>
              <GiftIcon size={14} /> Купить бонус · {cost.toLocaleString('ru-RU')}
            </button>
          </>
        )}
      </div>

      <button
        className={`spin-btn${spinning ? ' busy' : ''}`}
        data-tour="spin"
        onClick={() => void doSpin()}
        disabled={spinning || inFree}
        aria-label="Крутить"
      >
        <span className="paws"><PawIcon /></span>
        <span className="spin-text">{inFree ? 'БОНУС' : 'КРУТИТЬ'}</span>
      </button>

      <div className="stats-block">
        <div className="stat">
          <span className="label">БАЛАНС</span>
          <CountUp value={balance} />
        </div>
        <div className="stat">
          <span className="label">ВЫИГРЫШ</span>
          <CountUp value={lastWin} className={lastWin > 0 ? 'win' : ''} />
        </div>
        <button
          className={`auto-btn${autoPlay ? ' on' : ''}`}
          onClick={toggleAuto}
          disabled={inFree}
        >
          АВТО
        </button>
      </div>
    </footer>
  );
}
