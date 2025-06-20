import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import {
  isConnectedAtom,
  isLoadingAtom,
  ethereumAccountAtom,
  bitcoinAccountAtom,
  signatureResultAtom,
  persistedEthereumAddressAtom,
  persistedBitcoinAddressAtom,
  clearAllDataAtom,
  initializeAtom,
} from './atoms'

// Connection status
export const useIsConnected = () => useAtom(isConnectedAtom)
export const useIsConnectedValue = () => useAtomValue(isConnectedAtom)
export const useSetIsConnected = () => useSetAtom(isConnectedAtom)

// Loading status
export const useIsLoading = () => useAtom(isLoadingAtom)
export const useIsLoadingValue = () => useAtomValue(isLoadingAtom)
export const useSetIsLoading = () => useSetAtom(isLoadingAtom)

// Ethereum account
export const useEthereumAccount = () => useAtom(ethereumAccountAtom)
export const useEthereumAccountValue = () => useAtomValue(ethereumAccountAtom)
export const useSetEthereumAccount = () => useSetAtom(ethereumAccountAtom)

// Bitcoin account
export const useBitcoinAccount = () => useAtom(bitcoinAccountAtom)
export const useBitcoinAccountValue = () => useAtomValue(bitcoinAccountAtom)
export const useSetBitcoinAccount = () => useSetAtom(bitcoinAccountAtom)

// Signature result
export const useSignatureResult = () => useAtom(signatureResultAtom)
export const useSignatureResultValue = () => useAtomValue(signatureResultAtom)
export const useSetSignatureResult = () => useSetAtom(signatureResultAtom)

// Persisted addresses
export const usePersistedEthereumAddress = () =>
  useAtom(persistedEthereumAddressAtom)
export const usePersistedBitcoinAddress = () =>
  useAtom(persistedBitcoinAddressAtom)

// Utility functions
export const useClearAllData = () => useSetAtom(clearAllDataAtom)
export const useInitialize = () => useSetAtom(initializeAtom)

// Composite hooks
export const useWalletState = () => {
  const isConnected = useIsConnectedValue()
  const isLoading = useIsLoadingValue()
  const ethereumAccount = useEthereumAccountValue()
  const bitcoinAccount = useBitcoinAccountValue()
  const signatureResult = useSignatureResultValue()

  return {
    isConnected,
    isLoading,
    ethereumAccount,
    bitcoinAccount,
    signatureResult,
  }
}

// 钱包操作钩子
export const useWalletActions = () => {
  const setIsConnected = useSetIsConnected()
  const setIsLoading = useSetIsLoading()
  const setEthereumAccount = useSetEthereumAccount()
  const setBitcoinAccount = useSetBitcoinAccount()
  const setSignatureResult = useSetSignatureResult()
  const clearAllData = useClearAllData()
  const initialize = useInitialize()

  return {
    setIsConnected,
    setIsLoading,
    setEthereumAccount,
    setBitcoinAccount,
    setSignatureResult,
    clearAllData,
    initialize,
  }
}
