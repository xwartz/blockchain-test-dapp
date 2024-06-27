import { Network } from '../providers/base'

export const network = import.meta.env.VITE_PUBLIC_NETWORK || Network.SIGNET

interface NetworkConfig {
  coinName: string
  coinSymbol: string
  networkName: string
  mempoolApiUrl: string
  rpcUrl: string
}

const mainnetConfig: NetworkConfig = {
  coinName: 'BTC',
  coinSymbol: 'BTC',
  networkName: 'BTC',
  mempoolApiUrl: `${import.meta.env.VITE_PUBLIC_MEMPOOL_API}`,
  rpcUrl: `${import.meta.env.VITE_PUBLIC_RPC_URL}`,
}

const signetConfig: NetworkConfig = {
  coinName: 'Signet BTC',
  coinSymbol: 'sBTC',
  networkName: 'BTC signet',
  mempoolApiUrl: `${import.meta.env.VITE_PUBLIC_MEMPOOL_API}/signet`,
  rpcUrl: `${import.meta.env.VITE_PUBLIC_RPC_URL}`,
}

const testnetConfig: NetworkConfig = {
  coinName: 'Testnet BTC',
  coinSymbol: 'tBTC',
  networkName: 'BTC testnet',
  mempoolApiUrl: `${import.meta.env.VITE_PUBLIC_MEMPOOL_API}/testnet`,
  rpcUrl: `${import.meta.env.VITE_PUBLIC_RPC_URL}`,
}

const config: Record<string, NetworkConfig> = {
  mainnet: mainnetConfig,
  signet: signetConfig,
  testnet: testnetConfig,
}

export function getNetworkConfig(): NetworkConfig {
  switch (network) {
    case Network.MAINNET:
      return config.mainnet
    case Network.SIGNET:
      return config.signet
    case Network.TESTNET:
      return config.testnet
    default:
      return config.signet
  }
}

export function validateAddress(network: Network, address: string): void {
  if (network === Network.MAINNET && !address.startsWith('bc1')) {
    throw new Error(
      "Incorrect address prefix for Mainnet. Expected address to start with 'bc1'.",
    )
  } else if (
    [Network.SIGNET, Network.TESTNET].includes(network) &&
    !address.startsWith('tb1')
  ) {
    throw new Error(
      "Incorrect address prefix for Testnet / Signet. Expected address to start with 'tb1'.",
    )
  } else if (
    ![Network.MAINNET, Network.SIGNET, Network.TESTNET].includes(network)
  ) {
    throw new Error(
      `Unsupported network: ${network}. Please provide a valid network.`,
    )
  }
}
