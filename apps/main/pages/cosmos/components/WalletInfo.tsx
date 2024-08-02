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
    <div className="p-5 text-center" style={{ maxWidth: '100%' }}>
      <h3 className="text-xl font-semibold">Wallet Info</h3>
      <div className="mt-2">
        <p>Chain: </p>
        <code className="rounded bg-muted text-sm break-all">
          {selectedChainName}
        </code>
      </div>
      <div className="mt-2">
        <p>Public Key: </p>
        <code className="rounded bg-muted text-sm break-all">{publicKey}</code>
      </div>
      <div className="mt-2">
        <p>Address: </p>
        <code className="rounded bg-muted text-sm break-all">{address}</code>
      </div>
      <div className="mt-2">
        <p>Account Number: </p>
        <code className="rounded bg-muted text-sm break-all">
          {accountNumber}
        </code>
      </div>
      <div className="mt-2">
        <p>Sequence: </p>
        <code className="rounded bg-muted text-sm break-all">{sequence}</code>
      </div>
      <div className="mt-2">
        <p>Balances: </p>
        <code className="rounded bg-muted text-sm break-all">
          {JSON.stringify(balances, null, 2)}
        </code>
      </div>
    </div>
  )
}
