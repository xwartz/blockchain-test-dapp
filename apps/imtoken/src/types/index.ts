export interface EthereumAccount {
  address: string
  chainId: number
  network: string
}

export interface BitcoinAccount {
  address: string
  publicKey: string
  network: string
}

export interface WalletState {
  isConnected: boolean
  isLoading: boolean
  ethereumAccount: EthereumAccount | null
  bitcoinAccount: BitcoinAccount | null
  signatureResult: string
}

export interface ImTokenProvider {
  // Ethereum methods
  ethereum?: {
    request(args: { method: string; params?: unknown[] }): Promise<unknown>
  }

  // Bitcoin methods
  bitcoin?: {
    request(args: { method: string; params?: unknown[] }): Promise<unknown>
  }

  ImTokenEventEmitter: {
    on<T>(event: string, callback: (...args: T[]) => void): void
    removeListener<T>(event: string, callback: (...args: T[]) => void): void
  }
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ethereum?: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bitcoin?: any
  }
}
