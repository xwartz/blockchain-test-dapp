import { useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  useToast,
  Loader2,
  Wallet,
  Bitcoin,
  Coins,
} from '@ui/components'
import { ImTokenWallet } from '@/utils/imtoken'
import { EthereumAccount, BitcoinAccount } from '@/types'

interface WalletConnectProps {
  onEthereumConnect: (account: EthereumAccount) => void
  onBitcoinConnect: (account: BitcoinAccount) => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

export function WalletConnect({
  onEthereumConnect,
  onBitcoinConnect,
  isLoading,
  setIsLoading,
}: WalletConnectProps) {
  const { toast } = useToast()
  const [wallet] = useState(new ImTokenWallet())
  const [connectingType, setConnectingType] = useState<
    'ethereum' | 'bitcoin' | null
  >(null)

  const handleConnectEthereum = async () => {
    if (!wallet.isInstalled()) {
      toast({
        title: 'imToken Not Found',
        description: 'Please install imToken wallet to continue.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    setConnectingType('ethereum')

    try {
      const account = await wallet.connectEthereum()
      onEthereumConnect(account)
      toast({
        title: 'Ethereum Connected',
        description: `Connected to ${account.address}`,
      })
    } catch (error) {
      console.error('Connect Ethereum error:', error)
      toast({
        title: 'Connection Failed',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to connect to Ethereum',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
      setConnectingType(null)
    }
  }

  const handleConnectBitcoin = async () => {
    if (!wallet.isInstalled()) {
      toast({
        title: 'imToken Not Found',
        description: 'Please install imToken wallet to continue.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    setConnectingType('bitcoin')

    try {
      const account = await wallet.connectBitcoin()
      onBitcoinConnect(account)
      toast({
        title: 'Bitcoin Connected',
        description: `Connected to ${account.address}`,
      })
    } catch (error) {
      console.error('Connect Bitcoin error:', error)
      toast({
        title: 'Connection Failed',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to connect to Bitcoin',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
      setConnectingType(null)
    }
  }

  if (!wallet.isInstalled()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            imToken Not Found
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            imToken wallet is not installed. Please install it to continue.
          </p>
          <Button
            className="w-full"
            onClick={() => window.open('https://token.im/', '_blank')}
          >
            Install imToken
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Ethereum Sepolia
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Connect to Ethereum Sepolia testnet to get your account address and
            interact with the blockchain.
          </p>
          <Button
            className="w-full"
            onClick={handleConnectEthereum}
            disabled={isLoading}
          >
            {connectingType === 'ethereum' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Coins className="mr-2 h-4 w-4" />
                Connect Ethereum
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bitcoin className="h-5 w-5" />
            Bitcoin Signet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Connect to Bitcoin Signet testnet to get your account address and
            public key.
          </p>
          <Button
            className="w-full"
            variant="outline"
            onClick={handleConnectBitcoin}
            disabled={isLoading}
          >
            {connectingType === 'bitcoin' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Bitcoin className="mr-2 h-4 w-4" />
                Connect Bitcoin
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
