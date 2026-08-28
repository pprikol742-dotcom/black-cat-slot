import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// base: './' обязателен — и для Capacitor (file://), и для ВК Игр (iframe)
export default defineConfig(({ mode: _mode }) => {
  const isVk = process.env.VITE_PLATFORM === 'vk';

  return {
    plugins: [react()],
    base: './',
    resolve: {
      // Вне ВК мост подменяем заглушкой, чтобы он не попадал в APK
      alias: isVk
        ? {}
        : {
            '@vkontakte/vk-bridge': fileURLToPath(
              new URL('./src/platform/vk-bridge-stub.ts', import.meta.url),
            ),
          },
    },
    build: {
      target: 'es2020',
      assetsInlineLimit: 0,
      chunkSizeWarningLimit: 1200,
    },
    server: {
      host: true,
      port: 5173,
      // материалы для магазинов к сборке отношения не имеют и иногда
      // бывают заняты просмотрщиком изображений — не следим за ними
      watch: { ignored: ['**/store-assets/**', '**/android-icons/**'] },
    },
  };
});
