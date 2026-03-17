import { Label, Button, Input } from '@ui/components'
import { chains } from 'chain-registry'

export function SignTx({
  selectedChainName,
  unSignedTx,
  signature,
  onRecipientChange,
  onAmountChange,
  onMemoChange,
  onDenomChange,
  onSignTx,
}: {
  selectedChainName: string
  unSignedTx: string
  signature: string
  onRecipientChange: React.ChangeEventHandler<HTMLInputElement>
  onAmountChange: React.ChangeEventHandler<HTMLInputElement>
  onMemoChange: React.ChangeEventHandler<HTMLInputElement>
  onDenomChange: React.ChangeEventHandler<HTMLInputElement>
  onSignTx: () => void
}) {
  const chain = chains.find((c) => c.chain_name === selectedChainName)
  if (!chain) return null

  return (
    <div className="px-4 py-5 max-w-xl mx-auto space-y-4">
      <h3 className="text-xl font-semibold">Sign Tx</h3>
      <div className="space-y-1">
        <Label htmlFor="recipient">Recipient</Label>
        <Input
          type="text"
          id="recipient"
          placeholder="recipient"
          onChange={onRecipientChange}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="amount">Amount</Label>
        <Input
          type="number"
          id="amount"
          placeholder="amount"
          onChange={onAmountChange}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="denom">Denom</Label>
        <Input id="denom" placeholder="denom" onChange={onDenomChange} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="memo">Memo</Label>
        <Input id="memo" placeholder="memo" onChange={onMemoChange} />
      </div>
      <Button variant="default" onClick={onSignTx} className="w-full sm:w-auto">
        Sign
      </Button>
      <div className="mt-2 text-left">
        <p>unSigned Tx: </p>
        <code className="rounded bg-muted text-sm break-all">{unSignedTx}</code>
      </div>
      <div className="mt-2 text-left">
        <p>Signature: </p>
        <code className="rounded bg-muted text-sm break-all">{signature}</code>
      </div>
    </div>
  )
}
