import { useState, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
  Loader2,
} from '@ui/components'
import {
  usePayloadJson,
  useParsedPayload,
  useSignatureResult,
  useSignatureError,
  useHashResult,
  useIsSigning,
  useSetIsSigning,
  useClearSigningData,
  useWalletAddress,
} from '@/store/hooks'
import { TIP712_PRESETS } from '@/types'
import { computeSigningHash, splitSignature } from '@/utils/tip712'
import { signTypedData } from '@/utils/tronlink'

export function PayloadEditor() {
  const [payloadJson, setPayloadJson] = usePayloadJson()
  const payload = useParsedPayload()
  const [, setSignatureResult] = useSignatureResult()
  const [, setSignatureError] = useSignatureError()
  const [, setHashResult] = useHashResult()
  const isSigning = useIsSigning()
  const setIsSigning = useSetIsSigning()
  const clearSigningData = useClearSigningData()
  const walletAddress = useWalletAddress()
  const { toast } = useToast()
  const [jsonError, setJsonError] = useState('')

  const handlePresetSelect = useCallback(
    (key: string) => {
      const preset = TIP712_PRESETS[key as keyof typeof TIP712_PRESETS]
      if (!preset) return

      // Deep clone and fill in wallet address where applicable
      const p = JSON.parse(JSON.stringify(preset.payload))
      fillAddress(p, walletAddress)

      // Set deadline to 1 hour from now
      fillDeadline(p)

      setPayloadJson(JSON.stringify(p, null, 2))
      clearSigningData()
      setJsonError('')
    },
    [walletAddress, setPayloadJson, clearSigningData],
  )

  const handleJsonChange = useCallback(
    (value: string) => {
      setPayloadJson(value)
      try {
        JSON.parse(value)
        setJsonError('')
      } catch (e) {
        setJsonError(e instanceof Error ? e.message : 'Invalid JSON')
      }
    },
    [setPayloadJson],
  )

  const handleComputeHash = useCallback(() => {
    if (!payload) {
      toast({
        title: 'Invalid Payload',
        description: 'Please fix JSON errors first.',
        variant: 'destructive',
      })
      return
    }
    try {
      const result = computeSigningHash(payload)
      setHashResult(result)
      setSignatureError('')
      toast({
        title: 'Hash Computed',
        description: 'Signing hash calculated successfully.',
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Hash computation failed'
      setSignatureError(msg)
      toast({ title: 'Hash Error', description: msg, variant: 'destructive' })
    }
  }, [payload, setHashResult, setSignatureError, toast])

  const handleSign = useCallback(async () => {
    if (!payload) {
      toast({
        title: 'Invalid Payload',
        description: 'Please fix JSON errors first.',
        variant: 'destructive',
      })
      return
    }
    if (!walletAddress) {
      toast({
        title: 'Not Connected',
        description: 'Please connect your wallet first.',
        variant: 'destructive',
      })
      return
    }

    setIsSigning(true)
    setSignatureError('')
    try {
      // First compute hash
      const hashRes = computeSigningHash(payload)
      setHashResult(hashRes)

      // Then sign
      const sig = await signTypedData(
        payload.domain,
        payload.types,
        payload.message as Record<string, unknown>,
        payload.primaryType,
      )

      const { r, s, v } = splitSignature(sig)
      setSignatureResult({ signature: sig, r, s, v })
      toast({
        title: 'Signed',
        description: 'Signature obtained successfully.',
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Signing failed'
      setSignatureError(msg)
      toast({ title: 'Sign Error', description: msg, variant: 'destructive' })
    } finally {
      setIsSigning(false)
    }
  }, [
    payload,
    walletAddress,
    setIsSigning,
    setSignatureError,
    setHashResult,
    setSignatureResult,
    toast,
  ])

  const handleFormatJson = useCallback(() => {
    try {
      const parsed = JSON.parse(payloadJson)
      setPayloadJson(JSON.stringify(parsed, null, 2))
      setJsonError('')
    } catch {
      // Already showing error
    }
  }, [payloadJson, setPayloadJson])

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">TIP-712 Payload</CardTitle>
          <div className="flex items-center gap-2">
            <Select onValueChange={handlePresetSelect}>
              <SelectTrigger className="w-[200px] h-8 text-xs">
                <SelectValue placeholder="Load preset..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TIP712_PRESETS).map(([key, preset]) => (
                  <SelectItem key={key} value={key} className="text-xs">
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFormatJson}
              className="text-xs h-8"
            >
              Format
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Textarea
            value={payloadJson}
            onChange={(e) => handleJsonChange(e.target.value)}
            className="font-mono text-xs min-h-[320px] resize-y"
            placeholder="Enter TIP-712 payload JSON..."
          />
          {jsonError && (
            <p className="text-xs text-destructive mt-1">{jsonError}</p>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleComputeHash}
            disabled={!payload}
            className="flex-1"
          >
            Compute Hash
          </Button>
          <Button
            size="sm"
            onClick={handleSign}
            disabled={isSigning || !payload || !walletAddress}
            className="flex-1"
          >
            {isSigning ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Signing...
              </>
            ) : (
              'Sign with Wallet'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Helpers ──

function fillAddress(payload: Record<string, unknown>, address: string) {
  if (!address) return

  const msg = payload.message as Record<string, unknown>
  if (!msg) return

  // GasFree: user field
  if (msg.user === '') msg.user = address
  // Permit: owner
  if (msg.owner === '') msg.owner = address
  // Mail: from.wallet
  if (typeof msg.from === 'object' && msg.from !== null) {
    const from = msg.from as Record<string, unknown>
    if (from.wallet === '') from.wallet = address
  }
}

function fillDeadline(payload: Record<string, unknown>) {
  const msg = payload.message as Record<string, unknown>
  if (!msg) return

  const oneHourFromNow = Math.floor(Date.now() / 1000 + 3600).toString()
  if (msg.deadline === '') msg.deadline = oneHourFromNow
}
