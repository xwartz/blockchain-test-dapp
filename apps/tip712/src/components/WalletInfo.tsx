import { Card, CardContent, CardHeader, CardTitle } from '@ui/components'
import { useWalletState } from '@/store/hooks'

export function WalletInfo() {
  const { address, addressHex } = useWalletState()

  if (!address) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Wallet Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <InfoRow label="Base58 Address" value={address} />
        {addressHex && <InfoRow label="Hex Address" value={addressHex} />}
      </CardContent>
    </Card>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <p className="text-sm font-mono break-all mt-0.5 text-foreground">{value}</p>
    </div>
  )
}
