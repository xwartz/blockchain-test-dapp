import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import type { WalletInfo } from '../types/index.js'

// 基础状态 atoms
export const isLoadingAtom = atom(false)

// 持久化状态 atoms - 使用 localStorage
export const walletInfoAtom = atomWithStorage<WalletInfo | null>(
  'ton-wallet-info',
  null,
)

export const isConnectedAtom = atomWithStorage<boolean>(
  'ton-wallet-connected',
  false,
)

export const walletMnemonicAtom = atomWithStorage<string[] | null>(
  'ton-wallet-mnemonic',
  null,
  {
    // 加密存储助记词
    getItem: (key) => {
      try {
        const stored = localStorage.getItem(key)
        if (!stored) return null
        // 简单的 base64 解码
        const decoded = atob(stored)
        return JSON.parse(decoded)
      } catch {
        return null
      }
    },
    setItem: (key, value) => {
      try {
        if (value === null) {
          localStorage.removeItem(key)
        } else {
          // 简单的 base64 编码
          const encoded = btoa(JSON.stringify(value))
          localStorage.setItem(key, encoded)
        }
      } catch (error) {
        console.error('Failed to save mnemonic:', error)
      }
    },
    removeItem: (key) => {
      localStorage.removeItem(key)
    },
  },
)

// Bridge 会话状态
export const bridgeSessionAtom = atomWithStorage<{
  keyPair: {
    publicKey: string
    secretKey: string
  }
  sessionId: string
} | null>('ton-bridge-session', null)

// dApp 连接状态
export const dappConnectionsAtom = atomWithStorage<
  Array<{ clientSessionId: string; timestamp: number }>
>('ton-bridge-connections', [])

// 计算状态 atoms
export const hasWalletDataAtom = atom((get) => {
  const walletInfo = get(walletInfoAtom)
  const mnemonic = get(walletMnemonicAtom)
  const isConnected = get(isConnectedAtom)

  return !!(walletInfo && mnemonic && isConnected)
})

// 清除所有数据的 action atom
export const clearAllDataAtom = atom(null, (_, set) => {
  console.log('Clearing all wallet data via Jotai...')

  // 重置所有状态 - 确保按顺序清除
  set(isLoadingAtom, false)
  set(pendingTransactionAtom, null)
  set(walletInfoAtom, null)
  set(isConnectedAtom, false)
  set(walletMnemonicAtom, null)
  set(bridgeSessionAtom, null)
  set(dappConnectionsAtom, [])

  // 清除所有相关的 localStorage 数据
  const keysToRemove = [
    'ton-wallet-info',
    'ton-wallet-connected',
    'ton-wallet-mnemonic',
    'ton-bridge-session',
    'ton-bridge-connections',
  ]

  keysToRemove.forEach((key) => {
    try {
      localStorage.removeItem(key)
      console.log(`Removed localStorage key: ${key}`)
    } catch (error) {
      console.error(`Failed to remove ${key}:`, error)
    }
  })

  // 确保清除任何残留的相关数据
  try {
    // 获取所有 localStorage 键并清除任何以 'ton-' 开头的键
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      if (key && key.startsWith('ton-') && key !== 'vite-ui-theme') {
        localStorage.removeItem(key)
        console.log(`Removed additional key: ${key}`)
      }
    }
  } catch (error) {
    console.error('Failed to clear additional keys:', error)
  }

  console.log('All wallet data cleared successfully')
})

// 恢复钱包数据的验证 atom
export const isWalletDataValidAtom = atom((get) => {
  const walletInfo = get(walletInfoAtom)
  const mnemonic = get(walletMnemonicAtom)
  const isConnected = get(isConnectedAtom)

  // 验证数据完整性
  if (!isConnected) return false
  if (!walletInfo || !mnemonic) return false
  if (!walletInfo.address || !walletInfo.publicKey) return false
  if (!Array.isArray(mnemonic) || mnemonic.length === 0) return false

  return true
})

// 交易确认状态
export const pendingTransactionAtom = atom<{
  transaction: {
    valid_until: number
    messages: Array<{
      address: string
      amount: string
      payload?: string
    }>
  }
  resolve: (approved: boolean) => void
} | null>(null)
