import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import {
  isConnectedAtom,
  walletAddressAtom,
  walletAddressHexAtom,
  isLoadingAtom,
  isSigningAtom,
  activeTabAtom,
  payloadJsonAtom,
  parsedPayloadAtom,
  signatureResultAtom,
  signatureErrorAtom,
  hashResultAtom,
  gasFreeAddressAtom,
  gasFreeNonceAtom,
  gasFreeSubmitResultAtom,
  clearSigningDataAtom,
  clearAllDataAtom,
} from './atoms'

export const useIsConnected = () => useAtomValue(isConnectedAtom)
export const useSetIsConnected = () => useSetAtom(isConnectedAtom)

export const useWalletAddress = () => useAtomValue(walletAddressAtom)
export const useSetWalletAddress = () => useSetAtom(walletAddressAtom)

export const useWalletAddressHex = () => useAtomValue(walletAddressHexAtom)
export const useSetWalletAddressHex = () => useSetAtom(walletAddressHexAtom)

export const useIsLoading = () => useAtomValue(isLoadingAtom)
export const useSetIsLoading = () => useSetAtom(isLoadingAtom)

export const useIsSigning = () => useAtomValue(isSigningAtom)
export const useSetIsSigning = () => useSetAtom(isSigningAtom)

export const useActiveTab = () => useAtom(activeTabAtom)

export const usePayloadJson = () => useAtom(payloadJsonAtom)
export const useParsedPayload = () => useAtomValue(parsedPayloadAtom)

export const useSignatureResult = () => useAtom(signatureResultAtom)
export const useSignatureError = () => useAtom(signatureErrorAtom)

export const useHashResult = () => useAtom(hashResultAtom)

export const useGasFreeAddress = () => useAtom(gasFreeAddressAtom)
export const useGasFreeNonce = () => useAtom(gasFreeNonceAtom)
export const useGasFreeSubmitResult = () => useAtom(gasFreeSubmitResultAtom)

export const useClearSigningData = () => useSetAtom(clearSigningDataAtom)
export const useClearAllData = () => useSetAtom(clearAllDataAtom)

export const useWalletState = () => {
  const isConnected = useIsConnected()
  const address = useWalletAddress()
  const addressHex = useWalletAddressHex()
  const isLoading = useIsLoading()

  return { isConnected, address, addressHex, isLoading }
}

export const useWalletActions = () => {
  const setIsConnected = useSetAtom(isConnectedAtom)
  const setAddress = useSetAtom(walletAddressAtom)
  const setAddressHex = useSetAtom(walletAddressHexAtom)
  const setIsLoading = useSetAtom(isLoadingAtom)
  const clearAll = useSetAtom(clearAllDataAtom)

  return { setIsConnected, setAddress, setAddressHex, setIsLoading, clearAll }
}
