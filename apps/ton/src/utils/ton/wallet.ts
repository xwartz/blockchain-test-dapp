import type { WalletInfo } from '../../types/index.js'
import { mnemonicNew, mnemonicToWalletKey } from '@ton/crypto'
import {
  WalletContractV3R2,
  WalletContractV4,
  WalletContractV5R1,
  internal,
  TonClient,
  SendMode,
} from '@ton/ton'
import { Address, Cell } from '@ton/core'
import { getDefaultStore } from 'jotai'
import { walletInfoAtom, walletMnemonicAtom } from '../../store/atoms.js'

interface SendTransactionParams {
  to: string
  value: string
  data?: string
  stateInit?: string
}

export type WalletVersion = 'v3R2' | 'v4R2' | 'v5R1'

interface CreateWalletOptions {
  version?: WalletVersion
  workchain?: number
}

// 定义钱包合约的联合类型
type WalletContract = WalletContractV3R2 | WalletContractV4 | WalletContractV5R1

// 定义 API 响应类型
interface WalletData {
  balance: string
  status: string
  interfaces?: string[]
  name?: string
  is_scam?: boolean
  icon?: string
  memo_required?: boolean
  get_gems_audience?: boolean
  is_suspended?: boolean
  updated_at: number
}

interface Transaction {
  account: {
    address: string
    is_scam: boolean
  }
  hash: string
  lt: string
  now: number
  orig_status: string
  end_status: string
  total_fees: string
  transaction_type: string
  data?: string
  compute_exit_code?: number
  compute_consumed_gas?: number
  storage_fees_collected?: string
  action_result_code?: number
  destroyed_accounts?: string[]
  created_accounts?: string[]
  destroyed_contracts?: string[]
  created_contracts?: string[]
}

interface TransactionsResponse {
  transactions: Transaction[]
}

// 简单的 TON API 助手，避免 CORS 问题
async function simpleFetch(
  endpoint: string,
): Promise<WalletData | TransactionsResponse> {
  // 使用 TonCenter API，它支持 CORS
  const baseUrl = 'https://toncenter.com/api/v2'
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}`,
    )
  }

  return response.json()
}

export class TonWallet {
  private address: string | null = null
  private publicKey: string | null = null
  private privateKey: Buffer | null = null
  private walletContract: WalletContract | null = null
  private client: TonClient
  private walletVersion: WalletVersion = 'v4R2' // 默认使用V4R2

  constructor() {
    // 对于浏览器环境，使用 TonCenter API 避免 CORS 问题
    this.client = new TonClient({
      endpoint: 'https://toncenter.com/api/v2/jsonRPC',
      // 移除 apiKey 配置，避免 CORS 问题
    })
  }

  async generateMnemonic(): Promise<string[]> {
    return await mnemonicNew()
  }

  // 创建 TonKeeper 兼容的钱包（现在默认使用 V4R2）
  async createTonKeeperCompatibleWallet(
    mnemonic: string[],
  ): Promise<WalletInfo> {
    return this.createWallet(mnemonic, { version: 'v4R2' })
  }

  async createWallet(
    mnemonic: string[],
    options: CreateWalletOptions = {},
  ): Promise<WalletInfo> {
    const { version = 'v4R2', workchain = 0 } = options // 默认使用V4R2
    this.walletVersion = version

    try {
      // 使用 TON 标准的 HD 派生路径: m/44'/607'/0'
      // TonKeeper 和其他标准 TON 钱包都使用这个路径
      const keyPair = await mnemonicToWalletKey(mnemonic)
      this.privateKey = keyPair.secretKey
      this.publicKey = keyPair.publicKey.toString('hex')

      // 根据版本创建钱包合约 - 使用与TonKeeper相同的配置
      switch (version) {
        case 'v3R2':
          // TonKeeper 对 V3R2 不传入 walletId，使用默认值
          this.walletContract = WalletContractV3R2.create({
            workchain,
            publicKey: keyPair.publicKey,
          })
          break
        case 'v4R2':
          // TonKeeper 对 V4R2 不传入 walletId，使用默认值
          this.walletContract = WalletContractV4.create({
            workchain,
            publicKey: keyPair.publicKey,
          })
          break
        case 'v5R1':
        default:
          // TonKeeper V5R1 使用特殊的 walletId 格式
          this.walletContract = WalletContractV5R1.create({
            workchain,
            publicKey: keyPair.publicKey,
            walletId: {
              networkGlobalId: -239, // Mainnet 的 networkGlobalId
            },
          })
          break
      }

      // 获取钱包地址 - 转换为 user-friendly 格式
      const addressObj = this.walletContract.address
      this.address = addressObj.toString({ urlSafe: true, bounceable: false })

      // 获取余额
      const balance = await this.getBalance()

      const walletInfo: WalletInfo = {
        address: this.address,
        publicKey: this.publicKey,
        balance: balance.toString(),
        version: version,
        rawAddress: `${addressObj.workChain}:${addressObj.hash.toString('hex')}`,
        userFriendlyAddress: this.address,
      }

      // 保存到 Jotai store
      const store = getDefaultStore()
      store.set(walletInfoAtom, walletInfo)
      store.set(walletMnemonicAtom, mnemonic)

      return walletInfo
    } catch (error) {
      console.error('Failed to create wallet:', error)
      throw new Error('Failed to create wallet from mnemonic')
    }
  }

  async getBalance(): Promise<bigint> {
    if (!this.walletContract) {
      throw new Error('Wallet not initialized')
    }

    try {
      const contract = this.client.open(this.walletContract)
      return await contract.getBalance()
    } catch (error) {
      console.error('Failed to get balance:', error)
      return BigInt(0)
    }
  }

  async getWalletInfo(): Promise<WalletInfo | null> {
    if (!this.address || !this.publicKey || !this.walletContract) {
      return null
    }

    const balance = await this.getBalance()
    const addressObj = this.walletContract.address

    return {
      address: this.address,
      publicKey: this.publicKey,
      balance: balance.toString(),
      version: this.walletVersion,
      rawAddress: `${addressObj.workChain}:${addressObj.hash.toString('hex')}`,
      userFriendlyAddress: this.address,
    }
  }

  async importFromMnemonic(mnemonic: string[]): Promise<WalletInfo> {
    return this.createWallet(mnemonic)
  }

  // 检查钱包是否已初始化
  isInitialized(): boolean {
    return this.walletContract !== null && this.privateKey !== null
  }

  async sendTransaction(params: SendTransactionParams): Promise<string> {
    if (!this.walletContract || !this.privateKey) {
      throw new Error('Wallet not initialized')
    }

    const contract = this.client.open(this.walletContract)
    const seqno = await contract.getSeqno()

    // 创建内部消息
    const transfer = internal({
      to: params.to,
      value: params.value,
      body: params.data || '',
    })

    // 根据钱包版本发送交易
    if (this.walletVersion === 'v5R1') {
      // V5R1 使用 sendTransfer 方法
      const v5Contract = contract as ReturnType<
        typeof this.client.open<WalletContractV5R1>
      >
      await v5Contract.sendTransfer({
        secretKey: this.privateKey,
        seqno,
        sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
        messages: [transfer],
      })
    } else {
      // V3R2 和 V4R2 使用相同的API
      const transferMessage = await (
        contract as ReturnType<
          typeof this.client.open<WalletContractV3R2 | WalletContractV4>
        >
      ).createTransfer({
        seqno,
        secretKey: this.privateKey,
        messages: [transfer],
        sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
      })
      await contract.send(transferMessage)
    }

    return 'Transaction sent'
  }

  async createTransaction(
    to: string,
    amount: string,
    data?: string,
  ): Promise<{ base64: string; hash: string }> {
    if (!this.walletContract || !this.privateKey) {
      throw new Error('Wallet not initialized')
    }

    const contract = this.client.open(this.walletContract)
    const seqno = await contract.getSeqno()

    const transfer = internal({
      to,
      value: amount,
      body: data || '',
    })

    // 根据钱包版本创建交易
    let cell: Cell

    if (this.walletVersion === 'v5R1') {
      // V5R1 使用不同的API
      const v5Contract = contract as ReturnType<
        typeof this.client.open<WalletContractV5R1>
      >
      cell = await v5Contract.createTransfer({
        secretKey: this.privateKey,
        seqno,
        sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
        messages: [transfer],
      })
    } else {
      // V3R2 和 V4R2 使用相同的API
      const v3v4Contract = contract as ReturnType<
        typeof this.client.open<WalletContractV3R2 | WalletContractV4>
      >
      cell = await v3v4Contract.createTransfer({
        seqno,
        secretKey: this.privateKey,
        messages: [transfer],
        sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
      })
    }

    return {
      base64: cell.toBoc().toString('base64'),
      hash: cell.hash().toString('hex'),
    }
  }

  // 创建交易 BOC (Binary Object Cell) - 用于 TON Connect
  async createTransactionBoc(
    messages: Array<{
      address: string
      amount: string
      payload?: string
    }>,
  ): Promise<string> {
    if (!this.walletContract || !this.privateKey) {
      throw new Error('Wallet not initialized')
    }

    const contract = this.client.open(this.walletContract)
    const seqno = await contract.getSeqno()

    // 转换消息格式
    const transfers = messages.map((msg) =>
      internal({
        to: msg.address,
        value: msg.amount,
        body: msg.payload || '',
      }),
    )

    let cell: Cell

    if (this.walletVersion === 'v5R1') {
      const v5Contract = contract as ReturnType<
        typeof this.client.open<WalletContractV5R1>
      >
      cell = await v5Contract.createTransfer({
        secretKey: this.privateKey,
        seqno,
        sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
        messages: transfers,
      })
    } else {
      const v3v4Contract = contract as ReturnType<
        typeof this.client.open<WalletContractV3R2 | WalletContractV4>
      >
      cell = await v3v4Contract.createTransfer({
        seqno,
        secretKey: this.privateKey,
        messages: transfers,
        sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
      })
    }

    return cell.toBoc().toString('base64')
  }

  // 获取钱包序列号
  async getSeqno(): Promise<number> {
    if (!this.walletContract) {
      throw new Error('Wallet not initialized')
    }

    try {
      const contract = this.client.open(this.walletContract)
      return await contract.getSeqno()
    } catch (error) {
      console.error('Failed to get seqno:', error)
      return 0
    }
  }

  // 获取钱包地址
  getAddress(): string | null {
    return this.address
  }

  // 获取公钥
  getPublicKey(): string | null {
    return this.publicKey
  }

  // 使用 TonCenter API 获取余额和交易历史
  async fetchWalletData(): Promise<WalletData> {
    if (!this.address) {
      throw new Error('Wallet not initialized')
    }

    try {
      // 注意：TonCenter API 可能有不同的端点结构
      // 这里我们提供一个基本的实现，实际使用中可能需要调整
      const response = await simpleFetch(
        `/getAddressInformation?address=${this.address}`,
      )
      return response as WalletData
    } catch (error) {
      console.error('Failed to fetch wallet data:', error)
      // 返回默认数据结构
      return {
        balance: '0',
        status: 'unknown',
        updated_at: Date.now(),
      }
    }
  }

  // 获取交易历史
  async getTransactions(limit: number = 10): Promise<Transaction[]> {
    if (!this.address) {
      throw new Error('Wallet not initialized')
    }

    try {
      // 注意：TonCenter API 的交易历史端点可能不同
      // 这里提供一个基本实现
      const response = await simpleFetch(
        `/getTransactions?address=${this.address}&limit=${limit}`,
      )
      const transactionsResponse = response as TransactionsResponse
      return transactionsResponse.transactions || []
    } catch (error) {
      console.error('Failed to get transactions:', error)
      return []
    }
  }

  // 重置钱包状态
  reset(): void {
    this.address = null
    this.publicKey = null
    this.privateKey = null
    this.walletContract = null
    console.log('Wallet state has been reset')
  }

  // 地址格式转换工具
  static convertAddressFormat(address: string): {
    raw: string
    userFriendly: string
    workchain: number
    hash: string
  } {
    try {
      const addr = Address.parse(address)
      return {
        raw: `${addr.workChain}:${addr.hash.toString('hex')}`,
        userFriendly: addr.toString({ urlSafe: true, bounceable: false }),
        workchain: addr.workChain,
        hash: addr.hash.toString('hex'),
      }
    } catch (error) {
      throw new Error(`Invalid address format: ${address}`)
    }
  }

  // 检查地址兼容性
  static compareAddresses(address1: string, address2: string): boolean {
    try {
      const addr1 = Address.parse(address1)
      const addr2 = Address.parse(address2)
      return addr1.equals(addr2)
    } catch (error) {
      return false
    }
  }
}

