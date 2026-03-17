import { State } from '../state'

export function WalletInfo({
  selectedChainName,
  publicKey,
  address,
  accountNumber,
  sequence,
  balances,
}: Partial<State>) {
  return (
    <div className="px-4 py-5 max-w-xl mx-auto space-y-3">
      <h3 className="text-xl font-semibold">Wallet Info</h3>
      <div>
        <p className="text-sm text-muted-foreground">Chain</p>
        <code className="rounded bg-muted text-sm break-all block p-1">
          {selectedChainName}
        </code>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Public Key</p>
        <code className="rounded bg-muted text-sm break-all block p-1">
          {publicKey}
        </code>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Address</p>
        <code className="rounded bg-muted text-sm break-all block p-1">
          {address}
        </code>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Account Number</p>
        <code className="rounded bg-muted text-sm break-all block p-1">
          {accountNumber}
        </code>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Sequence</p>
        <code className="rounded bg-muted text-sm break-all block p-1">
          {sequence}
        </code>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Balances</p>
        <code className="rounded bg-muted text-sm break-all block p-1 whitespace-pre-wrap">
          {JSON.stringify(balances, null, 2)}
        </code>
      </div>
    </div>
  )
}
