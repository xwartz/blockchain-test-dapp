export interface WalletInfo {
  address: string
  publicKey: string
  balance: string
  version: 'v3R2' | 'v4R2' | 'v5R1'
  rawAddress?: string // Raw 格式地址 (workchain:hash)
  userFriendlyAddress?: string // User-friendly 格式地址
}

export interface AppState {
  connected: boolean
  walletInfo: WalletInfo | null
  isLoading: boolean
}

export type AppAction =
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'SET_WALLET_INFO'; payload: WalletInfo | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'RESET' }
