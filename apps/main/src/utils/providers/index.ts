import { useEffect, useState } from 'react'
import { WalletProvider } from './base'
import { OKXWallet } from './okx'
import { imTokenWallet } from './imToken'

export const createProvider = (): WalletProvider | null => {
  if (window.bitcoin) {
    return new imTokenWallet()
  }
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
