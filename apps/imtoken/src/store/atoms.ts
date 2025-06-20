import { atom } from 'jotai'
import { EthereumAccount, BitcoinAccount } from '@/types'

// Wallet connection status
export const isConnectedAtom = atom(false)

// Loading status
export const isLoadingAtom = atom(false)

// Ethereum account information
export const ethereumAccountAtom = atom<EthereumAccount | null>(null)

// Bitcoin account information
export const bitcoinAccountAtom = atom<BitcoinAccount | null>(null)

// Signature result
export const signatureResultAtom = atom('')

// Persisted Ethereum address
export const persistedEthereumAddressAtom = atom(
  (get) => {
    const account = get(ethereumAccountAtom)
    return (
      account?.address || localStorage.getItem('imtoken_ethereum_address') || ''
    )
  },
  (get, set, newAddress: string) => {
    if (newAddress) {
      localStorage.setItem('imtoken_ethereum_address', newAddress)
    } else {
      localStorage.removeItem('imtoken_ethereum_address')
    }
    // If there's a new address, update account information
    if (newAddress && !get(ethereumAccountAtom)) {
      set(ethereumAccountAtom, {
        address: newAddress,
        chainId: 11155111, // Sepolia
        network: 'sepolia',
      })
    }
  },
)

// Persisted Bitcoin address
export const persistedBitcoinAddressAtom = atom(
  (get) => {
    const account = get(bitcoinAccountAtom)
    return (
      account?.address || localStorage.getItem('imtoken_bitcoin_address') || ''
    )
  },
  (get, set, newAddress: string) => {
    if (newAddress) {
      localStorage.setItem('imtoken_bitcoin_address', newAddress)
    } else {
      localStorage.removeItem('imtoken_bitcoin_address')
    }
    // If there's a new address, update account information
    if (newAddress && !get(bitcoinAccountAtom)) {
      const publicKey = localStorage.getItem('imtoken_bitcoin_publickey') || ''
      set(bitcoinAccountAtom, {
        address: newAddress,
        publicKey,
        network: 'signet',
      })
    }
  },
)

// Atom for clearing all data
export const clearAllDataAtom = atom(null, (_, set) => {
  // Clear state
  set(isConnectedAtom, false)
  set(isLoadingAtom, false)
  set(ethereumAccountAtom, null)
  set(bitcoinAccountAtom, null)
  set(signatureResultAtom, '')

  // Clear local storage
  localStorage.removeItem('imtoken_ethereum_address')
  localStorage.removeItem('imtoken_bitcoin_address')
  localStorage.removeItem('imtoken_bitcoin_publickey')
})

// Atom for initializing state
export const initializeAtom = atom(null, (_, set) => {
  // Restore addresses from local storage
  const ethAddress = localStorage.getItem('imtoken_ethereum_address')
  const btcAddress = localStorage.getItem('imtoken_bitcoin_address')
  const btcPublicKey = localStorage.getItem('imtoken_bitcoin_publickey')

  if (ethAddress) {
    set(ethereumAccountAtom, {
      address: ethAddress,
      chainId: 11155111, // Sepolia
      network: 'sepolia',
    })
  }

  if (btcAddress) {
    set(bitcoinAccountAtom, {
      address: btcAddress,
      publicKey: btcPublicKey || '',
      network: 'signet',
    })
  }

  // If there's any address, set as connected
  if (ethAddress || btcAddress) {
    set(isConnectedAtom, true)
  }
})
