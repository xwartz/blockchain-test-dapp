import { useEffect, useState } from 'react'
import { Provider } from 'jotai'
import {
  ThemeProvider,
  ModeToggle,
  Separator,
  Button,
  useToast,
} from '@ui/components'
import {
  useWalletState,
  useWalletActions,
  useInitialize,
  usePersistedEthereumAddress,
  usePersistedBitcoinAddress,
} from '@/store/hooks'
import { Header } from '@/components/Header'
import { WalletConnect } from '@/components/WalletConnect'
import { WalletInfo } from '@/components/WalletInfo'
import { SigningActions } from '@/components/SigningActions'
import { SignatureResult } from '@/components/SignatureResult'
import { ImTokenWallet } from '@/utils/imtoken'
import { EthereumAccount, BitcoinAccount } from '@/types'

function AppContent() {
  const { toast } = useToast()
  const walletState = useWalletState()
  const walletActions = useWalletActions()
  const initialize = useInitialize()
  const [, setPersistedEthAddress] = usePersistedEthereumAddress()
  const [, setPersistedBtcAddress] = usePersistedBitcoinAddress()

  const [wallet] = useState(new ImTokenWallet())
  const [ethereumBalance, setEthereumBalance] = useState<string>('')

  // Initialize application state
  useEffect(() => {
    initialize()
  }, [initialize])

  // Fetch balance when connected to Ethereum
  useEffect(() => {
    const fetchBalance = async () => {
      if (walletState.ethereumAccount) {
        try {
          const balance = await wallet.getEthereumBalance(
            walletState.ethereumAccount.address,
          )
          setEthereumBalance(balance)
        } catch (error) {
          console.error('Failed to fetch balance:', error)
        }
      }
    }

    fetchBalance()
  }, [walletState.ethereumAccount, wallet])

  // Listen for wallet account changes
  useEffect(() => {
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        // User disconnected
        walletActions.clearAllData()
        toast({
          title: 'Wallet Disconnected',
          description: 'imToken wallet has been disconnected.',
        })
      } else {
        // Account changed
        const newAddress = accounts[0]
        if (
          walletState.ethereumAccount &&
          newAddress !== walletState.ethereumAccount.address
        ) {
          walletActions.setEthereumAccount({
            address: newAddress,
            chainId: walletState.ethereumAccount.chainId,
            network: walletState.ethereumAccount.network,
          })
          setPersistedEthAddress(newAddress)
          toast({
            title: 'Account Changed',
            description: `Switched to ${newAddress}`,
          })
        }
      }
    }

    const handleChainChanged = (chainId: string) => {
      const numericChainId = parseInt(chainId, 16)
      if (numericChainId !== 11155111) {
        // Not Sepolia
        toast({
          title: 'Network Changed',
          description: 'Please switch back to Sepolia network.',
          variant: 'destructive',
        })
      }
    }

    wallet.onAccountsChanged(handleAccountsChanged)
    wallet.onChainChanged(handleChainChanged)

    return () => {
      // Cleanup listeners (if wallet supports removeListener)
    }
  }, [
    walletState.ethereumAccount,
    walletActions,
    setPersistedEthAddress,
    wallet,
    toast,
  ])

  const handleEthereumConnect = (account: EthereumAccount) => {
    walletActions.setEthereumAccount(account)
    setPersistedEthAddress(account.address)
    if (!walletState.isConnected) {
      walletActions.setIsConnected(true)
    }
  }

  const handleBitcoinConnect = (account: BitcoinAccount) => {
    walletActions.setBitcoinAccount(account)
    setPersistedBtcAddress(account.address)
    // Save Bitcoin public key to local storage
    localStorage.setItem('imtoken_bitcoin_publickey', account.publicKey)
    if (!walletState.isConnected) {
      walletActions.setIsConnected(true)
    }
  }

  const handleSignatureResult = (signature: string) => {
    walletActions.setSignatureResult(signature)
  }

  const handleClearSignature = () => {
    walletActions.setSignatureResult('')
  }

  const handleDisconnect = () => {
    walletActions.clearAllData()
    setEthereumBalance('')
    toast({
      title: 'Disconnected',
      description: 'All wallet data has been cleared.',
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Header />
          <ModeToggle />
        </div>

        <div className="space-y-8">
          {/* Connection status indicator */}
          {walletState.isConnected && (
            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-green-700 dark:text-green-300">
                  Wallet Connected
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={handleDisconnect}>
                Disconnect
              </Button>
            </div>
          )}

          {/* Wallet connection */}
          {!walletState.isConnected && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Connect Wallet</h3>
              <WalletConnect
                onEthereumConnect={handleEthereumConnect}
                onBitcoinConnect={handleBitcoinConnect}
                isLoading={walletState.isLoading}
                setIsLoading={walletActions.setIsLoading}
              />
            </div>
          )}

          {/* Connected wallet connection options */}
          {walletState.isConnected && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Add More Accounts</h3>
              <WalletConnect
                onEthereumConnect={handleEthereumConnect}
                onBitcoinConnect={handleBitcoinConnect}
                isLoading={walletState.isLoading}
                setIsLoading={walletActions.setIsLoading}
              />
            </div>
          )}

          <Separator />

          {/* Wallet information */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Wallet Information</h3>
            <WalletInfo
              ethereumAccount={walletState.ethereumAccount}
              bitcoinAccount={walletState.bitcoinAccount}
              ethereumBalance={ethereumBalance}
            />
          </div>

          <Separator />

          {/* Signing operations */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Ethereum Signing</h3>
            <SigningActions
              ethereumAccount={walletState.ethereumAccount}
              onSignatureResult={handleSignatureResult}
              isLoading={walletState.isLoading}
              setIsLoading={walletActions.setIsLoading}
            />
          </div>

          {/* Signature results */}
          {walletState.signatureResult && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-4">Result</h3>
                <SignatureResult
                  signature={walletState.signatureResult}
                  onClear={handleClearSignature}
                />
              </div>
            </>
          )}
        </div>
      </div>
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
