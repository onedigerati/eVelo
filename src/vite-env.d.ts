/// <reference types="vite/client" />
/// <reference types="vite-plugin-comlink/client" />

declare const __PORTABLE_BUILD__: boolean;

declare module '*?worker&inline' {
  const workerConstructor: new () => Worker;
  export default workerConstructor;
}

declare module '*.png' {
  const src: string;
  export default src;
}
