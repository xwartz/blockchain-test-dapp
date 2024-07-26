import { useReducer } from 'react'
import { ThemeProvider } from '@/components/theme-provider'
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing'
import { chains } from 'chain-registry'
import { stringToPath } from '@cosmjs/crypto'
import {
  Label,
  Button,
  Separator,
  Textarea,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  Input,
} from '@ui/components'
import { pubkeyToAddress } from '@cosmjs/amino'
import { toBase64 } from '@cosmjs/encoding'
import { getHDPath } from '@/utils/cosmos/path'
import { genMsgSend, makeSignMessage } from '@/utils/cosmos/sign'

type State = {
  connected: boolean
  address: string
  publicKey: string
  signature: string
  mnemonic: string
  selectedChain: string
  recipient: string
  amount: string
  denom: string
  memo: string
  unSignedTx: string
}

type Action =
  | { type: 'CONNECT'; payload: Partial<State> }
  | { type: 'DISCONNECT' }
  | { type: 'SET_MNEMONIC'; payload: string }
  | { type: 'SET_SELECTED_CHAIN'; payload: string }
  | { type: 'SET_ADDRESS'; payload: string }
  | { type: 'SET_PUBLIC_KEY'; payload: string }
  | { type: 'SET_RECIPIENT'; payload: string }
  | { type: 'SET_AMOUNT'; payload: string }
  | { type: 'SET_DENOM'; payload: string }
  | { type: 'SET_MEMO'; payload: string }
  | { type: 'SET_UNSIGNED_TX'; payload: string }
  | { type: 'SET_SIGNATURE'; payload: string }

const initialState: State = {
  connected: false,
  address: '',
  publicKey: '',
  signature: '',
  mnemonic: '',
  selectedChain: '',
  recipient: '',
  amount: '0',
  denom: '',
  memo: '',
  unSignedTx: '',
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'CONNECT':
      return { ...state, connected: true, ...action.payload }
    case 'DISCONNECT':
      return { ...initialState }
    case 'SET_MNEMONIC':
      return { ...state, mnemonic: action.payload }
    case 'SET_SELECTED_CHAIN':
      return { ...state, selectedChain: action.payload }
    case 'SET_PUBLIC_KEY':
      return { ...state, publicKey: action.payload }
    case 'SET_ADDRESS':
      return { ...state, address: action.payload }
    case 'SET_SIGNATURE':
      return { ...state, signature: action.payload }
    case 'SET_RECIPIENT':
      return { ...state, recipient: action.payload }
    case 'SET_AMOUNT':
      return { ...state, amount: action.payload }
    case 'SET_DENOM':
      return { ...state, denom: action.payload }
    case 'SET_MEMO':
      return { ...state, memo: action.payload }
    case 'SET_UNSIGNED_TX':
      return { ...state, unSignedTx: action.payload }
    default:
      return state
  }
}

function App() {
  const [state, dispatch] = useReducer(reducer, initialState)

  const generateMnemonic = async () => {
    const wallet = await DirectSecp256k1HdWallet.generate(12)
    dispatch({ type: 'SET_MNEMONIC', payload: wallet.mnemonic })
  }

  const generateAddress = async () => {
    if (!state.mnemonic || !state.selectedChain) return

    const chain = chains.find((c) => c.chain_name === state.selectedChain)
    if (!chain) return

    console.log('chain', chain)

    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(state.mnemonic, {
      prefix: chain.bech32_prefix,
      hdPaths: [stringToPath(getHDPath(`${chain.slip44}`))],
    })

    const [{ pubkey, address }] = await wallet.getAccounts()
    const publicKey = Buffer.from(pubkey).toString('hex')
    dispatch({
      type: 'SET_PUBLIC_KEY',
      payload: publicKey,
    })
    dispatch({ type: 'SET_ADDRESS', payload: address })
    const pubkeyAddress = pubkeyToAddress(
      {
        type: 'tendermint/PubKeySecp256k1',
        value: toBase64(Buffer.from(publicKey, 'hex')),
      },
      chain.bech32_prefix,
    )
    console.log('pubkeyAddress', pubkeyAddress)
  }

  const onSignTx = () => {
    const chain = chains.find((c) => c.chain_name === state.selectedChain)
    if (!chain) return

    const msg = genMsgSend(
      state.address,
      state.recipient,
      state.amount,
      state.denom,
    )
    const unSignedTx = makeSignMessage({
      chainId: chain.chain_id,
      accountNumber: 0,
      sequence: 0,
      fee: {
        amount: [{ denom: state.denom, amount: '1000000' }],
        gas: '200000',
      },
      memo: state.memo,
      msgs: [msg],
      pubKey: state.publicKey,
    })
    dispatch({ type: 'SET_UNSIGNED_TX', payload: unSignedTx })
  }

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Header />
      <Separator />
      <Mnemonic
        mnemonic={state.mnemonic}
        selectedChain={state.selectedChain}
        generateMnemonic={generateMnemonic}
        generateAddress={generateAddress}
        onMnemonicChange={(e) =>
          dispatch({ type: 'SET_MNEMONIC', payload: e.target.value })
        }
        onSelectChange={(value) =>
          dispatch({ type: 'SET_SELECTED_CHAIN', payload: value })
        }
      />
      <WalletInfo
        selectedChain={state.selectedChain}
        address={state.address}
        publicKey={state.publicKey}
      />
      <Separator />
      <SignTx
        selectedChain={state.selectedChain}
        unSignedTx={state.unSignedTx}
        onRecipientChange={(e) =>
          dispatch({ type: 'SET_RECIPIENT', payload: e.target.value })
        }
        onAmountChange={(e) =>
          dispatch({ type: 'SET_AMOUNT', payload: e.target.value })
        }
        onMemoChange={(e) =>
          dispatch({ type: 'SET_MEMO', payload: e.target.value })
        }
        onDenomChange={(e) =>
          dispatch({ type: 'SET_DENOM', payload: e.target.value })
        }
        onSignTx={onSignTx}
      />
      <Separator />
    </ThemeProvider>
  )
}

function SignTx({
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

function Mnemonic({
  generateMnemonic,
  mnemonic,
  selectedChain,
  generateAddress,
  onMnemonicChange,
  onSelectChange,
}: {
  generateMnemonic: () => void
  generateAddress: () => void
  onMnemonicChange: React.ChangeEventHandler<HTMLTextAreaElement>
  onSelectChange: (value: string) => void
  mnemonic: string
  selectedChain: string
}) {
  return (
    <div className="p-5 text-center" style={{ maxWidth: '100%' }}>
      <Button variant="destructive" onClick={generateMnemonic}>
        Generate Mnemonic
      </Button>
      <div className="mt-2">
        <Label htmlFor="mnemonic">Mnemonic: </Label>
        <Textarea
          placeholder="Type your Mnemonic here."
          id="mnemonic"
          defaultValue={mnemonic}
          onChange={onMnemonicChange}
        />
      </div>
      <div className="mt-2 grid justify-items-center">
        <Select onValueChange={onSelectChange} value={selectedChain}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Select a Chain" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Chains</SelectLabel>
              {chains.map((chain) => (
                <SelectItem key={chain.chain_name} value={chain.chain_name}>
                  {chain.chain_name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <div className="mt-2">
        <Button variant="secondary" onClick={generateAddress}>
          Generate Address
        </Button>
      </div>
    </div>
  )
}

function WalletInfo({ selectedChain, publicKey, address }: Partial<State>) {
  return (
    <div className="p-5 text-center" style={{ maxWidth: '100%' }}>
      <h3 className="text-xl font-semibold">Wallet Info</h3>
      <div className="mt-2">
        <p>Chain: </p>
        <code className="rounded bg-muted text-sm break-all">
          {selectedChain}
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
    </div>
  )
}

function Header() {
  return (
    <div className="text-center m-6">
      <h2 className="pb-2 text-3xl font-semibold tracking-tight first:mt-0">
        Cosmos
      </h2>
    </div>
  )
}

export default App
