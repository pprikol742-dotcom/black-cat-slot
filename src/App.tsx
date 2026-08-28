import { useEffect, useRef } from 'react';
import { useGame } from './store/gameStore';
import { initAudio, resumeAudio, setSoundEnabled, startMusic } from './audio/audio';
import TopBar from './components/TopBar';
import Reels from './components/Reels';
import Controls from './components/Controls';
import Modals from './components/Modals';
import Tutorial from './components/Tutorial';
import MainMenu from './components/MainMenu';
import BigWin from './components/BigWin';
import { asset } from './assets';

export default function App() {
  const ready = useGame((s) => s.ready);
  const screen = useGame((s) => s.screen);
  const soundOn = useGame((s) => s.soundOn);
  const inFree = useGame((s) => s.inFreeSpins);
  const boot = useGame((s) => s.boot);
  const audioStarted = useRef(false);

  useEffect(() => { void boot(); }, [boot]);

  // Фоны лежат в public, поэтому их адрес зависит от места публикации
  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty('--bg-day', `url(${asset('bg.jpg')})`);
    root.setProperty('--bg-night', `url(${asset('bg_night.jpg')})`);
  }, []);

  // Браузеры не дают запустить звук до первого касания экрана
  useEffect(() => {
    const unlock = () => {
      if (audioStarted.current) { resumeAudio(); return; }
      audioStarted.current = true;
      initAudio();
      setSoundEnabled(useGame.getState().soundOn);
      startMusic();
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => { setSoundEnabled(soundOn); }, [soundOn]);

  // Высота вьюпорта в Android WebView скачет — считаем её сами
  useEffect(() => {
    const apply = () => {
      document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
    };
    apply();
    window.addEventListener('resize', apply);
    window.addEventListener('orientationchange', apply);
    return () => {
      window.removeEventListener('resize', apply);
      window.removeEventListener('orientationchange', apply);
    };
  }, []);

  if (!ready) return <div className="boot">Загрузка…</div>;

  return (
    <div className={`app${inFree ? ' night' : ''}`}>
      {screen === 'menu' ? (
        <>
          <MainMenu />
          <Modals />
        </>
      ) : (
        <>
          <TopBar />
          <h2 className="game-title">Сокровища чёрного кота</h2>
          <Reels />
          <Controls />
          <p className="disclaimer bottom">
            Игровые монеты не имеют реальной ценности. Вывод и обмен на деньги невозможны. Это симулятор.
          </p>
          <BigWin />
          <Modals />
          <Tutorial />
        </>
      )}
    </div>
  );
}
