import { fromBech32 } from '@cosmjs/encoding'

export const isIBCTransfer = (fromAddress: string, toAddress: string) => {
  try {
    const { prefix: fromAddressPrefix } = fromBech32(fromAddress)
    const { prefix: toAddressPrefix } = fromBech32(toAddress)
    return fromAddressPrefix !== toAddressPrefix
  } catch {
    return false
  }
}
