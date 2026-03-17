/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PUBLIC_NETWORK: string
  readonly VITE_PUBLIC_MEMPOOL_API: string
  readonly VITE_PUBLIC_RPC_URL: string
  readonly VITE_PUBLIC_API_URL: string
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ethereum?: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bitcoin?: any
}
