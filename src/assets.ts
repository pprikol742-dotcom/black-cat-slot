/**
 * Пути к файлам из папки public.
 *
 * Игра живёт по разным адресам: в APK это корень file://, на GitHub Pages —
 * подпапка вида /black-cat-slot/, во ВКонтакте — свой адрес. Абсолютный путь
 * «/symbols/cat.png» верен только в первом случае, поэтому все ссылки на
 * картинки собираются через базовый адрес сборки.
 */
const BASE = import.meta.env.BASE_URL || './';

export function asset(path: string): string {
  return BASE.replace(/\/?$/, '/') + path.replace(/^\//, '');
}

/**
 * Абсолютный адрес файла.
 *
 * Нужен там, где путь попадает в CSS: относительную ссылку внутри
 * custom property браузер считает от файла стилей в /assets/, а не от
 * страницы, и фон не находится. Абсолютный адрес снимает неоднозначность.
 */
export function assetUrl(path: string): string {
  return new URL(asset(path), document.baseURI).href;
}
