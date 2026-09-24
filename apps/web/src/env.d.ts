/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
declare const __BUILD_TIME__: string;

interface ImportMetaEnv {
  /** "true" enables developer tools (GPS lab) in preview builds. */
  readonly VITE_DEV_TOOLS?: string;
}
