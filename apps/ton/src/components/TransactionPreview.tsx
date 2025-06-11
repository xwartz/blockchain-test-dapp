import { useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  Separator,
  useToast,
} from '@repo/ui'

interface TransactionMessage {
  address: string
  amount: string
  payload?: string
  stateInit?: string
}

interface TransactionPreviewProps {
  isOpen: boolean
  transaction: {
    valid_until: number
    messages: TransactionMessage[]
  } | null
  onApprove: () => void
  onReject: () => void
}

export function TransactionPreview({
  isOpen,
  transaction,
  onApprove,
  onReject,
}: TransactionPreviewProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()

  const handleApprove = async () => {
    setIsProcessing(true)
    try {
      await onApprove()
      toast({
        title: 'Transaction approved',
        description: 'The transaction has been signed and sent.',
      })
    } catch (error) {
      toast({
        title: 'Transaction failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = () => {
    onReject()
    toast({
      title: 'Transaction rejected',
      description: 'The transaction has been cancelled.',
    })
  }

  const formatAmount = (amount: string) => {
    const nanoTON = BigInt(amount)
    const TON = Number(nanoTON) / 1e9
    return `${TON.toFixed(4)} TON`
  }

  if (!isOpen || !transaction) return null

  // 安全检查 transaction.messages
  const messages = transaction.messages || []
  const totalAmount = messages.reduce((sum, msg) => {
    return sum + BigInt(msg.amount || '0')
  }, BigInt(0))

  const validUntil = new Date((transaction.valid_until || 0) * 1000)
  const timeRemaining = validUntil.getTime() - Date.now()
  const minutesRemaining = Math.floor(timeRemaining / 1000 / 60)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto border-0 shadow-2xl bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50">
        <CardHeader className="text-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 border-b border-blue-200 dark:border-blue-800">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white text-2xl">🔐</span>
          </div>
          <CardTitle className="text-2xl font-bold text-blue-800 dark:text-blue-200">
            Transaction Preview
          </CardTitle>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Review the transaction details before signing
          </p>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Transaction Summary */}
          <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 rounded-xl border border-green-200 dark:border-green-800">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg">💎</span>
              </div>
              <div>
                <h3 className="font-semibold text-green-800 dark:text-green-200">
                  Transaction Summary
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Review total amount and message count
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-white/60 dark:bg-green-800/30 rounded-lg">
                <Label className="text-xs font-medium text-green-700 dark:text-green-300 uppercase tracking-wider">
                  Total Amount
                </Label>
                <p className="text-2xl font-bold text-green-800 dark:text-green-200 mt-1">
                  {formatAmount(totalAmount.toString())}
                </p>
              </div>
              <div className="text-center p-4 bg-white/60 dark:bg-green-800/30 rounded-lg">
                <Label className="text-xs font-medium text-green-700 dark:text-green-300 uppercase tracking-wider">
                  Messages
                </Label>
                <p className="text-2xl font-bold text-green-800 dark:text-green-200 mt-1">
                  {messages.length}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Transaction Messages */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">📝</span>
              </div>
              <Label className="font-semibold text-lg">
                Transaction Details
              </Label>
            </div>

            <div className="space-y-3">
              {messages.map((message, index) => (
                <Card
                  key={index}
                  className="border border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50/50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/20"
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </span>
                        <Label className="text-sm font-medium text-blue-800 dark:text-blue-200">
                          Message #{index + 1}
                        </Label>
                      </div>
                      <span className="text-lg font-bold text-blue-800 dark:text-blue-200">
                        {formatAmount(message.amount)}
                      </span>
                    </div>

                    <div className="p-3 bg-white/60 dark:bg-blue-800/20 rounded-lg">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        To Address
                      </Label>
                      <p className="text-sm font-mono mt-1 break-all leading-relaxed text-blue-800 dark:text-blue-200">
                        {message.address || 'Unknown address'}
                      </p>
                    </div>

                    {message.payload && (
                      <div className="p-3 bg-white/60 dark:bg-blue-800/20 rounded-lg">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Message Payload
                        </Label>
                        <p className="text-sm mt-1 text-blue-800 dark:text-blue-200">
                          {message.payload}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Separator />

          {/* Transaction Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">⏰</span>
              </div>
              <Label className="font-semibold text-lg">
                Validity Information
              </Label>
            </div>

            <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 rounded-xl border border-purple-200 dark:border-purple-800">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                    Valid Until
                  </Label>
                  <p className="text-sm font-medium mt-1 text-purple-800 dark:text-purple-200">
                    {validUntil.toLocaleString()}
                  </p>
                </div>

                {timeRemaining > 0 && (
                  <div>
                    <Label className="text-xs font-medium text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                      Time Remaining
                    </Label>
                    <p
                      className={`text-sm font-medium mt-1 ${minutesRemaining < 5 ? 'text-red-600' : 'text-green-600'}`}
                    >
                      {minutesRemaining > 0
                        ? `${minutesRemaining} minutes`
                        : 'Less than 1 minute'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Warning if transaction expires soon */}
          {timeRemaining > 0 && minutesRemaining < 5 && (
            <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/30 rounded-xl border border-red-200 dark:border-red-800">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">⚠️</span>
                </div>
                <div>
                  <p className="font-medium text-red-800 dark:text-red-200">
                    Expires Soon!
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    This transaction expires in less than 5 minutes. Please
                    approve quickly.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <Button
              variant="outline"
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
              onClick={handleReject}
              disabled={isProcessing}
            >
              ❌ Reject
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg"
              onClick={handleApprove}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Signing...
                </>
              ) : (
                <>✅ Approve & Sign</>
              )}
            </Button>
          </div>

          {/* Security Notice */}
          <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-sm">🔒</span>
              </div>
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200 text-sm">
                  Security Notice
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 leading-relaxed">
                  This transaction will be signed with your private key and
                  broadcast to the TON network. Make sure you trust the
                  recipient and verify all transaction details before
                  proceeding.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
