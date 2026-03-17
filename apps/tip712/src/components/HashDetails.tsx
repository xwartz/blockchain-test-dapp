import { Card, CardContent, CardHeader, CardTitle } from '@ui/components'
import { useHashResult } from '@/store/hooks'

export function HashDetails() {
  const [hashResult] = useHashResult()

  if (!hashResult) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Hash Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <HashRow label="Signing Hash" value={hashResult.signingHash} primary />
        <HashRow label="Domain Separator" value={hashResult.domainSeparator} />
        <HashRow label="Message Hash" value={hashResult.messageHash} />
        <div className="pt-2 border-t">
          <HashRow label="Domain Type Hash" value={hashResult.domainTypeHash} />
          <TypeStringRow
            label="Domain Type"
            value={hashResult.domainTypeString}
          />
        </div>
        <div className="pt-2 border-t">
          <HashRow
            label="Message Type Hash"
            value={hashResult.messageTypeHash}
          />
          <TypeStringRow
            label="Message Type"
            value={hashResult.messageTypeString}
          />
        </div>
      </CardContent>
    </Card>
  )
}

function HashRow({
  label,
  value,
  primary,
}: {
  label: string
  value: string
  primary?: boolean
}) {
  return (
    <div>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <p
        className={`text-xs font-mono break-all mt-0.5 ${
          primary
            ? 'text-blue-600 dark:text-blue-400 font-semibold'
            : 'text-foreground'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function TypeStringRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <p className="text-xs font-mono break-all mt-0.5 text-muted-foreground">
        {value}
      </p>
    </div>
  )
}
