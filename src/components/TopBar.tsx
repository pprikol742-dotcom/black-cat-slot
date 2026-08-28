import { useGame } from '../store/gameStore';
import { platform } from '../platform';
import { sfx } from '../audio/audio';
import CountUp from './CountUp';
import { GiftIcon, InfoIcon, ShareIcon, SoundOnIcon, SoundOffIcon, MenuIcon, Coin } from './Icon';

export default function TopBar() {
  const balance = useGame((s) => s.balance);
  const soundOn = useGame((s) => s.soundOn);
  const canDaily = useGame((s) => s.canClaimDaily());
  const openModal = useGame((s) => s.openModal);
  const toggleSound = useGame((s) => s.toggleSound);
  const setScreen = useGame((s) => s.setScreen);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className={`icon-btn${canDaily ? ' has-badge' : ''}`}
          onClick={() => openModal('daily')}
          aria-label="Ежедневная награда"
          data-tour="daily"
        >
          <GiftIcon />
        </button>
        <button className="icon-btn" onClick={() => openModal('rules')} aria-label="Правила и выплаты">
          <InfoIcon />
        </button>
        <button className="icon-btn" onClick={() => openModal('coins')} aria-label="Где взять монеты">
          <Coin size={22} className="btn-coin" />
        </button>
        <button
          className="icon-btn"
          onClick={() => { sfx.click(); void platform.share('Сокровища чёрного кота — крути барабаны!'); }}
          aria-label="Поделиться"
        >
          <ShareIcon />
        </button>
        <button
          className="icon-btn"
          onClick={() => { sfx.click(); toggleSound(); }}
          aria-label={soundOn ? 'Выключить звук' : 'Включить звук'}
        >
          {soundOn ? <SoundOnIcon /> : <SoundOffIcon />}
        </button>
        <button className="icon-btn" onClick={() => { sfx.click(); setScreen('menu'); }} aria-label="В меню">
          <MenuIcon />
        </button>
      </div>

      <div className="balance-chip">
        <Coin size={24} />
        <CountUp value={balance} />
      </div>
    </header>
  );
}
