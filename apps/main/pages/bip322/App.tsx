import { ThemeProvider } from '@/components/theme-provider'
import { verifyMessageOfBIP322Simple } from '@/utils/bip322/simple'
import { useProvider } from '@/utils/providers'
import { Network } from '@/utils/providers/base'
import { Label, Button, useToast, Separator, Textarea } from '@ui/components'
import { Cable, Unplug } from 'lucide-react'
import { useState } from 'react'

function App() {
  const provider = useProvider()
  const { toast } = useToast()
  const [connected, setConnected] = useState(false)
  const [network, setNetwork] = useState<Network | string>(Network.SIGNET)
  const [address, setAddress] = useState('')
  const [balance, setBalance] = useState('')

  const [msg, setMsg] = useState('Hello World')
  const [signature, setSignature] = useState('')

  const [recovery, setRecovery] = useState('')

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

  const onSignMsg = async () => {
    try {
      const result = await provider?.signMessageBIP322(msg)
      setSignature(result ?? '')
      toast({
        title: 'Sign Message Success',
      })
    } catch (error) {
      if (error instanceof Error) {
        toast({
          title: 'Sign Message Failed',
          description: error.message,
        })
      }
    }
  }

  const onVerify = async () => {
    try {
      const result = verifyMessageOfBIP322Simple(
        address,
        msg,
        signature,
        network as Network,
      )
      setRecovery(result ? 'Success' : 'Failed')
    } catch (error) {
      if (error instanceof Error) {
        setRecovery(error.message)
        toast({
          title: 'Verify Failed',
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
          <h3 className="text-xl font-semibold">Sign Message</h3>
          <div className="mt-2 grid w-full gap-2 grid w-full max-w-sm mx-auto">
            <Label htmlFor="message">Message: </Label>
            <Textarea
              placeholder="Type your message here."
              id="message"
              defaultValue="Hello World"
              onChange={(e) => setMsg(e.target.value)}
            />
            <Button onClick={onSignMsg}>Sign</Button>
          </div>
          <div className="mt-2">
            <p>Signature: </p>
            <code className="rounded bg-muted text-sm break-all">
              {signature}
            </code>
          </div>
          <div className="mt-2 grid w-full gap-2 grid w-full max-w-sm mx-auto">
            <Button variant="outline" onClick={onVerify}>
              Verify
            </Button>
          </div>
          <div className="mt-2">
            <p>Recovery result: </p>
            <code className="rounded bg-muted text-sm break-all">
              {recovery}
            </code>
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
        BIP-322
      </h2>
      <a
        className="text-sm text-muted-foreground"
        href="https://github.com/bitcoin/bips/blob/master/bip322.mediawiki"
        target="_blank"
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
