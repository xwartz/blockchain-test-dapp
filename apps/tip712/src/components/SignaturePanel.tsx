import { useState, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  useToast,
} from '@ui/components'
import {
  useSignatureResult,
  useSignatureError,
  useHashResult,
} from '@/store/hooks'
import { splitSignature } from '@/utils/tip712'

export function SignaturePanel() {
  const [sigResult] = useSignatureResult()
  const [sigError] = useSignatureError()
  const [hashResult] = useHashResult()
  const { toast } = useToast()

  // Manual verification input
  const [manualSig, setManualSig] = useState('')
  const [manualParts, setManualParts] = useState<{
    r: string
    s: string
    v: number
  } | null>(null)
  const [splitError, setSplitError] = useState('')

  const handleSplitManual = useCallback(() => {
    try {
      const parts = splitSignature(manualSig)
      setManualParts(parts)
      setSplitError('')
    } catch (err) {
      setSplitError(err instanceof Error ? err.message : 'Invalid signature')
      setManualParts(null)
    }
  }, [manualSig])

  const handleCopy = useCallback(
    (text: string, label: string) => {
      navigator.clipboard.writeText(text)
      toast({ title: 'Copied', description: `${label} copied to clipboard.` })
    },
    [toast],
  )

  return (
    <div className="space-y-4">
      {/* Signature result from wallet signing */}
      {(sigResult || sigError) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Signature Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sigError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-xs text-destructive font-mono break-all">
                  {sigError}
                </p>
              </div>
            )}
            {sigResult && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      Full Signature (65 bytes)
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() =>
                        handleCopy(sigResult.signature, 'Signature')
                      }
                    >
                      Copy
                    </Button>
                  </div>
                  <p className="text-xs font-mono break-all text-blue-600 dark:text-blue-400">
                    {sigResult.signature}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <SigPart label="r" value={sigResult.r} onCopy={handleCopy} />
                  <SigPart label="s" value={sigResult.s} onCopy={handleCopy} />
                  <SigPart
                    label="v"
                    value={sigResult.v.toString()}
                    extra={`(0x${sigResult.v.toString(16)})`}
                    onCopy={handleCopy}
                  />
                </div>
                {hashResult && (
                  <div className="pt-2 border-t">
                    <span className="text-xs font-medium text-muted-foreground">
                      Signing Hash (for verification)
                    </span>
                    <p className="text-xs font-mono break-all mt-0.5">
                      {hashResult.signingHash}
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Manual signature verification */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Verify Signature</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Paste Signature (hex)</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={manualSig}
                onChange={(e) => setManualSig(e.target.value)}
                placeholder="0x..."
                className="font-mono text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleSplitManual}
                disabled={!manualSig}
              >
                Split
              </Button>
            </div>
            {splitError && (
              <p className="text-xs text-destructive mt-1">{splitError}</p>
            )}
          </div>
          {manualParts && (
            <div className="grid grid-cols-3 gap-3 pt-2">
              <SigPart label="r" value={manualParts.r} onCopy={handleCopy} />
              <SigPart label="s" value={manualParts.s} onCopy={handleCopy} />
              <SigPart
                label="v"
                value={manualParts.v.toString()}
                extra={`(0x${manualParts.v.toString(16)})`}
                onCopy={handleCopy}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SigPart({
  label,
  value,
  extra,
  onCopy,
}: {
  label: string
  value: string
  extra?: string
  onCopy: (text: string, label: string) => void
}) {
  return (
    <div
      className="cursor-pointer hover:bg-muted/50 rounded-md p-2 transition-colors"
      onClick={() => onCopy(value, label)}
      title="Click to copy"
    >
      <span className="text-xs font-medium text-muted-foreground">
        {label} {extra && <span className="text-[10px]">{extra}</span>}
      </span>
      <p className="text-xs font-mono break-all mt-0.5">{value}</p>
    </div>
  )
}
