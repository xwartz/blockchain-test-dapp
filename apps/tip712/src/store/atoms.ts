import { atom } from 'jotai'
import type { TIP712Payload, SignatureResult } from '@/types'
import { TIP712_PRESETS } from '@/types'

// Wallet connection
export const isConnectedAtom = atom(false)
export const walletAddressAtom = atom('')
export const walletAddressHexAtom = atom('')

// Loading states
export const isLoadingAtom = atom(false)
export const isSigningAtom = atom(false)

// Active tab
export const activeTabAtom = atom<'sign' | 'gasfree'>('sign')

// TIP-712 payload editor
export const payloadJsonAtom = atom(
  JSON.stringify(TIP712_PRESETS.gasfreePermitTransfer.payload, null, 2),
)

// Computed: parsed payload
export const parsedPayloadAtom = atom<TIP712Payload | null>((get) => {
  try {
    const json = get(payloadJsonAtom)
    return JSON.parse(json) as TIP712Payload
  } catch {
    return null
  }
})

// Signature results
export const signatureResultAtom = atom<SignatureResult | null>(null)
export const signatureErrorAtom = atom('')

// Hash computation results
export const hashResultAtom = atom<{
  signingHash: string
  domainSeparator: string
  messageHash: string
  domainTypeString: string
  messageTypeString: string
  domainTypeHash: string
  messageTypeHash: string
} | null>(null)

// GasFree specific state
export const gasFreeAddressAtom = atom('')
export const gasFreeNonceAtom = atom('0')
export const gasFreeSubmitResultAtom = atom('')

// Clear all signing-related state
export const clearSigningDataAtom = atom(null, (_, set) => {
  set(signatureResultAtom, null)
  set(signatureErrorAtom, '')
  set(hashResultAtom, null)
  set(gasFreeSubmitResultAtom, '')
})

// Clear all data
export const clearAllDataAtom = atom(null, (_, set) => {
  set(isConnectedAtom, false)
  set(walletAddressAtom, '')
  set(walletAddressHexAtom, '')
  set(isLoadingAtom, false)
  set(isSigningAtom, false)
  set(signatureResultAtom, null)
  set(signatureErrorAtom, '')
  set(hashResultAtom, null)
  set(gasFreeAddressAtom, '')
  set(gasFreeNonceAtom, '0')
  set(gasFreeSubmitResultAtom, '')
})
