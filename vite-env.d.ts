/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PLATFORM?: 'rustore' | 'vk';
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
