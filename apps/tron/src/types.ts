export interface TronAddress {
  base58: string
  hex: string
}

export interface TronLinkProvider {
  ready?: boolean
  tronWeb?: TronWeb
  request(args: { method: string; params?: unknown[] }): Promise<unknown>
}

export interface TronContractInput {
  name: string
  type: string
}

export interface TriggerSmartContractOptions {
  callValue?: number
  feeLimit?: number
  txLocal?: boolean
  funcABIV2?: {
    name: string
    type: 'function'
    inputs: TronContractInput[]
  }
  parametersV2?: unknown[]
}

export interface TriggerSmartContractResult {
  result?: {
    result?: boolean
    message?: string
  }
  transaction?: TronTransaction
}

export interface TronTransaction {
  txID?: string
  raw_data_hex?: string
  raw_data?: {
    contract?: Array<{
      type?: string
      parameter?: {
        value?: Record<string, unknown>
      }
    }>
    fee_limit?: number
    timestamp?: number
    expiration?: number
  }
  signature?: string[]
  visible?: boolean
}

export interface TronWeb {
  defaultAddress?: TronAddress
  address: {
    fromHex(hex: string): string
    toHex(base58: string): string
  }
  isAddress(address: string): boolean
  transactionBuilder: {
    triggerSmartContract(
      contractAddress: string,
      functionSelector: string,
      options: TriggerSmartContractOptions,
      parameters?: Array<{ type: string; value: string }>,
      issuerAddress?: string,
    ): Promise<TriggerSmartContractResult>
  }
  trx: {
    sign(transaction: TronTransaction): Promise<TronTransaction>
  }
}

declare global {
  interface Window {
    tron?: TronLinkProvider
    tronLink?: TronLinkProvider
    tronWeb?: TronWeb
  }
}
