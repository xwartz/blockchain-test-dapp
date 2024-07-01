import { networks } from 'bitcoinjs-lib'
import { Network } from '../providers/base'

export const toPsbtNetwork = (networkType: Network) => {
  if (networkType === Network.MAINNET) {
    return networks.bitcoin
  }
  if (networkType === Network.TESTNET || networkType === Network.SIGNET) {
    return networks.testnet
  }
  return networks.regtest
}
