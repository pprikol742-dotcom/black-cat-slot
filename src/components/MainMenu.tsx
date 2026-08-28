import { useGame } from '../store/gameStore';
import { sfx } from '../audio/audio';

export default function MainMenu() {
  const setScreen = useGame((s) => s.setScreen);
  const openModal = useGame((s) => s.openModal);
  const soundOn = useGame((s) => s.soundOn);
  const toggleSound = useGame((s) => s.toggleSound);
  const tutorialDone = useGame((s) => s.tutorialDone);
  const setStep = useGame((s) => s.setTutorialStep);

  const play = () => {
    sfx.click();
    setScreen('game');
    if (!tutorialDone) setStep(1);
  };

  return (
    <div className="menu">
      <h1 className="logo">
        <span>Сокровища</span>
        <span>чёрного кота</span>
      </h1>
      <p className="tagline">Крути барабаны, собирай самоцветы и открывай бесплатные спины.</p>

      <button className="btn big" onClick={play}>Играть</button>
      <button className="btn ghost" onClick={() => { sfx.click(); setScreen('game'); setStep(1); }}>
        Как играть
      </button>
      <button className="btn ghost" onClick={() => openModal('rules')}>Правила и выплаты</button>
      <button className="btn ghost" onClick={() => { sfx.click(); toggleSound(); }}>
        Звук: {soundOn ? 'вкл.' : 'выкл.'}
      </button>

      <p className="disclaimer">
        Игровые монеты не имеют реальной ценности. Вывод и обмен на деньги невозможны.
        Это симулятор, игра на реальные деньги в нём отсутствует. 18+
      </p>
    </div>
  );
}
