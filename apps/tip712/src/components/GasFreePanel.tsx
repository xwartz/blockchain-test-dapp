import { useState, useCallback, useEffect, useRef } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  useToast,
  Loader2,
} from '@ui/components'
import {
  useWalletAddress,
  useGasFreeAddress,
  useGasFreeNonce,
  useSignatureResult,
  useSignatureError,
  useHashResult,
  useIsSigning,
  useSetIsSigning,
  useClearSigningData,
  useGasFreeSubmitResult,
} from '@/store/hooks'
import {
  GASFREE_CONFIG,
  TRON_TOKENS,
  TRON_CHAINS,
  type TIP712Payload,
} from '@/types'
import { computeSigningHash, splitSignature } from '@/utils/tip712'
import { signTypedData } from '@/utils/tronlink'
import { TronGasFree } from '@gasfree/gasfree-sdk'

type NetworkKey = 'mainnet' | 'nile'

export function GasFreePanel() {
  const walletAddress = useWalletAddress()
  const [gasFreeAddress, setGasFreeAddress] = useGasFreeAddress()
  const [nonce, setNonce] = useGasFreeNonce()
  const [sigResult, setSignatureResult] = useSignatureResult()
  const [, setSignatureError] = useSignatureError()
  const [, setHashResult] = useHashResult()
  const isSigning = useIsSigning()
  const setIsSigning = useSetIsSigning()
  const clearSigningData = useClearSigningData()
  const [submitResult, setSubmitResult] = useGasFreeSubmitResult()
  const { toast } = useToast()

  // Keep a ref to current signature for use in callbacks
  const sigResultRef = useRef(sigResult)
  sigResultRef.current = sigResult

  // Form state
  const [network, setNetwork] = useState<NetworkKey>('mainnet')
  const [token, setToken] = useState<string>(TRON_TOKENS.USDT.address)
  const [serviceProvider, setServiceProvider] = useState(
    'TGzz8gjYiYRqpfmDwnLxfgPuLVNmpCswVp',
  )
  const [receiver, setReceiver] = useState('')
  const [value, setValue] = useState('1000000')
  const [maxFee, setMaxFee] = useState('200000')
  const [deadline, setDeadline] = useState('')

  // Manual submit fields
  const [submitEndpoint, setSubmitEndpoint] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Auto-derive GasFree address from wallet address and network
  useEffect(() => {
    if (!walletAddress) {
      setGasFreeAddress('')
      return
    }
    try {
      const chain =
        network === 'mainnet' ? TRON_CHAINS.mainnet : TRON_CHAINS.nile
      const gasFree = new TronGasFree({ chainId: chain.chainId })
      const derived = gasFree.generateGasFreeAddress(walletAddress)
      setGasFreeAddress(derived)
    } catch (e) {
      console.error('Failed to derive GasFree address:', e)
      setGasFreeAddress('')
    }
  }, [walletAddress, network, setGasFreeAddress])

  // Set default deadline
  useEffect(() => {
    if (!deadline) {
      setDeadline(Math.floor(Date.now() / 1000 + 3600).toString())
    }
  }, [deadline])

  const config = GASFREE_CONFIG[network]
  const chainInfo =
    network === 'mainnet' ? TRON_CHAINS.mainnet : TRON_CHAINS.nile

  const buildPayload = useCallback((): TIP712Payload => {
    return {
      domain: {
        name: config.domainName,
        version: config.domainVersion,
        chainId: chainInfo.chainIdHex,
        verifyingContract: config.controllerAddress,
      },
      types: {
        PermitTransfer: [
          { name: 'token', type: 'address' },
          { name: 'serviceProvider', type: 'address' },
          { name: 'user', type: 'address' },
          { name: 'receiver', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'maxFee', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
          { name: 'version', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
        ],
      },
      primaryType: 'PermitTransfer',
      message: {
        token,
        serviceProvider,
        user: walletAddress,
        receiver,
        value,
        maxFee,
        deadline,
        version: '1',
        nonce,
      },
    }
  }, [
    config,
    chainInfo,
    token,
    serviceProvider,
    walletAddress,
    receiver,
    value,
    maxFee,
    deadline,
    nonce,
  ])

  const handleSign = useCallback(async () => {
    if (!walletAddress) {
      toast({
        title: 'Not Connected',
        description: 'Please connect your wallet first.',
        variant: 'destructive',
      })
      return
    }
    if (!receiver) {
      toast({
        title: 'Missing Receiver',
        description: 'Please enter a receiver address.',
        variant: 'destructive',
      })
      return
    }

    setIsSigning(true)
    clearSigningData()
    try {
      const payload = buildPayload()

      // Compute hash
      const hashRes = computeSigningHash(payload)
      setHashResult(hashRes)

      // Sign
      const sig = await signTypedData(
        payload.domain,
        payload.types,
        payload.message as Record<string, unknown>,
        payload.primaryType,
      )

      const { r, s, v } = splitSignature(sig)
      setSignatureResult({ signature: sig, r, s, v })
      toast({ title: 'Signed', description: 'GasFree PermitTransfer signed.' })
    } catch (err) {
      const msg = `Signing failed: ${err instanceof Error ? err.message : JSON.stringify(err)}`
      setSignatureError(msg)
      toast({ title: 'Sign Error', description: msg, variant: 'destructive' })
    } finally {
      setIsSigning(false)
    }
  }, [
    walletAddress,
    receiver,
    buildPayload,
    setIsSigning,
    clearSigningData,
    setHashResult,
    setSignatureResult,
    setSignatureError,
    toast,
  ])

  const handleSubmit = useCallback(async () => {
    const currentSig = sigResultRef.current
    if (!currentSig || !submitEndpoint) {
      toast({
        title: 'Missing Data',
        description: 'Need both a signature and an API endpoint.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const payload = buildPayload()
      const body = {
        ...payload.message,
        signature: currentSig.signature,
      }

      const res = await fetch(submitEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const text = await res.text()
      setSubmitResult(text)

      if (res.ok) {
        toast({
          title: 'Submitted',
          description: 'Transaction submitted successfully.',
        })
      } else {
        toast({
          title: 'Submit Failed',
          description: `Status ${res.status}`,
          variant: 'destructive',
        })
      }
    } catch (err) {
      const msg = `Signing failed: ${err instanceof Error ? err.message : JSON.stringify(err)}`
      setSubmitResult(`Error: ${msg}`)
      toast({ title: 'Submit Error', description: msg, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }, [submitEndpoint, buildPayload, setSubmitResult, toast])

  return (
    <div className="space-y-4">
      {/* GasFree Address */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">GasFree Address</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Auto-derived via CREATE2 from your connected wallet address.
          </p>
          <p className="font-mono text-xs break-all text-blue-600 dark:text-blue-400">
            {gasFreeAddress || 'Connect wallet to derive address'}
          </p>
        </CardContent>
      </Card>

      {/* Transfer Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">GasFree PermitTransfer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Network</Label>
              <Select
                value={network}
                onValueChange={(v) => setNetwork(v as NetworkKey)}
              >
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mainnet" className="text-xs">
                    TRON Mainnet
                  </SelectItem>
                  <SelectItem value="nile" className="text-xs">
                    Nile Testnet
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Token</Label>
              <Select value={token} onValueChange={setToken}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(TRON_TOKENS).map((t) => (
                    <SelectItem
                      key={t.address}
                      value={t.address}
                      className="text-xs"
                    >
                      {t.symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <FormField
            label="Service Provider"
            value={serviceProvider}
            onChange={setServiceProvider}
            placeholder="Service provider address"
          />
          <FormField
            label="User (your EOA)"
            value={walletAddress}
            readOnly
            placeholder="Connect wallet first"
          />
          <FormField
            label="Receiver"
            value={receiver}
            onChange={setReceiver}
            placeholder="Receiver address (T...)"
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Value (atomic)"
              value={value}
              onChange={setValue}
            />
            <FormField
              label="Max Fee (atomic)"
              value={maxFee}
              onChange={setMaxFee}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Deadline (unix)"
              value={deadline}
              onChange={setDeadline}
            />
            <FormField label="Nonce" value={nonce} onChange={setNonce} />
          </div>

          <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded-md">
            <strong>Contract:</strong> {config.controllerAddress}
            <br />
            <strong>Chain ID:</strong> {chainInfo.chainIdHex} (
            {chainInfo.chainId})
          </div>

          <Button
            onClick={handleSign}
            disabled={isSigning || !walletAddress || !receiver}
            className="w-full"
          >
            {isSigning ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Signing...
              </>
            ) : (
              'Sign GasFree PermitTransfer'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Submit to API */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Submit to GasFree API</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            After signing, submit the signed transaction to a GasFree service
            provider API endpoint.
          </p>
          <FormField
            label="API Endpoint"
            value={submitEndpoint}
            onChange={setSubmitEndpoint}
            placeholder="https://api.gasfree.io/v1/submit"
          />
          <Button
            variant="outline"
            onClick={handleSubmit}
            disabled={isSubmitting || !submitEndpoint}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Transaction'
            )}
          </Button>
          {submitResult && (
            <>
              <Separator />
              <div>
                <Label className="text-xs">Response</Label>
                <pre className="text-xs font-mono bg-muted p-3 rounded-md mt-1 overflow-x-auto max-h-[200px] overflow-y-auto whitespace-pre-wrap break-all">
                  {submitResult}
                </pre>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  readOnly,
}: {
  label: string
  value: string
  onChange?: (v: string) => void
  placeholder?: string
  readOnly?: boolean
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        placeholder={placeholder}
        readOnly={readOnly}
        className="font-mono text-xs h-8 mt-1"
      />
    </div>
  )
}
