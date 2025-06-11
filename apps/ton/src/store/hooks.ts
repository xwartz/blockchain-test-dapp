import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import {
  isLoadingAtom,
  walletInfoAtom,
  isConnectedAtom,
  walletMnemonicAtom,
  bridgeSessionAtom,
  dappConnectionsAtom,
  hasWalletDataAtom,
  clearAllDataAtom,
  isWalletDataValidAtom,
  pendingTransactionAtom,
} from './atoms.js'

// 基础状态 hooks
export const useIsLoading = () => useAtom(isLoadingAtom)
export const useIsLoadingValue = () => useAtomValue(isLoadingAtom)
export const useSetIsLoading = () => useSetAtom(isLoadingAtom)

// 钱包信息 hooks
export const useWalletInfo = () => useAtom(walletInfoAtom)
export const useWalletInfoValue = () => useAtomValue(walletInfoAtom)
export const useSetWalletInfo = () => useSetAtom(walletInfoAtom)

// 连接状态 hooks
export const useIsConnected = () => useAtom(isConnectedAtom)
export const useIsConnectedValue = () => useAtomValue(isConnectedAtom)
export const useSetIsConnected = () => useSetAtom(isConnectedAtom)

// 助记词 hooks
export const useWalletMnemonic = () => useAtom(walletMnemonicAtom)
export const useWalletMnemonicValue = () => useAtomValue(walletMnemonicAtom)
export const useSetWalletMnemonic = () => useSetAtom(walletMnemonicAtom)

// Bridge 会话 hooks
export const useBridgeSession = () => useAtom(bridgeSessionAtom)
export const useBridgeSessionValue = () => useAtomValue(bridgeSessionAtom)
export const useSetBridgeSession = () => useSetAtom(bridgeSessionAtom)

// dApp 连接 hooks
export const useDappConnections = () => useAtom(dappConnectionsAtom)
export const useDappConnectionsValue = () => useAtomValue(dappConnectionsAtom)
export const useSetDappConnections = () => useSetAtom(dappConnectionsAtom)

// 计算状态 hooks
export const useHasWalletData = () => useAtomValue(hasWalletDataAtom)
export const useIsWalletDataValid = () => useAtomValue(isWalletDataValidAtom)

// 交易确认 hooks
export const usePendingTransaction = () => useAtom(pendingTransactionAtom)
export const usePendingTransactionValue = () =>
  useAtomValue(pendingTransactionAtom)
export const useSetPendingTransaction = () => useSetAtom(pendingTransactionAtom)

// 清除所有数据 hook
export const useClearAllData = () => useSetAtom(clearAllDataAtom)

// 复合 hooks
export const useWalletState = () => {
  const walletInfo = useWalletInfoValue()
  const isConnected = useIsConnectedValue()
  const isLoading = useIsLoadingValue()
  const hasWalletData = useHasWalletData()
  const isDataValid = useIsWalletDataValid()

  return {
    walletInfo,
    isConnected,
    isLoading,
    hasWalletData,
    isDataValid,
  }
}

export const useWalletActions = () => {
  const setWalletInfo = useSetWalletInfo()
  const setIsConnected = useSetIsConnected()
  const setIsLoading = useSetIsLoading()
  const setMnemonic = useSetWalletMnemonic()
  const clearAllData = useClearAllData()

  return {
    setWalletInfo,
    setIsConnected,
    setIsLoading,
    setMnemonic,
    clearAllData,
  }
}
