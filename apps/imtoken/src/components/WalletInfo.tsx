import { Card, CardContent, CardHeader, CardTitle } from '@ui/components'
import { EthereumAccount, BitcoinAccount } from '@/types'

interface WalletInfoProps {
  ethereumAccount: EthereumAccount | null
  bitcoinAccount: BitcoinAccount | null
  ethereumBalance?: string
}

export function WalletInfo({
  ethereumAccount,
  bitcoinAccount,
  ethereumBalance,
}: WalletInfoProps) {
  if (!ethereumAccount && !bitcoinAccount) {
    return null
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {ethereumAccount && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ethereum Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Network:
              </p>
              <code className="text-sm bg-muted px-2 py-1 rounded">
                {ethereumAccount.network} (Chain ID: {ethereumAccount.chainId})
              </code>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Address:
              </p>
              <code className="text-sm bg-muted px-2 py-1 rounded break-all">
                {ethereumAccount.address}
              </code>
            </div>
            {ethereumBalance && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Balance:
                </p>
                <code className="text-sm bg-muted px-2 py-1 rounded">
                  {ethereumBalance} ETH
                </code>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {bitcoinAccount && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bitcoin Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Network:
              </p>
              <code className="text-sm bg-muted px-2 py-1 rounded">
                {bitcoinAccount.network}
              </code>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Address:
              </p>
              <code className="text-sm bg-muted px-2 py-1 rounded break-all">
                {bitcoinAccount.address}
              </code>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Public Key:
              </p>
              <code className="text-sm bg-muted px-2 py-1 rounded break-all">
                {bitcoinAccount.publicKey}
              </code>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
