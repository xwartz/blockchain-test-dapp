import { ChangeEvent, useMemo, useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Check,
  Coins,
  Input,
  Label,
  Loader2,
  Separator,
  Send,
  Textarea,
  ThemeProvider,
  Wallet,
  X,
  useToast,
} from '@repo/ui'
import {
  buildApproveAndUnknownMultiContractTx,
  DEFAULT_AMOUNT,
  DEFAULT_FEE_LIMIT,
  DEFAULT_UNKNOWN_CONTRACT,
  DEFAULT_UNKNOWN_DATA,
  TRON_MAINNET_USDT,
  connectWallet,
  isWalletAvailable,
  signTransaction,
  summarizeTransaction,
  type PreviewForm,
  type WalletAccount,
} from '@/tron'
import type { TronTransaction } from '@/types'

type OperationStatus = 'idle' | 'building' | 'signing' | 'signed' | 'error'

interface OperationState {
  label: string
  status: OperationStatus
  unsignedTx: TronTransaction | null
  signedTx: TronTransaction | null
  error: string
}

const initialForm: PreviewForm = {
  tokenAddress: TRON_MAINNET_USDT,
  unknownContract: DEFAULT_UNKNOWN_CONTRACT,
  spender: DEFAULT_UNKNOWN_CONTRACT,
  amount: DEFAULT_AMOUNT,
  unknownData: DEFAULT_UNKNOWN_DATA,
  functionSelector: 'approveAndCall(address,address,uint256,bytes)',
  feeLimit: DEFAULT_FEE_LIMIT,
}

const initialOperation: OperationState = {
  label: 'Single transaction with two contract calls',
  status: 'idle',
  unsignedTx: null,
  signedTx: null,
  error: '',
}

function shortenAddress(address: string): string {
  if (!address) return ''
  if (address.length <= 16) return address
  return `${address.slice(0, 8)}...${address.slice(-6)}`
}

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="max-h-80 overflow-auto rounded-md border bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}

function StatusPill({ status }: { status: OperationStatus }) {
  const styles: Record<OperationStatus, string> = {
    idle: 'border-muted-foreground/30 text-muted-foreground',
    building: 'border-blue-400/40 text-blue-600 dark:text-blue-300',
    signing: 'border-amber-400/50 text-amber-700 dark:text-amber-300',
    signed: 'border-green-500/50 text-green-700 dark:text-green-300',
    error: 'border-red-500/50 text-red-700 dark:text-red-300',
  }
  return (
    <span
      className={`inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange(event.target.value)
        }
        className="font-mono text-xs"
      />
    </div>
  )
}

function TransactionSummary({
  title,
  transaction,
}: {
  title: string
  transaction: TronTransaction | null
}) {
  if (!transaction) {
    return (
      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        {title} will appear after the transaction is built.
      </div>
    )
  }

  const summary = summarizeTransaction(transaction)
  return (
    <div className="space-y-3 rounded-md border p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {transaction.signature?.length ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-300">
            <Check className="h-3.5 w-3.5" />
            signed
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">unsigned</span>
        )}
      </div>
      <dl className="grid gap-2 text-xs sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Contract type</dt>
          <dd className="mt-1 break-all font-mono">{summary.contractType}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Contract entries</dt>
          <dd className="mt-1 break-all font-mono">{summary.contractCount}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Tx ID</dt>
          <dd className="mt-1 break-all font-mono">{summary.txId}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Contract address hex</dt>
          <dd className="mt-1 break-all font-mono">
            {summary.contractAddress}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Owner address hex</dt>
          <dd className="mt-1 break-all font-mono">{summary.ownerAddress}</dd>
        </div>
      </dl>
      <div>
        <p className="mb-2 text-xs text-muted-foreground">Encoded call data</p>
        <p className="max-h-24 overflow-auto break-all rounded bg-muted/40 p-2 font-mono text-xs">
          {summary.data || 'No data'}
        </p>
      </div>
    </div>
  )
}

function AppContent() {
  const { toast } = useToast()
  const [account, setAccount] = useState<WalletAccount | null>(null)
  const [form, setForm] = useState<PreviewForm>(initialForm)
  const [isConnecting, setIsConnecting] = useState(false)
  const [operation, setOperation] = useState<OperationState>(initialOperation)

  const previewPayload = useMemo(
    () => ({
      walletRequest: 'tronWeb.trx.sign(unsignedTransaction)',
      transaction: {
        rawDataContractCount: 2,
        contracts: [
          {
            contractAddress: form.tokenAddress,
            functionSelector: 'approve(address,uint256)',
            parameters: {
              spender: form.spender,
              amount: form.amount,
            },
          },
          {
            contractAddress: form.unknownContract,
            functionSelector: form.functionSelector,
            parameters: {
              data: form.unknownData,
            },
          },
        ],
      },
    }),
    [form],
  )

  const contractEntries = useMemo(
    () => ({
      unsignedContractCount:
        operation.unsignedTx?.raw_data?.contract?.length ?? 0,
      signedContractCount: operation.signedTx?.raw_data?.contract?.length ?? 0,
      unsignedContracts:
        operation.unsignedTx?.raw_data?.contract?.map((contract, index) => ({
          index,
          type: contract.type,
          value: contract.parameter?.value,
        })) ?? [],
      signedContracts:
        operation.signedTx?.raw_data?.contract?.map((contract, index) => ({
          index,
          type: contract.type,
          value: contract.parameter?.value,
        })) ?? [],
    }),
    [operation.signedTx, operation.unsignedTx],
  )

  const callPlan = useMemo(
    () => [
      {
        label: '1. USDT approve',
        contract: form.tokenAddress,
        selector: 'approve(address,uint256)',
      },
      {
        label: '2. Unknown contract call',
        contract: form.unknownContract,
        selector: form.functionSelector,
      },
    ],
    [form.functionSelector, form.tokenAddress, form.unknownContract],
  )

  const updateForm =
    (field: keyof PreviewForm) =>
    (value: string): void => {
      setForm((current) => ({ ...current, [field]: value }))
    }

  const handleConnect = async () => {
    if (!isWalletAvailable()) {
      toast({
        title: 'TRON Wallet Not Found',
        description: 'Install or unlock a wallet that injects TronWeb.',
        variant: 'destructive',
      })
      return
    }

    setIsConnecting(true)
    try {
      const nextAccount = await connectWallet()
      setAccount(nextAccount)
      toast({
        title: 'Connected',
        description: shortenAddress(nextAccount.address),
      })
    } catch (error) {
      toast({
        title: 'Connection Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setIsConnecting(false)
    }
  }

  const handleSign = async () => {
    if (!account) {
      toast({
        title: 'Wallet Required',
        description: 'Connect a TRON wallet before signing.',
        variant: 'destructive',
      })
      return
    }

    setOperation({
      label: 'Single transaction with two contract calls',
      status: 'building',
      unsignedTx: null,
      signedTx: null,
      error: '',
    })

    try {
      const unsignedTx = await buildApproveAndUnknownMultiContractTx(
        form,
        account.address,
      )

      setOperation((current) => ({
        ...current,
        status: 'signing',
        unsignedTx,
      }))

      const signedTx = await signTransaction(unsignedTx)

      setOperation((current) => ({
        ...current,
        status: 'signed',
        signedTx,
      }))
      toast({
        title: 'Signed',
        description:
          'One transaction with approve and unknown call signed. Nothing was broadcast.',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      setOperation((current) => ({
        ...current,
        status: 'error',
        error: message,
      }))
      toast({
        title: 'Sign Failed',
        description: message,
        variant: 'destructive',
      })
    }
  }

  const handleReset = () => {
    setForm(initialForm)
    setOperation(initialOperation)
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
        <header className="flex flex-col gap-4 border-b pb-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
              <Coins className="h-3.5 w-3.5" />
              TRON transaction preview lab
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-normal">
                One TRON signature with approve plus unknown call
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Build one raw TRON transaction whose raw_data.contract array
                contains two TriggerSmartContract entries: USDT approve first,
                unknown contract call second. Sign only, never broadcast.
              </p>
            </div>
          </div>

          <div className="flex min-w-64 flex-col gap-2 rounded-md border bg-card p-3">
            {account ? (
              <>
                <span className="text-xs text-muted-foreground">
                  Connected account
                </span>
                <span className="break-all font-mono text-xs">
                  {account.address}
                </span>
              </>
            ) : (
              <Button onClick={handleConnect} disabled={isConnecting}>
                {isConnecting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wallet className="mr-2 h-4 w-4" />
                )}
                {isConnecting ? 'Connecting' : 'Connect TRON Wallet'}
              </Button>
            )}
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.82fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Parameters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="USDT token"
                  value={form.tokenAddress}
                  onChange={updateForm('tokenAddress')}
                />
                <Field
                  label="Unknown contract"
                  value={form.unknownContract}
                  onChange={updateForm('unknownContract')}
                />
                <Field
                  label="Spender contract"
                  value={form.spender}
                  onChange={updateForm('spender')}
                />
                <Field
                  label="Amount in SUN"
                  value={form.amount}
                  onChange={updateForm('amount')}
                />
                <Field
                  label="Function selector"
                  value={form.functionSelector}
                  onChange={updateForm('functionSelector')}
                  placeholder="approveAndCall(address,address,uint256,bytes)"
                />
                <Field
                  label="Fee limit in SUN"
                  value={form.feeLimit}
                  onChange={updateForm('feeLimit')}
                />
              </div>

              <div className="space-y-2">
                <Label>Unknown call data</Label>
                <Textarea
                  value={form.unknownData}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                    updateForm('unknownData')(event.target.value)
                  }
                  className="min-h-24 font-mono text-xs"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {callPlan.map((call) => (
                  <div key={call.label} className="rounded-md border p-3">
                    <p className="text-sm font-medium">{call.label}</p>
                    <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
                      {call.contract}
                    </p>
                    <p className="mt-2 break-all font-mono text-xs">
                      {call.selector}
                    </p>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  onClick={() => void handleSign()}
                  disabled={
                    !account ||
                    operation.status === 'building' ||
                    operation.status === 'signing'
                  }
                  className="flex-1"
                >
                  {operation.status === 'building' ||
                  operation.status === 'signing' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Sign One Transaction
                </Button>
                <Button variant="ghost" onClick={handleReset}>
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
                <CardTitle>Current Run</CardTitle>
                <StatusPill status={operation.status} />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-md border bg-muted/25 p-4">
                  <p className="text-sm font-medium">{operation.label}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    This run sends one wallet signing request. The unsigned
                    transaction contains two contract entries in the same
                    raw_data.contract array.
                  </p>
                </div>

                {operation.error && (
                  <div className="flex gap-2 rounded-md border border-red-500/40 bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-300">
                    <X className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="break-words">{operation.error}</span>
                  </div>
                )}

                <TransactionSummary
                  title="Unsigned transaction"
                  transaction={operation.unsignedTx}
                />
                <TransactionSummary
                  title="Signed transaction"
                  transaction={operation.signedTx}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Raw Contract Entries</CardTitle>
              </CardHeader>
              <CardContent>
                <JsonBlock value={contractEntries} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Preview Payload</CardTitle>
              </CardHeader>
              <CardContent>
                <JsonBlock value={previewPayload} />
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}

export default App
