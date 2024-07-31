import { fromBech32 } from '@cosmjs/encoding'
import { chains } from 'chain-registry'

export const isIBCTransfer = (fromAddress: string, toAddress: string) => {
  try {
    const { prefix: fromAddressPrefix } = fromBech32(fromAddress)
    const { prefix: toAddressPrefix } = fromBech32(toAddress)
    return fromAddressPrefix !== toAddressPrefix
  } catch {
    return false
  }
}

export const getChainFromAddress = (address: string) => {
  const { prefix } = fromBech32(address)
  return chains.find((chain) => chain.bech32_prefix === prefix)
}
