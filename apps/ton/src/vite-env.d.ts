/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TON_API_ENDPOINT: string
  readonly VITE_TON_NETWORK: string
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface TonWalletProvider {
  send(method: string, params?: unknown[]): Promise<unknown>
  connect(): Promise<unknown>
  disconnect(): Promise<void>
  getAccount?(): Promise<unknown>
  [key: string]: unknown
}

interface Window {
  ton?: TonWalletProvider
  tonkeeper?: TonWalletProvider
  tonhub?: TonWalletProvider
}
