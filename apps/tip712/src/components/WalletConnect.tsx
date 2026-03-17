import { Button, Wallet } from '@ui/components'
import { useWalletState, useWalletActions } from '@/store/hooks'
import {
  connectWallet,
  isTronWalletAvailable,
  getCurrentAddress,
} from '@/utils/tronlink'
import { useToast } from '@ui/components'
import { useEffect } from 'react'

export function WalletConnect() {
  const { isConnected, address, isLoading } = useWalletState()
  const { setIsConnected, setAddress, setAddressHex, setIsLoading, clearAll } =
    useWalletActions()
  const { toast } = useToast()

  // Auto-reconnect on mount only (not after manual disconnect)
  useEffect(() => {
    if (!isTronWalletAvailable()) return
    const addr = getCurrentAddress()
    if (addr) {
      setAddress(addr)
      setIsConnected(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleConnect = async () => {
    if (!isTronWalletAvailable()) {
      toast({
        title: 'Wallet Not Found',
        description: 'Please install a Tron wallet extension (e.g. TronLink).',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      const { address: addr, addressHex } = await connectWallet()
      setAddress(addr)
      setAddressHex(addressHex)
      setIsConnected(true)
      toast({
        title: 'Connected',
        description: `${addr.slice(0, 8)}...${addr.slice(-6)}`,
      })
    } catch (err) {
      toast({
        title: 'Connection Failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisconnect = () => {
    clearAll()
    toast({ title: 'Disconnected', description: 'Wallet disconnected.' })
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <div>
            <span className="text-sm font-medium text-green-700 dark:text-green-300">
              Connected
            </span>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              {address}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleDisconnect}>
          Disconnect
        </Button>
      </div>
    )
  }

  return (
    <Button onClick={handleConnect} disabled={isLoading} className="w-full">
      <Wallet className="mr-2 h-4 w-4" />
      {isLoading ? 'Connecting...' : 'Connect Wallet'}
    </Button>
  )
}
