import { ThemeProvider } from '@/components/theme-provider'
import { useProvider } from '@/utils/providers'
import { Network } from '@/utils/providers/base'
import { decodeByNode, decodeFromHex } from '@/utils/psbt/decode'
import { Label, Button, useToast, Separator, Textarea } from '@ui/components'
import { Cable, Unplug } from 'lucide-react'
import { SetStateAction, useState } from 'react'

const psbtStaking =
  '70736274ff0100db02000000012c0502945546bb9003837d1d2aef32073f0e026c92b27a222dda74bf874e3cea0200000000fdffffff0350c3000000000000225120326c983f992efe39a22b5568b7565ca953116470e6d88177aa41eddf2ee044200000000000000000496a476262743400aff94eb65a2fe773a57c5bd54e62d8436a5467573565214028422b41bd43e29bc333bf065809ed12b162dc3c849f8cf65219125fdfde98770c2b285f04ff9960fa0008aaba0000000000225120ea20ffb077323528b8345c7fa517a2ebee1b52649ee2559a6d5ea87160b50b2e080803000001012ba56ebb0000000000225120ea20ffb077323528b8345c7fa517a2ebee1b52649ee2559a6d5ea87160b50b2e011720aff94eb65a2fe773a57c5bd54e62d8436a5467573565214028422b41bd43e29b00000000'

function App() {
  const provider = useProvider()
  const { toast } = useToast()
  const [connected, setConnected] = useState(false)
  const [network, setNetwork] = useState<Network | string>(Network.SIGNET)
  const [address, setAddress] = useState('')
  const [balance, setBalance] = useState('')

  const [psbt, setPSBT] = useState(psbtStaking)
  const [signature, setSignature] = useState('')

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
      const balance = await provider?.getBalance()
      setBalance(`${(balance ?? 0) / 1e8} BTC`)
    } catch (error) {
      if (error instanceof Error) {
        toast({
          title: 'connect failed',
          description: error.message,
        })
      }
    }
  }

  const onDisconnect = () => {
    setConnected(false)
    setNetwork('')
    setAddress('')
    setBalance('')
  }

  const onSign = async () => {
    try {
      const result = await provider?.signPsbt(psbt)
      setSignature(result ?? '')
      toast({
        title: 'Sign Success',
      })
    } catch (error) {
      if (error instanceof Error) {
        toast({
          title: 'Sign Failed',
          description: error.message,
        })
      }
    }
  }

  const onChangePsbt = (e: { target: { value: SetStateAction<string> } }) => {
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
      if (error instanceof Error) {
        toast({
          title: 'Decode Failed',
          description: error.message,
        })
      }
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

        <div className="m-5">
          <h3 className="text-xl font-semibold">Wallet Info</h3>
          <div className="mt-2">
            <p>Network: </p>
            <code className="rounded bg-muted text-sm break-all">
              {network}
            </code>
          </div>
          <div className="mt-2">
            <p>Address: </p>
            <code className="rounded bg-muted text-sm break-all">
              {address}
            </code>
          </div>
          <div className="mt-2">
            <p>Balance: </p>
            <code className="rounded bg-muted text-sm break-all">
              {balance}
            </code>
          </div>
        </div>

        <Separator />

        <div className="m-5 text-center">
          <h3 className="text-xl font-semibold">Sign PSBT</h3>
          <div className="mt-2 grid w-full gap-2 grid w-full max-w-2xl mx-auto">
            <Label htmlFor="message">PSBT Hex: </Label>
            <Textarea
              placeholder="Type your PSBT Hex here."
              id="message"
              defaultValue={psbtStaking}
              onChange={onChangePsbt}
            />
            <Button onClick={onSign}>Sign</Button>
            <div className="mt-2">
              <p>Signature: </p>
              <code className="rounded bg-muted text-sm break-all">
                {signature}
              </code>
            </div>
          </div>
          <div className="mt-2 grid w-full gap-2 grid w-full max-w-2xl mx-auto">
            <Button variant="outline" onClick={onDecode}>
              Decode
            </Button>
            <div className="mt-2">
              <p className="mb-2">decode result(local): </p>
              <Textarea defaultValue={decodeRes} rows={15} />
            </div>
            <div className="mt-2">
              <p className="mb-2">decode result(node): </p>
              <Textarea defaultValue={decodeResFromNode} rows={15} />
            </div>
          </div>
        </div>
      </div>
    </ThemeProvider>
  )
}

export default App

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
