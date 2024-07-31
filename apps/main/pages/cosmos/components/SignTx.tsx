import { Label, Button, Input } from '@ui/components'
import { chains } from 'chain-registry'

export function SignTx({
  selectedChain,
  unSignedTx,
  onRecipientChange,
  onAmountChange,
  onMemoChange,
  onDenomChange,
  onSignTx,
}: {
  selectedChain: string
  unSignedTx: string
  onRecipientChange: React.ChangeEventHandler<HTMLInputElement>
  onAmountChange: React.ChangeEventHandler<HTMLInputElement>
  onMemoChange: React.ChangeEventHandler<HTMLInputElement>
  onDenomChange: React.ChangeEventHandler<HTMLInputElement>
  onSignTx: () => void
}) {
  const chain = chains.find((c) => c.chain_name === selectedChain)
  if (!chain) return null

  return (
    <div className="p-5 mx-auto text-center" style={{ maxWidth: '100%' }}>
      <h3 className="text-xl font-semibold">Sign Tx</h3>
      <div className="gap-1.5">
        <Label htmlFor="recipient">Recipient</Label>
        <Input
          type="text"
          id="recipient"
          placeholder="recipient"
          onChange={onRecipientChange}
        />
      </div>
      <div className="gap-1.5">
        <Label htmlFor="amount">Amount</Label>
        <Input
          type="number"
          id="amount"
          placeholder="amount"
          onChange={onAmountChange}
        />
      </div>
      <div className="gap-1.5">
        <Label htmlFor="denom">Denom</Label>
        <Input id="denom" placeholder="denom" onChange={onDenomChange} />
      </div>
      <div className="gap-1.5">
        <Label htmlFor="memo">Memo</Label>
        <Input id="memo" placeholder="memo" onChange={onMemoChange} />
      </div>
      <Button variant="default" onClick={onSignTx} className="mt-2">
        Sign
      </Button>
      <div className="mt-2">
        <p>unSigned Tx: </p>
        <code className="rounded bg-muted text-sm break-all">{unSignedTx}</code>
      </div>
    </div>
  )
}
