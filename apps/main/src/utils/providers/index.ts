import { useEffect, useState } from 'react'
import { WalletProvider } from './base'
import { OKXWallet } from './okx'
import { imTokenWallet } from './imToken'
import { OneKeyWallet } from './oneKey'

export const createProvider = (): WalletProvider | null => {
  if (window.btcwallet) {
    return window.btcwallet
  }
  if (window.bitcoin) {
    return new imTokenWallet()
  }
  if (window.okxwallet) {
    return new OKXWallet()
  }
  if (window.$onekey) {
    return new OneKeyWallet()
  }
  return null
}

export const useProvider = () => {
  const [provider, setProvider] = useState<WalletProvider | null>()
  useEffect(() => {
    setProvider(createProvider())
  }, [])
  return provider
}
