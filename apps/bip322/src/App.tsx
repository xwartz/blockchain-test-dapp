import { useReducer, useCallback, useMemo } from 'react'
import { ThemeProvider } from '@ui/components'
import {
  genPsbtOfBIP322Simple,
  verifyMessageOfBIP322Simple,
} from '@/utils/bip322/simple'
import { useDefaultProvider } from '@/utils/providers'
import { Network } from '@/utils/providers/base'
import {
  Label,
  Button,
  useToast,
  Separator,
  Textarea,
  Cable,
  Unplug,
} from '@ui/components'

type State = {
  connected: boolean
  network: Network | string
  address: string
  balance: string
  psbt: string
  msg: string
  signature: string
  recovery: string
}

type Action =
  | { type: 'CONNECT'; payload: Partial<State> }
  | { type: 'DISCONNECT' }
  | { type: 'SET_MSG'; payload: string }
  | { type: 'SET_SIGNATURE'; payload: string }
  | { type: 'SET_PSBT'; payload: string }
  | { type: 'SET_RECOVERY'; payload: string }

const initialState: State = {
  connected: false,
  network: '',
  address: '',
  balance: '',
  psbt: '',
  msg: 'Hello World',
  signature: '',
  recovery: '',
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'CONNECT':
      return { ...state, connected: true, ...action.payload }
    case 'DISCONNECT':
      return { ...initialState }
    case 'SET_MSG':
      return { ...state, msg: action.payload }
    case 'SET_SIGNATURE':
      return { ...state, signature: action.payload }
    case 'SET_PSBT':
      return { ...state, psbt: action.payload }
    case 'SET_RECOVERY':
      return { ...state, recovery: action.payload }
    default:
      return state
  }
}

function Header() {
  return (
    <div className="text-center px-4 py-6">
      <h2 className="border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
        BIP-322
      </h2>
      <a
        className="text-sm text-muted-foreground"
        href="https://github.com/bitcoin/bips/blob/master/bip322.mediawiki"
        target="_blank"
        rel="noopener noreferrer"
      >
        github.com/bitcoin/bip322
      </a>
      <blockquote className="text-sm text-muted-foreground">
        A standard for interoperable signed messages based on the Bitcoin Script
        format, either for proving fund availability, or committing to a message
        as the intended recipient of funds sent to the invoice address.
      </blockquote>
    </div>
  )
}

function WalletInfo({ network, address, balance }: Partial<State>) {
  return (
    <div className="my-5 space-y-3">
      <h3 className="text-xl font-semibold">Wallet Info</h3>
      <div>
        <p className="text-sm text-muted-foreground">Network</p>
        <code className="rounded bg-muted text-sm break-all block p-1">
          {network}
        </code>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Address</p>
        <code className="rounded bg-muted text-sm break-all block p-1">
          {address}
        </code>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Balance</p>
        <code className="rounded bg-muted text-sm break-all block p-1">
          {balance}
        </code>
      </div>
    </div>
  )
}

interface SignMessageProps extends Partial<State> {
  onSignMsg: () => void
  onVerify: () => void
  setMsg: (msg: string) => void
}

function SignMessage({
  msg,
  psbt,
  signature,
  recovery,
  onSignMsg,
  onVerify,
  setMsg,
}: SignMessageProps) {
  return (
    <div className="my-5 space-y-4 text-left">
      <h3 className="text-xl font-semibold text-center">Sign Message</h3>
      <div className="grid w-full gap-2 max-w-sm mx-auto">
        <Label htmlFor="message">Message: </Label>
        <Textarea
          placeholder="Type your message here."
          id="message"
          defaultValue={msg}
          onChange={(e) => setMsg(e.target.value)}
        />
        <Button onClick={onSignMsg}>Sign</Button>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Psbt</p>
        <code className="rounded bg-muted text-sm break-all block p-1">
          {psbt}
        </code>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Signature</p>
        <code className="rounded bg-muted text-sm break-all block p-1">
          {signature}
        </code>
      </div>
      <div className="grid w-full gap-2 max-w-sm mx-auto">
        <Button variant="outline" onClick={onVerify}>
          Verify
        </Button>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Recovery result</p>
        <code className="rounded bg-muted text-sm break-all block p-1">
          {recovery}
        </code>
      </div>
    </div>
  )
}

function AppContent() {
  const [state, dispatch] = useReducer(reducer, initialState)
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
      const balance = await provider?.getBalance()
      dispatch({
        type: 'CONNECT',
        payload: {
          network: network ?? '',
          address: address ?? '',
          balance: `${(balance ?? 0) / 1e8} BTC`,
        },
      })
    } catch (error) {
      handleError(error, 'Connect failed')
    }
  }, [provider, handleError])

  const onDisconnect = useCallback(() => {
    dispatch({ type: 'DISCONNECT' })
  }, [])

  const onSignMsg = useCallback(async () => {
    try {
      const psbt = genPsbtOfBIP322Simple({
        message: state.msg,
        address: state.address,
        networkType: state.network as Network,
      })
      dispatch({ type: 'SET_PSBT', payload: psbt.toHex() })
      const result = await provider?.signMessageBIP322(state.msg)
      dispatch({ type: 'SET_SIGNATURE', payload: result ?? '' })
      toast({ title: 'Sign Message Success' })
    } catch (error) {
      handleError(error, 'Sign Message Failed')
    }
  }, [state.msg, state.address, state.network, provider, handleError, toast])

  const onVerify = useCallback(async () => {
    try {
      const result = verifyMessageOfBIP322Simple(
        state.address,
        state.msg,
        state.signature,
        state.network as Network,
      )
      dispatch({ type: 'SET_RECOVERY', payload: result ? 'Success' : 'Failed' })
    } catch (error) {
      dispatch({ type: 'SET_RECOVERY', payload: (error as Error)?.message })
      handleError(error, 'Verify Failed')
    }
  }, [state.address, state.msg, state.signature, state.network, handleError])

  const connectButton = useMemo(
    () => (
      <Button
        onClick={state.connected ? onDisconnect : onConnect}
        variant={state.connected ? 'destructive' : 'default'}
      >
        {state.connected ? (
          <>
            <Unplug className="mr-2 h-4 w-4" /> Disconnect Wallet
          </>
        ) : (
          <>
            <Cable className="mr-2 h-4 w-4" /> Connect Wallet
          </>
        )}
      </Button>
    ),
    [state.connected, onConnect, onDisconnect],
  )

  return (
    <div>
      <Header />
      <Separator />
      <div className="max-w-xl mx-auto w-full px-4 py-5 text-center">
        {connectButton}
        <WalletInfo
          network={state.network}
          address={state.address}
          balance={state.balance}
        />
        <Separator />
        <SignMessage
          msg={state.msg}
          psbt={state.psbt}
          signature={state.signature}
          recovery={state.recovery}
          onSignMsg={onSignMsg}
          onVerify={onVerify}
          setMsg={(msg) => dispatch({ type: 'SET_MSG', payload: msg })}
        />
      </div>
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
