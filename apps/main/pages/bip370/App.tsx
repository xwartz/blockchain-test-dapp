import React, { useReducer, useCallback } from 'react'
import { Cable, Send, Unplug } from 'lucide-react'
import { ThemeProvider } from '@/components/theme-provider'
import { toPsbtNetwork } from '@/utils/network/transport'
import { useDefaultProvider } from '@/utils/providers'
import { Network } from '@/utils/providers/base'
import { createPSBT } from '@/utils/psbt/create'
import { decodeByNode, decodeFromHex, getSignature } from '@/utils/psbt/decode'
import { Label, Button, useToast, Separator, Textarea } from '@ui/components'

// State and Action types
type State = {
  connected: boolean
  network: Network | string
  address: string
  balance: string
  publicKey: string
  psbt: string
  signature: string
  unspent: string
  decodeRes: string
  decodeResFromNode: string
}

type Action =
  | { type: 'CONNECT'; payload: Partial<State> }
  | { type: 'DISCONNECT' }
  | { type: 'SET_UNSPENT'; payload: string }
  | { type: 'SET_PSBT'; payload: string }
  | { type: 'SET_SIGNATURE'; payload: string }
  | { type: 'SET_DECODE_RES'; payload: { local: string; node: string } }

// Initial state
const initialState: State = {
  connected: false,
  network: '',
  address: '',
  balance: '',
  publicKey: '',
  psbt: '',
  signature: '',
  unspent: '',
  decodeRes: '',
  decodeResFromNode: '',
}

// Reducer function
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'CONNECT':
      return { ...state, connected: true, ...action.payload }
    case 'DISCONNECT':
      return { ...initialState }
    case 'SET_UNSPENT':
      return { ...state, unspent: action.payload, psbt: '', signature: '' }
    case 'SET_PSBT':
      return {
        ...state,
        psbt: action.payload,
        signature: '',
        decodeRes: '',
        decodeResFromNode: '',
      }
    case 'SET_SIGNATURE':
      return { ...state, signature: action.payload }
    case 'SET_DECODE_RES':
      return {
        ...state,
        decodeRes: action.payload.local,
        decodeResFromNode: action.payload.node,
      }
    default:
      return state
  }
}

// Custom hook for wallet operations
function useWalletOperations(dispatch: React.Dispatch<Action>) {
  const provider = useDefaultProvider()
  const { toast } = useToast()

  const handleError = useCallback(
    (error: unknown, title: string) => {
      toast({
        title,
        description: JSON.stringify(error),
      })
    },
    [toast],
  )

  const onConnect = useCallback(async () => {
    try {
      await provider?.connectWallet()
      const network = await provider?.getNetwork()
      const address = await provider?.getAddress()
      const publicKey = await provider?.getPublicKeyHex()
      const balance = await provider?.getBalance()
      const utxos = await provider?.getUtxos(address ?? '')
      dispatch({
        type: 'CONNECT',
        payload: {
          network: network ?? '',
          address: address ?? '',
          publicKey: publicKey ?? '',
          balance: `${(balance ?? 0) / 1e8} BTC`,
          unspent: JSON.stringify(utxos, null, 2),
        },
      })
    } catch (error) {
      handleError(error, 'Connect failed')
    }
  }, [provider, dispatch, handleError])

  const onDisconnect = useCallback(() => {
    dispatch({ type: 'DISCONNECT' })
  }, [dispatch])

  return { onConnect, onDisconnect }
}

// Main App component
function App() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const { onConnect, onDisconnect } = useWalletOperations(dispatch)
  const provider = useDefaultProvider()
  const { toast } = useToast()

  const onChangeUnspent = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      dispatch({ type: 'SET_UNSPENT', payload: e.target.value })
    },
    [],
  )

  const onChangePsbtHex = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      dispatch({ type: 'SET_PSBT', payload: e.target.value })
    },
    [],
  )

  const onGenerate = useCallback(async () => {
    try {
      const netWorkFee = await provider?.getNetworkFees()
      const feeRate = netWorkFee?.fastestFee
      const result = createPSBT({
        toAddress: state.address,
        utxos: JSON.parse(state.unspent),
        amount: 1000,
        changeAddress: state.address,
        network: toPsbtNetwork(state.network as Network),
        feeRate: feeRate ?? 6,
      })
      dispatch({ type: 'SET_PSBT', payload: result })
      toast({ title: 'Generate Success' })
    } catch (err) {
      toast({
        title: 'Generate Failed',
        description: JSON.stringify(err),
      })
    }
  }, [provider, state.address, state.unspent, state.network, toast])

  const onSignPsbt = useCallback(async () => {
    try {
      console.log('>>> state.psbt', state.psbt)
      const result = await provider?.signPsbt(state.psbt)
      const signature = getSignature(result ?? '')
      dispatch({ type: 'SET_SIGNATURE', payload: signature ?? '' })
      toast({ title: 'Sign Success' })
    } catch (error) {
      toast({
        title: 'Sign Failed',
        description: JSON.stringify(error),
      })
    }
  }, [provider, state.psbt, toast])

  const onSignPsbts = useCallback(async () => {
    try {
      const result = await provider?.signPsbts([state.psbt])
      const signature = getSignature(result?.[0] ?? '')
      dispatch({ type: 'SET_SIGNATURE', payload: signature ?? '' })
      toast({ title: 'Sign Success' })
    } catch (error) {
      toast({
        title: 'Sign Failed',
        description: JSON.stringify(error),
      })
    }
  }, [provider, state.psbt, toast])

  const onDecode = useCallback(async () => {
    try {
      const localResult = decodeFromHex(state.psbt, state.network as Network)
      const nodeResult = await decodeByNode(state.psbt)
      dispatch({
        type: 'SET_DECODE_RES',
        payload: {
          local: JSON.stringify(localResult, null, 2),
          node: JSON.stringify(nodeResult, null, 2),
        },
      })
    } catch (error) {
      toast({
        title: 'Decode Failed',
        description: JSON.stringify(error),
      })
    }
  }, [state.psbt, state.network, toast])

  const onSend = useCallback(async () => {
    try {
      const result = await provider?.pushTx(state.signature)
      console.log('send', result)
      toast({ title: 'Send Success' })
    } catch (error) {
      toast({
        title: 'Send Failed',
        description: JSON.stringify(error),
      })
    }
  }, [provider, state.signature, toast])

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Header />
      <Separator />

      <div className="p-5 text-center" style={{ maxWidth: '100%' }}>
        <ConnectButton
          connected={state.connected}
          onConnect={onConnect}
          onDisconnect={onDisconnect}
        />

        <WalletInfo
          network={state.network}
          address={state.address}
          publicKey={state.publicKey}
          balance={state.balance}
        />
        <Separator />

        <SignPSBT
          unspent={state.unspent}
          psbt={state.psbt}
          signature={state.signature}
          decodeRes={state.decodeRes}
          decodeResFromNode={state.decodeResFromNode}
          onChangeUnspent={onChangeUnspent}
          onChangePsbtHex={onChangePsbtHex}
          onGenerate={onGenerate}
          onSignPsbt={onSignPsbt}
          onSignPsbts={onSignPsbts}
          onDecode={onDecode}
          onSend={onSend}
        />
      </div>
    </ThemeProvider>
  )
}

function Header() {
  return (
    <div className="text-center m-6">
      <h2 className="border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
        BIP-370
      </h2>
      <a
        className="text-sm text-muted-foreground"
        href="https://github.com/bitcoin/bips/blob/master/bip370.mediawiki"
        target="_blank"
      >
        github.com/bitcoin/bip370
      </a>
      <blockquote className="text-sm text-muted-foreground">
        Partially Signed Bitcoin Transaction Version 0 as described in BIP 174
        is unable to have new inputs and outputs be added to the transaction.
        The fixed global unsigned transaction cannot be changed which prevents
        any additional inputs or outputs to be added. PSBT Version 2 is intended
        to rectify this problem.
      </blockquote>
    </div>
  )
}

function WalletInfo({ network, address, balance }: Partial<State>) {
  return (
    <div className="m-5">
      <h3 className="text-xl font-semibold">Wallet Info</h3>
      <div className="mt-2">
        <p>Network: </p>
        <code className="rounded bg-muted text-sm break-all">{network}</code>
      </div>
      <div className="mt-2">
        <p>Address: </p>
        <code className="rounded bg-muted text-sm break-all">{address}</code>
      </div>
      <div className="mt-2">
        <p>Balance: </p>
        <code className="rounded bg-muted text-sm break-all">{balance}</code>
      </div>
    </div>
  )
}

// New ConnectButton component
function ConnectButton({
  connected,
  onConnect,
  onDisconnect,
}: {
  connected: boolean
  onConnect: () => void
  onDisconnect: () => void
}) {
  if (!connected) {
    return (
      <Button onClick={onConnect}>
        <Cable className="mr-2 h-4 w-4" /> Connect Wallet
      </Button>
    )
  }
  return (
    <Button variant="destructive" onClick={onDisconnect}>
      <Unplug className="mr-2 h-4 w-4" /> Disconnect Wallet
    </Button>
  )
}

// New SignPSBT component
function SignPSBT({
  unspent,
  psbt,
  signature,
  decodeRes,
  decodeResFromNode,
  onChangeUnspent,
  onChangePsbtHex,
  onGenerate,
  onSignPsbt,
  onSignPsbts,
  onDecode,
  onSend,
}: {
  unspent: string
  psbt: string
  signature: string
  decodeRes: string
  decodeResFromNode: string
  onChangeUnspent: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onChangePsbtHex: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onGenerate: () => void
  onSignPsbt: () => void
  onSignPsbts: () => void
  onDecode: () => void
  onSend: () => void
}) {
  return (
    <div className="m-5 text-center">
      <h3 className="text-xl font-semibold">Sign PSBT</h3>

      <div className="mt-4 grid w-full gap-2 grid w-full max-w-2xl mx-auto">
        <Label htmlFor="utxos">Generate PSBT</Label>
        <Textarea
          rows={10}
          placeholder="Type your UTXOs here."
          id="utxos"
          defaultValue={unspent}
          onChange={onChangeUnspent}
        />
        <Button variant="secondary" onClick={onGenerate}>
          Generate
        </Button>
      </div>

      <div className="mt-4 grid w-full gap-2 grid w-full max-w-2xl mx-auto">
        <Label htmlFor="message">PSBT Hex: </Label>
        <Textarea
          placeholder="Type your PSBT Hex here."
          id="message"
          defaultValue={psbt}
          onChange={onChangePsbtHex}
        />
        <Button onClick={onSignPsbt}>SignPsbt</Button>
        <Button variant="secondary" onClick={onSignPsbts}>
          SignPsbts
        </Button>
        <div className="mt-2">
          <p>Signature: </p>
          <code className="rounded bg-muted text-sm break-all">
            {signature}
          </code>
        </div>
        <Button variant="destructive" onClick={onSend}>
          <Send className="mr-2 h-4 w-4" /> Send
        </Button>
      </div>
      <div className="mt-4 grid w-full gap-2 grid w-full max-w-2xl mx-auto">
        <Button variant="outline" onClick={onDecode}>
          Decode
        </Button>
        <div className="mt-2">
          <p className="mb-2">decode result(local): </p>
          <Textarea defaultValue={decodeRes} rows={15} />
        </div>
        <div className="mt-2">
          <p className="mb-2">decode result(RPC Node): </p>
          <Textarea defaultValue={decodeResFromNode} rows={15} />
        </div>
      </div>
    </div>
  )
}

export default App
