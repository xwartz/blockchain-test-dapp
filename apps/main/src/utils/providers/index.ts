import { WalletProvider } from './base'
import { OKXWallet } from './okx'

export const getProvider = (): WalletProvider => {
  return new OKXWallet()
}
