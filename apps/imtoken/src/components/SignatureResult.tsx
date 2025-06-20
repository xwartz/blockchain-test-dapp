import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
} from '@ui/components'

interface SignatureResultProps {
  signature: string
  onClear: () => void
}

export function SignatureResult({ signature, onClear }: SignatureResultProps) {
  if (!signature) {
    return null
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(signature)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const isTransactionHash =
    signature.startsWith('0x') && signature.length === 66

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {isTransactionHash ? 'Transaction Hash' : 'Signature Result'}
          <Button variant="outline" size="sm" onClick={onClear}>
            Clear
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            {isTransactionHash ? 'Hash:' : 'Signature:'}
          </p>
          <div className="relative">
            <code className="block w-full p-3 text-sm bg-muted rounded border break-all">
              {signature}
            </code>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={copyToClipboard}
            className="flex-1"
          >
            Copy to Clipboard
          </Button>

          {isTransactionHash && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                window.open(
                  `https://sepolia.etherscan.io/tx/${signature}`,
                  '_blank',
                )
              }
              className="flex-1"
            >
              View on Etherscan
            </Button>
          )}
        </div>

        {!isTransactionHash && (
          <div className="text-xs text-muted-foreground">
            <p>
              This signature can be used to verify that the message was signed
              by the connected wallet address.
            </p>
          </div>
        )}

        {isTransactionHash && (
          <div className="text-xs text-muted-foreground">
            <p>
              Transaction has been submitted to the Ethereum Sepolia network.
              Click "View on Etherscan" to check the status.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
