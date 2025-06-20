import { useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
  useToast,
} from '@ui/components'
import { ImTokenWallet } from '@/utils/imtoken'
import { EthereumAccount } from '@/types'

interface SigningActionsProps {
  ethereumAccount: EthereumAccount | null
  onSignatureResult: (signature: string) => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

export function SigningActions({
  ethereumAccount,
  onSignatureResult,
  isLoading,
  setIsLoading,
}: SigningActionsProps) {
  const { toast } = useToast()
  const [wallet] = useState(new ImTokenWallet())
  const [message, setMessage] = useState('Hello, imToken!')
  const [toAddress, setToAddress] = useState('')
  const [amount, setAmount] = useState('0.001')

  const handleSignMessage = async () => {
    if (!ethereumAccount) {
      toast({
        title: 'No Account',
        description: 'Please connect to Ethereum first.',
        variant: 'destructive',
      })
      return
    }

    if (!message.trim()) {
      toast({
        title: 'Empty Message',
        description: 'Please enter a message to sign.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    try {
      const signature = await wallet.signEthereumMessage(
        message,
        ethereumAccount.address,
      )
      onSignatureResult(signature)
      toast({
        title: 'Message Signed',
        description: 'Message has been successfully signed.',
      })
    } catch (error) {
      console.error('Sign message error:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to sign message'

      // Check if it's an account switching related error
      if (
        errorMessage.includes('Account mismatch') ||
        errorMessage.includes('switch to the correct')
      ) {
        toast({
          title: 'Account Switch Required',
          description: errorMessage,
          variant: 'destructive',
        })
      } else if (errorMessage.includes('Sepolia network')) {
        toast({
          title: 'Network Switch Required',
          description: 'Please switch to Sepolia network in imToken wallet.',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Signing Failed',
          description: errorMessage,
          variant: 'destructive',
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendTransaction = async () => {
    if (!ethereumAccount) {
      toast({
        title: 'No Account',
        description: 'Please connect to Ethereum first.',
        variant: 'destructive',
      })
      return
    }

    if (!toAddress.trim()) {
      toast({
        title: 'Invalid Address',
        description: 'Please enter a valid recipient address.',
        variant: 'destructive',
      })
      return
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    try {
      const txHash = await wallet.sendEthereumTransaction(
        toAddress,
        amount,
        ethereumAccount.address,
      )
      onSignatureResult(txHash)
      toast({
        title: 'Transaction Sent',
        description: `Transaction hash: ${txHash}`,
      })
    } catch (error) {
      console.error('Send transaction error:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to send transaction'

      // Check if it's an account switching related error
      if (
        errorMessage.includes('Account mismatch') ||
        errorMessage.includes('switch to the correct')
      ) {
        toast({
          title: 'Account Switch Required',
          description: errorMessage,
          variant: 'destructive',
        })
      } else if (errorMessage.includes('Sepolia network')) {
        toast({
          title: 'Network Switch Required',
          description: 'Please switch to Sepolia network in imToken wallet.',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Transaction Failed',
          description: errorMessage,
          variant: 'destructive',
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (!ethereumAccount) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ethereum Signing</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Please connect to Ethereum Sepolia network first to enable signing
            features.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sign Message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="message">Message to Sign</Label>
            <Textarea
              id="message"
              placeholder="Enter your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>
          <Button
            onClick={handleSignMessage}
            disabled={isLoading || !message.trim()}
            className="w-full"
          >
            {isLoading ? 'Signing...' : 'Sign Message'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Send Transaction</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="toAddress">Recipient Address</Label>
            <Input
              id="toAddress"
              placeholder="0x..."
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (ETH)</Label>
            <Input
              id="amount"
              type="number"
              step="0.001"
              placeholder="0.001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <Button
            onClick={handleSendTransaction}
            disabled={isLoading || !toAddress.trim() || !amount}
            className="w-full"
            variant="outline"
          >
            {isLoading ? 'Sending...' : 'Send Transaction'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
