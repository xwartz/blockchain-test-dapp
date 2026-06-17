import type {
  TronContractInput,
  TronLinkProvider,
  TronTransaction,
  TronWeb,
  TriggerSmartContractResult,
} from '@/types'
import { utils as tronUtils } from 'tronweb'

export const TRON_MAINNET_USDT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
export const DEFAULT_UNKNOWN_CONTRACT = 'TFFAMQLZybALaLb4uxHA9RBE7pxhUAjF3U'
export const DEFAULT_AMOUNT = '1000000'
export const DEFAULT_FEE_LIMIT = '150000000'
export const DEFAULT_UNKNOWN_DATA =
  '0x095ea7b30000000000000000000000000000000000000000000000000000000000000000'

export interface WalletAccount {
  address: string
  addressHex: string
}

export interface PreviewForm {
  tokenAddress: string
  unknownContract: string
  spender: string
  amount: string
  unknownData: string
  functionSelector: string
  feeLimit: string
}

export function getTronProvider(): TronLinkProvider | null {
  if (typeof window === 'undefined') return null
  return window.tron ?? window.tronLink ?? null
}

export function getTronWeb(): TronWeb | null {
  if (typeof window === 'undefined') return null
  const provider = getTronProvider()
  return provider?.tronWeb ?? window.tronWeb ?? null
}

export function isWalletAvailable(): boolean {
  return Boolean(getTronProvider() || getTronWeb())
}

export async function connectWallet(): Promise<WalletAccount> {
  const provider = getTronProvider()
  if (provider?.request) {
    await requestAccounts(provider)
  }

  const tronWeb = getTronWeb()
  const address = tronWeb?.defaultAddress
  if (!address?.base58 || !address.hex) {
    throw new Error(
      'No connected TRON account. Unlock the wallet and approve access.',
    )
  }

  return {
    address: address.base58,
    addressHex: address.hex,
  }
}

async function requestAccounts(provider: TronLinkProvider): Promise<void> {
  try {
    await provider.request({ method: 'tron_requestAccounts' })
    return
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (isUserRejection(message)) throw error
  }

  await provider.request({ method: 'eth_requestAccounts' })
}

function isUserRejection(message: string): boolean {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('reject') ||
    normalized.includes('denied') ||
    normalized.includes('cancel')
  )
}

function ensureAddress(tronWeb: TronWeb, address: string, label: string): void {
  if (!tronWeb.isAddress(address)) {
    throw new Error(`${label} is not a valid TRON address.`)
  }
}

function parseFeeLimit(raw: string): number {
  const feeLimit = Number(raw)
  if (!Number.isFinite(feeLimit) || feeLimit <= 0) {
    throw new Error('Fee limit must be a positive number of SUN.')
  }
  return feeLimit
}

function parseFunctionSelector(functionSelector: string): {
  name: string
  inputs: TronContractInput[]
} {
  const match = functionSelector.trim().match(/^([A-Za-z_$][\w$]*)\((.*)\)$/)
  if (!match) {
    throw new Error('Function selector must look like method(type,type).')
  }

  const [, name, rawTypes] = match
  const inputTypes = rawTypes.trim()
    ? rawTypes.split(',').map((item) => item.trim())
    : []

  const preferredNames = ['token', 'spender', 'amount', 'data']
  return {
    name,
    inputs: inputTypes.map((type, index) => ({
      name: preferredNames[index] ?? `arg${index + 1}`,
      type,
    })),
  }
}

function getUnknownParameters(form: PreviewForm): string[] {
  const { inputs } = parseFunctionSelector(form.functionSelector)
  const values = [
    form.tokenAddress,
    form.spender,
    form.amount,
    normalizeHexData(form.unknownData),
  ]

  return inputs.map((_, index) => values[index] ?? '')
}

function normalizeHexData(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return '0x'
  return trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`
}

function requireTransaction(
  result: TriggerSmartContractResult,
): TronTransaction {
  if (!result.transaction) {
    const message =
      result.result?.message ?? 'Wallet did not return an unsigned transaction.'
    throw new Error(message)
  }
  return result.transaction
}

export async function buildUnknownApproveIntentTx(
  form: PreviewForm,
  ownerAddress: string,
): Promise<TronTransaction> {
  const tronWeb = getTronWeb()
  if (!tronWeb) throw new Error('TronWeb is not available.')

  ensureAddress(tronWeb, form.tokenAddress, 'USDT token')
  ensureAddress(tronWeb, form.unknownContract, 'Unknown contract')
  ensureAddress(tronWeb, form.spender, 'Spender contract')

  const parsed = parseFunctionSelector(form.functionSelector)
  const result = await tronWeb.transactionBuilder.triggerSmartContract(
    form.unknownContract,
    form.functionSelector,
    {
      callValue: 0,
      feeLimit: parseFeeLimit(form.feeLimit),
      txLocal: true,
      funcABIV2: {
        name: parsed.name,
        type: 'function',
        inputs: parsed.inputs,
      },
      parametersV2: getUnknownParameters(form),
    },
    undefined,
    ownerAddress,
  )

  return requireTransaction(result)
}

export async function buildApproveAndUnknownMultiContractTx(
  form: PreviewForm,
  ownerAddress: string,
): Promise<TronTransaction> {
  const approveTx = await buildStandardApproveTx(form, ownerAddress)
  const unknownTx = await buildUnknownApproveIntentTx(form, ownerAddress)

  const approveContract = approveTx.raw_data?.contract?.[0]
  const unknownContract = unknownTx.raw_data?.contract?.[0]
  if (!approveContract || !unknownContract || !approveTx.raw_data) {
    throw new Error('Unable to build both contract calls.')
  }

  const combinedTx: TronTransaction = {
    ...approveTx,
    signature: undefined,
    raw_data: {
      ...approveTx.raw_data,
      fee_limit: Math.max(
        Number(approveTx.raw_data.fee_limit ?? 0),
        Number(unknownTx.raw_data?.fee_limit ?? 0),
        parseFeeLimit(form.feeLimit),
      ),
      contract: [approveContract, unknownContract],
    },
  }

  refreshTransactionHash(combinedTx)
  return combinedTx
}

function refreshTransactionHash(transaction: TronTransaction): void {
  const txJsonToPb = tronUtils.transaction.txJsonToPb as (
    transaction: TronTransaction,
  ) => unknown
  const txPbToTxID = tronUtils.transaction.txPbToTxID as (
    transactionPb: unknown,
  ) => string
  const txPbToRawDataHex = tronUtils.transaction.txPbToRawDataHex as (
    transactionPb: unknown,
  ) => string

  const transactionPb = txJsonToPb(transaction)
  transaction.txID = txPbToTxID(transactionPb).replace(/^0x/, '')
  transaction.raw_data_hex = txPbToRawDataHex(transactionPb).toLowerCase()
}

export async function buildStandardApproveTx(
  form: PreviewForm,
  ownerAddress: string,
): Promise<TronTransaction> {
  const tronWeb = getTronWeb()
  if (!tronWeb) throw new Error('TronWeb is not available.')

  ensureAddress(tronWeb, form.tokenAddress, 'USDT token')
  ensureAddress(tronWeb, form.spender, 'Spender contract')

  const result = await tronWeb.transactionBuilder.triggerSmartContract(
    form.tokenAddress,
    'approve(address,uint256)',
    {
      callValue: 0,
      feeLimit: parseFeeLimit(form.feeLimit),
      txLocal: true,
      funcABIV2: {
        name: 'approve',
        type: 'function',
        inputs: [
          { name: 'spender', type: 'address' },
          { name: 'amount', type: 'uint256' },
        ],
      },
      parametersV2: [form.spender, form.amount],
    },
    undefined,
    ownerAddress,
  )

  return requireTransaction(result)
}

export async function signTransaction(
  transaction: TronTransaction,
): Promise<TronTransaction> {
  const tronWeb = getTronWeb()
  if (!tronWeb) throw new Error('TronWeb is not available.')
  return tronWeb.trx.sign(transaction)
}

export function summarizeTransaction(transaction: TronTransaction): {
  txId: string
  contractCount: number
  contractType: string
  contractAddress: string
  ownerAddress: string
  data: string
} {
  const contract = transaction.raw_data?.contract?.[0]
  const value = contract?.parameter?.value ?? {}
  return {
    txId: transaction.txID ?? 'Pending wallet signature',
    contractCount: transaction.raw_data?.contract?.length ?? 0,
    contractType: contract?.type ?? 'TriggerSmartContract',
    contractAddress: String(value.contract_address ?? ''),
    ownerAddress: String(value.owner_address ?? ''),
    data: String(value.data ?? ''),
  }
}
