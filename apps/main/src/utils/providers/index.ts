import { useEffect, useState } from 'react'
import { WalletProvider } from './base'
import { OKXWallet } from './okx'

export const createProvider = (): WalletProvider | null => {
  if (window.okxwallet) {
    return new OKXWallet()
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
