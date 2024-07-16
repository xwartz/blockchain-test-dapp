import { Cable, Send, Unplug } from 'lucide-react'
import { SetStateAction, useState } from 'react'
import { ThemeProvider } from '@/components/theme-provider'
import { toPsbtNetwork } from '@/utils/network/transport'
import { useProvider } from '@/utils/providers'
import { Network } from '@/utils/providers/base'
import { createPSBT } from '@/utils/psbt/create'
import { decodeByNode, decodeFromHex, getSignature } from '@/utils/psbt/decode'
import { Label, Button, useToast, Separator, Textarea } from '@ui/components'

function App() {
  const provider = useProvider()
  const { toast } = useToast()
  const [connected, setConnected] = useState(false)
  const [network, setNetwork] = useState<Network | string>(Network.SIGNET)
  const [address, setAddress] = useState('')
  const [balance, setBalance] = useState('')
  const [publicKey, setPublicKey] = useState<string>('')

  const [psbt, setPSBT] = useState('')
  const [signature, setSignature] = useState('')
  const [unspent, setUnspent] = useState('')

  const [decodeRes, setDecodeRes] = useState('')
  const [decodeResFromNode, setDecodeResFromNode] = useState('')

  const onConnect = async () => {
    try {
      setConnected(true)
      await provider?.connectWallet()
      const network = await provider?.getNetwork()
      setNetwork(network ?? '')
      const address = await provider?.getAddress()
      setAddress(address ?? '')
      const publicKey = await provider?.getPublicKeyHex()
      setPublicKey(publicKey ?? '')
      const balance = await provider?.getBalance()
      setBalance(`${(balance ?? 0) / 1e8} BTC`)
      const utxos = await provider?.getUtxos(address ?? '')
      setUnspent(JSON.stringify(utxos, null, 2))
    } catch (error) {
      toast({
        title: 'connect failed',
        description: JSON.stringify(error),
      })
    }
  }

  const onDisconnect = () => {
    setConnected(false)
    setNetwork('')
    setAddress('')
    setPublicKey('')
    setBalance('')
  }

  const onChangeUnspent = (e: {
    target: { value: SetStateAction<string> }
  }) => {
    setUnspent(e.target.value)
    setPSBT('')
    setSignature('')
  }

  const onGenerate = async () => {
    try {
      const netWorkFee = await provider?.getNetworkFees()
      const feeRate = netWorkFee?.fastestFee
      const result = createPSBT({
        toAddress: address,
        utxos: JSON.parse(unspent),
        amount: 1000,
        changeAddress: address,
        network: toPsbtNetwork(network as Network),
        feeRate: feeRate ?? 6,
      })
      setPSBT(result)
      toast({
        title: 'Generate Success',
      })
    } catch (err) {
      toast({
        title: 'Generate Failed',
        description: JSON.stringify(err),
      })
    }
  }

  const onSign = async () => {
    try {
      const result = await provider?.signPsbt(psbt)
      const signature = getSignature(result ?? '')
      setSignature(signature ?? '')
      toast({
        title: 'Sign Success',
      })
    } catch (error) {
      toast({
        title: 'Sign Failed',
        description: JSON.stringify(error),
      })
    }
  }

  const onSignPsbts = async () => {
    try {
      const result = await provider?.signPsbts([psbt])
      const signature = getSignature(result?.[0] ?? '')
      setSignature(signature ?? '')
      toast({
        title: 'Sign Success',
      })
    } catch (error) {
      toast({
        title: 'Sign Failed',
        description: JSON.stringify(error),
      })
    }
  }

  const onChangePsbtHex = (e: {
    target: { value: SetStateAction<string> }
  }) => {
    setPSBT(e.target.value)
    setSignature('')
    setDecodeRes('')
  }

  const onDecode = async () => {
    try {
      const result = decodeFromHex(psbt, network as Network)
      setDecodeRes(JSON.stringify(result, null, 2))

      const res = await decodeByNode(psbt)
      setDecodeResFromNode(JSON.stringify(res, null, 2))
    } catch (error) {
      toast({
        title: 'Decode Failed',
        description: JSON.stringify(error),
      })
    }
  }

  const onSend = async () => {
    try {
      const result = await provider?.pushTx(signature)
      console.log('send', result)
      toast({
        title: 'Send Success',
      })
    } catch (error) {
      toast({
        title: 'Send Failed',
        description: JSON.stringify(error),
      })
    }
  }

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Header />
      <Separator />

      <div className="p-5 text-center" style={{ maxWidth: '100%' }}>
        {!connected && (
          <Button onClick={onConnect}>
            <Cable className="mr-2 h-4 w-4" /> Connect Wallet
          </Button>
        )}
        {connected && (
          <Button variant="destructive" onClick={onDisconnect}>
            <Unplug className="mr-2 h-4 w-4" /> Disconnect Wallet
          </Button>
        )}

        <WalletInfo
          network={network}
          address={address}
          publicKey={publicKey}
          balance={balance}
        />
        <Separator />

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
            <Button onClick={onSign}>SignPsbt</Button>
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
      </div>
    </ThemeProvider>
  )
}

export default App

function WalletInfo({
  network,
  address,
  publicKey,
  balance,
}: {
  network: string
  address: string
  publicKey: string
  balance: string
}) {
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
        <p>Public Key: </p>
        <code className="rounded bg-muted text-sm break-all">{publicKey}</code>
      </div>
      <div className="mt-2">
        <p>Balance: </p>
        <code className="rounded bg-muted text-sm break-all">{balance}</code>
      </div>
    </div>
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
