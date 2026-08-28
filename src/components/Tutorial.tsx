import { useEffect, useLayoutEffect, useState } from 'react';
import { useGame } from '../store/gameStore';
import { sfx } from '../audio/audio';

interface Step {
  title: string;
  text: string;
  /** Значение data-tour элемента, который надо подсветить. */
  focus?: string;
  round?: boolean;
}

const STEPS: Step[] = [
  {
    title: 'Добро пожаловать в Сокровища!',
    text: 'Задача простая: собрать на линии три и больше одинаковых символа подряд, начиная с самого левого барабана. Считается всё автоматически.',
  },
  {
    title: 'Ставка',
    text: 'Здесь видно ставку за один спин. Кнопки «−» и «+» её меняют: чем выше ставка, тем крупнее выплата за ту же линию.',
    focus: 'bet',
  },
  {
    title: 'Первый спин — ваш',
    text: 'Нажмите «КРУТИТЬ». Ставка спишется с баланса, а выигрыш вернётся на него.',
    focus: 'spin',
    round: true,
  },
  {
    title: 'Линии выплат',
    text: 'В игре 20 линий. Выигрышные символы обводятся рамкой, а сама линия рисуется поверх барабанов — сразу видно, что сложилось.',
    focus: 'reels',
  },
  {
    title: 'Вайлд и скаттер',
    text: 'Корзинка — вайлд: заменяет любой символ и умножает линию на ×2 или ×3. Самоцвет — скаттер: три и больше запускают бесплатные спины. Полная таблица выплат прячется в кнопке с буквой i.',
  },
  {
    title: 'Бонус можно купить',
    text: 'Ждать скаттеры не обязательно: эта кнопка сразу покупает бесплатные спины за 50 ставок. Крупный выигрыш это не гарантирует: чаще бонус приносит меньше своей цены.',
    focus: 'buy',
  },
  {
    title: 'Ежедневная награда',
    text: 'Заходите каждый день — награда растёт до седьмого дня подряд, а потом счёт начинается заново. Если монеты закончились, их можно взять за короткий ролик: покупать в игре нечего, платных монет нет.',
    focus: 'daily',
    round: true,
  },
  {
    title: 'Готово!',
    text: 'Это всё, что нужно для старта. Повторить обучение можно когда угодно: кнопка с буквой i → «Пройти обучение заново». Удачи!',
  },
];

const PAD = 8;

export default function Tutorial() {
  const step = useGame((s) => s.tutorialStep);
  const setStep = useGame((s) => s.setTutorialStep);
  const finish = useGame((s) => s.finishTutorial);
  const [box, setBox] = useState<DOMRect | null>(null);

  const s: Step | undefined = STEPS[step - 1];

  /**
   * Подсветку считаем по настоящему положению элемента на экране.
   * Фиксированные координаты разъезжаются на каждом втором устройстве —
   * именно поэтому рамка раньше не попадала по кнопкам.
   */
  useLayoutEffect(() => {
    if (!s?.focus) {
      setBox(null);
      return;
    }
    const measure = () => {
      const el = document.querySelector(`[data-tour="${s.focus}"]`);
      setBox(el ? el.getBoundingClientRect() : null);
    };
    measure();
    // повторный замер после того, как отыграют анимации появления
    const t = window.setTimeout(measure, 80);
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, [s?.focus, step]);

  useEffect(() => {
    if (step >= 1 && step <= STEPS.length) sfx.click();
  }, [step]);

  if (!s || step < 1 || step > STEPS.length) return null;
  const last = step === STEPS.length;

  /** Карточку уводим на противоположную половину экрана от подсветки. */
  const cardAtTop = box !== null && box.top > window.innerHeight * 0.45;

  return (
    <div className={`tutorial-layer${box ? ' has-spot' : ''}`}>
      {box && (
        <div
          className={`spotlight${s.round ? ' round' : ''}`}
          style={{
            left: box.left - PAD,
            top: box.top - PAD,
            width: box.width + PAD * 2,
            height: box.height + PAD * 2,
          }}
        />
      )}

      <div className={`tutorial-card${cardAtTop ? ' at-top' : ''}`}>
        <span className="tut-step">ШАГ {step} ИЗ {STEPS.length}</span>
        <h3>{s.title}</h3>
        <p>{s.text}</p>
        <div className="tut-actions">
          <button className="btn" onClick={() => (last ? finish() : setStep(step + 1))}>
            {last ? 'Начать игру' : 'Далее'}
          </button>
          <button className="link-btn" onClick={() => finish()}>Пропустить</button>
        </div>
      </div>
    </div>
  );
}
