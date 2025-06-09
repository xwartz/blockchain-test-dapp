import { useEffect, useState } from 'react'
import { WalletProvider } from './base'
import { OKXWallet } from './okx'
import { imTokenWallet } from './imToken'
import { OneKeyWallet } from './oneKey'

export type ProviderName =
  | 'btcwallet'
  | 'imTokenWallet'
  | 'okxWallet'
  | 'oneKeyWallet'

const providerMap: Map<ProviderName, WalletProvider> = new Map()

export const createProviders = (): Map<ProviderName, WalletProvider> => {
  if (window.btcwallet && !providerMap.has('btcwallet')) {
    providerMap.set('btcwallet', window.btcwallet)
  }
  if (window.bitcoin && !providerMap.has('btcwallet')) {
    providerMap.set('imTokenWallet', new imTokenWallet())
  }
  if (window.okxwallet && !providerMap.has('okxWallet')) {
    providerMap.set('okxWallet', new OKXWallet())
  }
  if (window.$onekey && !providerMap.has('oneKeyWallet')) {
    providerMap.set('oneKeyWallet', new OneKeyWallet())
  }
  return providerMap
}

export const useProvider = (name: ProviderName) => {
  const [provider, setProvider] = useState<WalletProvider | null>()
  useEffect(() => {
    const providers = createProviders()
    setProvider(providers.get(name))
  }, [name])
  return provider
}

export const useDefaultProvider = (): WalletProvider | null | undefined => {
  const [provider, setProvider] = useState<WalletProvider | null>()
  useEffect(() => {
    const providers = createProviders()
    const provider = providers.values().next().value
    setProvider(provider)
  }, [])
  return provider
}
