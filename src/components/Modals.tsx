import { useGame, DAILY_REWARDS, beginFreeSpins } from '../store/gameStore';
import { SYMBOLS, PAYTABLE_ORDER } from '../game/core';
import { sfx } from '../audio/audio';
import { GiftIcon, PlayIcon, Coin } from './Icon';
import { asset } from '../assets';

function Modal({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function Rules({ close }: { close: () => void }) {
  const restart = useGame((s) => s.setTutorialStep);
  return (
    <Modal onClose={close}>
      <h2>Правила и выплаты</h2>
      <p className="muted">
        5 барабанов, 20 линий. Символы платят слева направо от 1-го барабана.
        Значения — множитель ставки на линию (ставка ÷ 20), у самоцвета — множитель полной ставки.
      </p>

      <div className="paytable">
        {PAYTABLE_ORDER.map((id) => (
          <div className="pay-row" key={id}>
            <img src={asset(SYMBOLS[id].art)} alt="" />
            <span className="pay-name">{SYMBOLS[id].title}</span>
            <span className="pay-vals">
              5→{SYMBOLS[id].pays[5]}&nbsp;&nbsp;4→{SYMBOLS[id].pays[4]}&nbsp;&nbsp;3→{SYMBOLS[id].pays[3]}
            </span>
          </div>
        ))}
      </div>

      <ul className="rules-list">
        <li><img src={asset(SYMBOLS.wild.art)} alt="" /> <b>Вайлд (корзинка)</b> — на барабанах 2–3–4, заменяет всё кроме самоцвета, с множителем ×2 или ×3.</li>
        <li><img src={asset(SYMBOLS.scatter.art)} alt="" /> <b>Скаттер (самоцвет)</b> — 3 и больше в любом месте запускают бесплатные спины, где вайлды становятся липкими.</li>
        <li><GiftIcon size={16} /> <b>Покупка бонуса</b> — кнопка под ставкой даёт бесплатные спины сразу, цена 50 ставок.</li>
      </ul>

      <p className="muted">
        Математика как у настоящего автомата: выигрыш примерно на каждом третьем спине,
        но почти половина всех выплат приходит из бесплатных спинов. Отсюда и характер игры —
        долгие спокойные серии и редкие крупные заходы.
      </p>

      <button className="btn ghost" onClick={() => { sfx.click(); close(); restart(1); }}>
        Пройти обучение заново
      </button>
      <button className="btn" onClick={() => { sfx.click(); close(); }}>Закрыть</button>
    </Modal>
  );
}

function Daily({ close }: { close: () => void }) {
  const streak = useGame((s) => s.dailyStreak);
  const canClaim = useGame((s) => s.canClaimDaily());
  const claim = useGame((s) => s.claimDaily);

  return (
    <Modal onClose={close}>
      <h2><GiftIcon size={20} /> Ежедневная награда</h2>
      <p className="muted">
        {canClaim
          ? `День ${Math.min(streak + 1, 7)} подряд. Заходи каждый день — награда растёт!`
          : 'Награда за сегодня получена. Возвращайся завтра!'}
      </p>

      <div className="daily-grid">
        {DAILY_REWARDS.map((amount, i) => {
          const day = i + 1;
          const done = day <= streak;
          const active = canClaim && day === Math.min(streak + 1, 7);
          return (
            <div key={day} className={`daily-cell${done ? ' done' : ''}${active ? ' active' : ''}`}>
              <span className="daily-day">День {day} {done ? '✓' : ''}</span>
              <strong>+{amount.toLocaleString('ru-RU')}</strong>
            </div>
          );
        })}
      </div>

      {canClaim ? (
        <button className="btn" onClick={() => { void claim(); }}>Забрать награду</button>
      ) : (
        <button className="btn ghost" onClick={() => { sfx.click(); close(); }}>Закрыть</button>
      )}
    </Modal>
  );
}

function Coins({ close }: { close: () => void }) {
  const watchAd = useGame((s) => s.watchAdForCoins);
  const openModal = useGame((s) => s.openModal);

  return (
    <Modal onClose={close}>
      <h2><Coin size={20} /> Где взять монеты</h2>
      <p className="muted">
        Монеты можно получать бесплатно: короткий ролик и награда за каждый день входа.
      </p>
      <button className="btn accent" onClick={() => void watchAd()}>
        <PlayIcon size={14} /> Ролик за монеты → +1 000
      </button>
      <button className="btn ghost" onClick={() => openModal('daily')}>
        <GiftIcon size={14} /> Ежедневная награда (до 4 000)
      </button>
      <p className="muted small">
        Если монет останется совсем мало, раз в 20 минут добавится ещё 300 — на пару спинов.
      </p>
      <button className="btn ghost" onClick={() => { sfx.click(); close(); }}>Закрыть</button>
    </Modal>
  );
}

function BuyBonus({ close }: { close: () => void }) {
  const cost = useGame((s) => s.bonusCost());
  const bet = useGame((s) => s.totalBet());
  const buy = useGame((s) => s.buyBonus);

  return (
    <Modal onClose={close}>
      <h2><GiftIcon size={20} /> Купить бесплатные спины</h2>
      <p className="muted">
        Кот сразу откопает бонус: <b>8 бесплатных спинов</b> с липкими вайлдами. Иногда — целых 12.
      </p>
      <p className="muted">
        Цена — 50 ставок: <b>{cost.toLocaleString('ru-RU')}</b> <Coin size={15} /> при ставке {bet.toLocaleString('ru-RU')}.
      </p>
      <p className="muted small">Крупный выигрыш не гарантирован.</p>
      <button className="btn" onClick={() => void buy()}>Купить бонус</button>
      <button className="btn ghost" onClick={() => { sfx.click(); close(); }}>Отмена</button>
    </Modal>
  );
}

function FreeSpinsIntro() {
  const total = useGame((s) => s.freeSpinsTotal);
  return (
    <Modal>
      <img className="fs-banner" src={asset("symbols/freespins.png")} alt="" />
      <h2>{total} бесплатных спинов!</h2>
      <p className="muted">Вайлды-корзинки становятся липкими. Нажмите, чтобы начать</p>
      <button className="btn" onClick={() => { sfx.click(); beginFreeSpins(); }}>Начать</button>
    </Modal>
  );
}

function FreeSpinsEnd({ close }: { close: () => void }) {
  const win = useGame((s) => s.freeSpinsWin);
  return (
    <Modal>
      <h2>Бонус завершён</h2>
      <p className="muted">Общий выигрыш за серию</p>
      <div className="big-win">{win.toLocaleString('ru-RU')} <Coin size={26} /></div>
      <button className="btn" onClick={() => { sfx.click(); close(); }}>Продолжить</button>
    </Modal>
  );
}

function Gift({ close }: { close: () => void }) {
  const win = useGame((s) => s.lastWin);
  const freeLeft = useGame((s) => s.freeSpinsLeft);
  const freeTotal = useGame((s) => s.freeSpinsTotal);

  const next = () => {
    sfx.click();
    useGame.setState({ giftKind: null });
    // Подарок продолжается серией бесплатных спинов
    if (freeLeft > 0) useGame.setState({ modal: 'freeSpinsIntro' });
    else close();
  };

  return (
    <Modal>
      <img className="fs-banner gift-cat" src={asset('symbols/white_cat.png')} alt="" />
      <h2>Белая кошечка созвала самоцветы!</h2>
      <p className="muted">
        Подарок новичку: целая линия кошечек и самоцветы сверху и снизу.
        Это сразу и выплата, и {freeTotal} бесплатных спинов.
      </p>
      <p className="muted small">
        Подарок один — дальше барабаны крутятся честно, без поблажек.
      </p>
      <div className="big-win">+{win.toLocaleString('ru-RU')} <Coin size={26} /></div>
      <button className="btn" onClick={next}>
        {freeLeft > 0 ? 'К бесплатным спинам' : 'Забрать'}
      </button>
    </Modal>
  );
}

function Reset({ close }: { close: () => void }) {
  const reset = useGame((s) => s.resetProgress);
  const balance = useGame((s) => s.balance);
  const spins = useGame((s) => s.spinCount);

  return (
    <Modal onClose={close}>
      <h2>Начать заново?</h2>
      <p className="muted">
        Баланс {balance.toLocaleString('ru-RU')} и {spins.toLocaleString('ru-RU')} сыгранных спинов
        будут стёрты. Серия ежедневных наград и подарки новичку тоже сбросятся.
      </p>
      <p className="muted small">Отменить это действие нельзя.</p>
      <button className="btn ghost" onClick={() => { sfx.click(); close(); }}>Оставить как есть</button>
      <button className="btn danger" onClick={() => { void reset(); }}>Стереть и начать заново</button>
    </Modal>
  );
}

export default function Modals() {
  const modal = useGame((s) => s.modal);
  const close = () => useGame.setState({ modal: null });

  switch (modal) {
    case 'rules': return <Rules close={close} />;
    case 'daily': return <Daily close={close} />;
    case 'coins': return <Coins close={close} />;
    case 'buyBonus': return <BuyBonus close={close} />;
    case 'freeSpinsIntro': return <FreeSpinsIntro />;
    case 'freeSpinsEnd': return <FreeSpinsEnd close={close} />;
    case 'gift': return <Gift close={close} />;
    case 'reset': return <Reset close={close} />;
    default: return null;
  }
}
