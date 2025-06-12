import { useCallback, useState, useEffect, useRef } from 'react'
import { Provider } from 'jotai'
import {
  ThemeProvider,
  ModeToggle,
  Label,
  Button,
  useToast,
  Separator,
  Textarea,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@repo/ui'
import { TonWallet } from './utils/ton/wallet.js'
import { TonConnectWalletBridge } from './utils/ton-connect/wallet-bridge.js'
import { TonConnectInfo } from './components/TonConnectInfo.js'
import { TransactionPreview } from './components/TransactionPreview.js'
import AddressComparison from './components/AddressComparison.js'
import type { WalletInfo } from './types/index.js'
import {
  useWalletState,
  useWalletActions,
  usePendingTransaction,
  useClearAllData,
  useIsWalletDataValid,
  useWalletMnemonicValue,
} from './store/hooks.js'

function Header() {
  return (
    <div className="relative">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-blue-950/20 dark:via-background dark:to-blue-950/20" />

      <div className="relative px-6 py-8">
        <div className="flex justify-between items-start max-w-4xl mx-auto">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-xl font-bold">T</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                  TON Wallet
                </h1>
                <p className="text-sm text-muted-foreground">
                  The Open Network Wallet
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground max-w-md">
              A secure and user-friendly wallet for the TON blockchain with full
              TON Connect support
            </p>
          </div>
          <ModeToggle />
        </div>
      </div>
    </div>
  )
}

function WalletInfo({
  walletInfo,
  onClearWallet,
}: {
  walletInfo: WalletInfo | null
  onClearWallet: () => void
}) {
  if (!walletInfo) return null

  return (
    <div className="max-w-4xl mx-auto px-6 pb-6">
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">💎</span>
            </div>
            <div>
              <CardTitle className="text-xl">Wallet Overview</CardTitle>
              <p className="text-sm text-muted-foreground">
                Your TON wallet details
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClearWallet}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
          >
            Clear Wallet
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-4 bg-white/60 dark:bg-gray-800/60 rounded-lg border">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  User-Friendly Address
                </Label>
                <p className="text-sm font-mono mt-1 break-all leading-relaxed">
                  {walletInfo.userFriendlyAddress || walletInfo.address}
                </p>
                {walletInfo.rawAddress && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Raw Address
                    </Label>
                    <p className="text-xs font-mono mt-1 break-all leading-relaxed text-muted-foreground">
                      {walletInfo.rawAddress}
                    </p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-white/60 dark:bg-gray-800/60 rounded-lg border">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Public Key
                </Label>
                <p className="text-sm font-mono mt-1 break-all leading-relaxed">
                  {walletInfo.publicKey}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 rounded-lg border border-blue-200 dark:border-blue-800">
                <Label className="text-xs font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                  Balance
                </Label>
                <div className="flex items-baseline space-x-2 mt-2">
                  <span className="text-3xl font-bold text-blue-800 dark:text-blue-200">
                    {parseFloat(walletInfo.balance).toFixed(4)}
                  </span>
                  <span className="text-lg text-blue-600 dark:text-blue-400 font-medium">
                    TON
                  </span>
                </div>
              </div>

              <div className="p-4 bg-white/60 dark:bg-gray-800/60 rounded-lg border">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Wallet Version
                </Label>
                <p className="text-sm font-medium mt-1">{walletInfo.version}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface CreateWalletProps {
  onCreateWallet: (mnemonic: string[]) => void
  onImportWallet: (mnemonic: string) => void
  isLoading: boolean
}

function CreateWallet({
  onCreateWallet,
  onImportWallet,
  isLoading,
}: CreateWalletProps) {
  const [mnemonic, setMnemonic] = useState('')

  const handleGenerateWallet = async () => {
    const wallet = new TonWallet()
    const generatedMnemonic = await wallet.generateMnemonic()
    onCreateWallet(generatedMnemonic)
  }

  const handleImportWallet = () => {
    if (!mnemonic.trim()) return
    const mnemonicArray = mnemonic.trim().split(' ')
    onImportWallet(mnemonicArray.join(' '))
  }

  return (
    <div className="max-w-2xl mx-auto px-6">
      <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50">
        <CardHeader className="text-center pb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white text-2xl">🚀</span>
          </div>
          <CardTitle className="text-2xl">Get Started</CardTitle>
          <p className="text-muted-foreground">
            Create a new wallet or import an existing one to start using TON
          </p>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Generate New Wallet */}
          <div className="text-center">
            <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 rounded-xl border border-green-200 dark:border-green-800">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-xl">✨</span>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-green-800 dark:text-green-200">
                Create New Wallet
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300 mb-4">
                Generate a brand new wallet with a secure 12-word recovery
                phrase
              </p>
              <Button
                onClick={handleGenerateWallet}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Creating Wallet...
                  </>
                ) : (
                  <>✨ Generate New Wallet</>
                )}
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                or
              </span>
            </div>
          </div>

          {/* Import Existing Wallet */}
          <div className="space-y-4">
            <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 rounded-xl border border-blue-200 dark:border-blue-800">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <span className="text-white text-xl">🔑</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">
                    Import Existing Wallet
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Enter your 12 or 24 word recovery phrase
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="mnemonic" className="text-sm font-medium">
                    Recovery Phrase
                  </Label>
                  <Textarea
                    id="mnemonic"
                    placeholder="word1 word2 word3 ... (enter your recovery phrase here)"
                    value={mnemonic}
                    onChange={(e) => setMnemonic(e.target.value)}
                    rows={3}
                    className="mt-2 resize-none font-mono text-sm"
                  />
                </div>
                <Button
                  onClick={handleImportWallet}
                  disabled={isLoading || !mnemonic.trim()}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      Importing...
                    </>
                  ) : (
                    <>🔑 Import Wallet</>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="text-center text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="flex items-center justify-center space-x-2">
              <span>🔒</span>
              <span>
                Your recovery phrase is stored securely on your device and never
                shared
              </span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function AppContent() {
  const { toast } = useToast()
  const [wallet] = useState(() => new TonWallet())
  const [tonConnectBridge] = useState(() => new TonConnectWalletBridge())

  // 使用 ref 来跨重新渲染保持状态
  const hasRestoredRef = useRef(false)
  const isClearingRef = useRef(false)

  // Jotai state
  const { walletInfo, isConnected, isLoading } = useWalletState()
  const { setWalletInfo, setIsConnected, setIsLoading, setMnemonic } =
    useWalletActions()
  const [pendingTransaction, setPendingTransaction] = usePendingTransaction()
  const clearAllData = useClearAllData()
  const isWalletDataValid = useIsWalletDataValid()
  const storedMnemonic = useWalletMnemonicValue()

  // 稳定的函数引用
  const stableSetWalletInfo = useCallback(setWalletInfo, [setWalletInfo])
  const stableSetIsConnected = useCallback(setIsConnected, [setIsConnected])
  const stableSetIsLoading = useCallback(setIsLoading, [setIsLoading])
  const stableSetPendingTransaction = useCallback(setPendingTransaction, [
    setPendingTransaction,
  ])
  const stableClearAllData = useCallback(clearAllData, [clearAllData])

  // 在组件挂载时尝试从存储恢复钱包
  useEffect(() => {
    const restoreWallet = async () => {
      // 防止重复恢复或在清除过程中恢复
      if (hasRestoredRef.current || isClearingRef.current) {
        console.log(
          'Skipping restore: already restored or clearing in progress',
        )
        return
      }

      try {
        // 检查数据是否有效
        if (!isWalletDataValid) {
          console.log('No valid wallet data found')
          return
        }

        if (!storedMnemonic) {
          console.log('Missing stored mnemonic')
          return
        }

        // 如果已经连接，跳过恢复
        if (isConnected) {
          console.log('Wallet already connected, skipping restore')
          return
        }

        console.log('Starting wallet restoration...')
        hasRestoredRef.current = true
        setIsLoading(true)

        // 从存储的助记词重新创建钱包
        const restoredWalletInfo = await wallet.createWallet(storedMnemonic)

        // 更新钱包信息（包括最新余额）
        stableSetWalletInfo(restoredWalletInfo)
        stableSetIsConnected(true)

        // 设置钱包信息到 TON Connect 组件
        tonConnectBridge.setWalletInfo(restoredWalletInfo)
        tonConnectBridge.setTonWallet(wallet)

        // 设置交易确认回调
        tonConnectBridge.setTransactionHandler((transaction) => {
          return new Promise((resolve) => {
            stableSetPendingTransaction({ transaction, resolve })
          })
        })

        // 启动 HTTP Bridge 监听
        await tonConnectBridge.startListening()

        toast({
          title: 'Wallet restored!',
          description: 'Your wallet has been restored from storage.',
        })
      } catch (error) {
        console.error('Failed to restore wallet:', error)
        // 如果恢复失败，重置恢复标志并清除所有数据
        hasRestoredRef.current = false
        stableClearAllData()
        toast({
          title: 'Restore failed',
          description: 'Failed to restore wallet, please create a new one.',
          variant: 'destructive',
        })
      } finally {
        stableSetIsLoading(false)
      }
    }

    restoreWallet()
  }, [
    isWalletDataValid,
    storedMnemonic,
    isConnected,
    wallet,
    tonConnectBridge,
    toast,
    stableSetWalletInfo,
    stableSetIsConnected,
    stableSetIsLoading,
    stableSetPendingTransaction,
    stableClearAllData,
    setIsLoading,
  ])

  const handleError = useCallback(
    (error: unknown, title: string) => {
      toast({
        title,
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive',
      })
    },
    [toast],
  )

  const onCreateWallet = useCallback(
    async (mnemonic: string[]) => {
      try {
        setIsLoading(true)
        const walletInfo = await wallet.createWallet(mnemonic)

        // 使用 Jotai 更新状态
        setWalletInfo(walletInfo)
        setIsConnected(true)
        setMnemonic(mnemonic)

        // 设置钱包信息到 TON Connect 组件
        tonConnectBridge.setWalletInfo(walletInfo)
        tonConnectBridge.setTonWallet(wallet)

        // 设置交易确认回调
        tonConnectBridge.setTransactionHandler((transaction) => {
          return new Promise((resolve) => {
            setPendingTransaction({ transaction, resolve })
          })
        })

        // 启动 HTTP Bridge 监听
        await tonConnectBridge.startListening()

        // 标记为已恢复，防止重复恢复
        hasRestoredRef.current = true

        toast({
          title: 'Wallet created successfully!',
          description: 'HTTP Bridge is now listening for dApp connections.',
        })
      } catch (error) {
        handleError(error, 'Failed to create wallet')
      } finally {
        setIsLoading(false)
      }
    },
    [
      wallet,
      tonConnectBridge,
      toast,
      handleError,
      setWalletInfo,
      setIsConnected,
      setIsLoading,
      setMnemonic,
      setPendingTransaction,
    ],
  )

  const onImportWallet = useCallback(
    async (mnemonicString: string) => {
      try {
        setIsLoading(true)
        const mnemonic = mnemonicString.split(' ')
        const walletInfo = await wallet.createWallet(mnemonic)

        // 使用 Jotai 更新状态
        setWalletInfo(walletInfo)
        setIsConnected(true)
        setMnemonic(mnemonic)

        // 设置钱包信息到 TON Connect 组件
        tonConnectBridge.setWalletInfo(walletInfo)
        tonConnectBridge.setTonWallet(wallet)

        // 设置交易确认回调
        tonConnectBridge.setTransactionHandler((transaction) => {
          return new Promise((resolve) => {
            setPendingTransaction({ transaction, resolve })
          })
        })

        // 启动 HTTP Bridge 监听
        await tonConnectBridge.startListening()

        // 标记为已恢复，防止重复恢复
        hasRestoredRef.current = true

        toast({
          title: 'Wallet imported successfully!',
          description: 'HTTP Bridge is now listening for dApp connections.',
        })
      } catch (error) {
        handleError(error, 'Failed to import wallet')
      } finally {
        setIsLoading(false)
      }
    },
    [
      wallet,
      tonConnectBridge,
      toast,
      handleError,
      setWalletInfo,
      setIsConnected,
      setIsLoading,
      setMnemonic,
      setPendingTransaction,
    ],
  )

  // 处理清除钱包 - 使用 Jotai action
  const handleClearWallet = useCallback(() => {
    try {
      console.log('Starting wallet clear process...')

      // 设置清除标志，防止自动恢复
      isClearingRef.current = true
      hasRestoredRef.current = false

      // 首先设置 loading 状态
      setIsLoading(true)

      // 停止 bridge 监听
      tonConnectBridge.stop()
      tonConnectBridge.disconnect()

      // 重置钱包实例
      wallet.reset()

      // 使用 Jotai action 清除所有数据
      clearAllData()

      console.log('Wallet data cleared successfully')

      toast({
        title: 'Wallet cleared',
        description: 'All wallet data has been removed successfully.',
      })
    } catch (error) {
      console.error('Error during wallet clear:', error)
      toast({
        title: 'Clear failed',
        description:
          'Failed to clear wallet data completely. Please refresh the page.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
      // 清除完成后，重置清除标志
      setTimeout(() => {
        isClearingRef.current = false
      }, 100)
    }
  }, [tonConnectBridge, wallet, clearAllData, toast, setIsLoading])

  // 处理交易确认
  const handleTransactionApprove = useCallback(() => {
    if (pendingTransaction) {
      pendingTransaction.resolve(true)
      setPendingTransaction(null)
    }
  }, [pendingTransaction, setPendingTransaction])

  const handleTransactionReject = useCallback(() => {
    if (pendingTransaction) {
      pendingTransaction.resolve(false)
      setPendingTransaction(null)
    }
  }, [pendingTransaction, setPendingTransaction])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 dark:from-gray-950 dark:via-background dark:to-blue-950/20">
      <Header />

      <div className="py-8">
        {isConnected ? (
          <div className="space-y-8">
            <WalletInfo
              walletInfo={walletInfo}
              onClearWallet={handleClearWallet}
            />
            <TonConnectInfo
              httpBridge={tonConnectBridge}
              isConnected={isConnected}
            />
          </div>
        ) : (
          <div className="space-y-8">
            <CreateWallet
              onCreateWallet={onCreateWallet}
              onImportWallet={onImportWallet}
              isLoading={isLoading}
            />
            <AddressComparison />
          </div>
        )}
      </div>

      {/* Transaction Preview Modal */}
      <TransactionPreview
        isOpen={!!pendingTransaction}
        transaction={pendingTransaction?.transaction || null}
        onApprove={handleTransactionApprove}
        onReject={handleTransactionReject}
      />
    </div>
  )
}

function App() {
  return (
    <Provider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </Provider>
  )
}

export default App
