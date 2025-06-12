import type { WalletInfo } from '../../types/index.js'
import { SessionCrypto, type KeyPair } from './crypto.js'
import { TonWallet } from '../ton/wallet.js'
import { getDefaultStore } from 'jotai'
import {
  bridgeSessionAtom,
  dappConnectionsAtom,
  walletInfoAtom,
} from '../../store/atoms.js'
import { Address } from '@ton/core'

interface TonConnectMessage {
  id: string
  method: string
  params: unknown[]
}

interface ConnectItem {
  name: 'ton_addr' | 'ton_proof'
  payload?: string
}

interface ConnectRequest {
  manifestUrl: string
  items: ConnectItem[]
}

interface ConnectResponse {
  event: 'connect'
  id: number
  payload: {
    items: ConnectItemReply[]
    device: DeviceInfo
  }
}

interface ConnectItemReply {
  name: 'ton_addr' | 'ton_proof'
  address?: string
  network?: number
  publicKey?: string
  walletStateInit?: string
  proof?: TonProof
}

interface TonProof {
  timestamp: number
  domain: {
    lengthBytes: number
    value: string
  }
  signature: string
  payload: string
}

interface DeviceInfo {
  platform: string
  appName: string
  appVersion: string
  maxProtocolVersion: number
  features: string[]
}

interface TransactionMessage {
  address: string
  amount: string
  payload?: string
  stateInit?: string
}

interface SendTransactionRequest {
  valid_until: number
  messages: TransactionMessage[]
}

interface ConnectionUrlParams {
  v: string
  id: string
  r: string
}

interface BridgeMessage {
  from: string
  message: string
}

const defaultBridgeUrl = 'https://bridge.tonapi.io/bridge'
const defaultTtl = 300

// 辅助函数：确保地址为 raw 格式
function ensureRawAddressFormat(address: string): string {
  try {
    // 如果地址包含 ":"，说明已经是 raw 格式
    if (address.includes(':')) {
      console.log('✅ Address is already in raw format:', address)
      return address
    }

    // 否则，将 user-friendly 格式转换为 raw 格式
    const addr = Address.parse(address)
    const rawFormat = `${addr.workChain}:${addr.hash.toString('hex')}`
    console.log('🔄 Converting user-friendly to raw format:')
    console.log('  Input (user-friendly):', address)
    console.log('  Output (raw):', rawFormat)
    return rawFormat
  } catch (error) {
    console.error('❌ Failed to parse address:', address, error)
    return address // 返回原始地址作为 fallback
  }
}

export class TonConnectWalletBridge {
  private walletInfo: WalletInfo | null = null
  private sessionCrypto: SessionCrypto
  private bridgeUrl: string
  private eventSource: EventSource | null = null
  private isListeningToBridge = false
  private connections: Map<string, string> = new Map() // clientSessionId -> clientPublicKey
  private tonWallet: TonWallet | null = null
  private transactionHandler:
    | ((transaction: SendTransactionRequest) => Promise<boolean>)
    | null = null

  constructor(bridgeUrl = defaultBridgeUrl) {
    this.bridgeUrl = bridgeUrl
    const store = getDefaultStore()

    // 尝试从存储恢复会话
    const storedSession = store.get(bridgeSessionAtom)
    if (storedSession) {
      this.sessionCrypto = new SessionCrypto(storedSession.keyPair)
      console.log(
        'Restored bridge session from storage:',
        storedSession.sessionId,
      )
    } else {
      this.sessionCrypto = new SessionCrypto()
      // 保存新会话到存储
      store.set(bridgeSessionAtom, {
        keyPair: this.sessionCrypto.stringifyKeypair(),
        sessionId: this.sessionCrypto.sessionId,
      })
    }

    // 恢复连接信息
    const storedConnections = store.get(dappConnectionsAtom)
    this.connections = new Map()
    // 过滤掉超过24小时的连接
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
    storedConnections.forEach(({ clientSessionId, timestamp }) => {
      if (timestamp > oneDayAgo) {
        this.connections.set(clientSessionId, clientSessionId)
      }
    })
  }

  // 设置钱包信息
  setWalletInfo(walletInfo: WalletInfo) {
    this.walletInfo = walletInfo

    // 调试信息：检查钱包信息的地址格式
    console.log('🔍 Setting wallet info in TON Connect Bridge:')
    console.log('  User-friendly address:', walletInfo.address)
    console.log('  Raw address:', walletInfo.rawAddress)
    console.log('  Public key:', walletInfo.publicKey)

    // 保存钱包信息到存储
    const store = getDefaultStore()
    store.set(walletInfoAtom, walletInfo)
  }

  // 设置TON钱包实例
  setTonWallet(tonWallet: TonWallet) {
    this.tonWallet = tonWallet
  }

  // 设置交易确认处理器
  setTransactionHandler(
    handler: (transaction: SendTransactionRequest) => Promise<boolean>,
  ) {
    this.transactionHandler = handler
  }

  // 启动 HTTP Bridge 监听
  async startListening(): Promise<void> {
    const url = `${this.bridgeUrl}/events?client_id=${this.sessionCrypto.sessionId}`

    try {
      this.eventSource = new EventSource(url)

      this.eventSource.onopen = () => {
        console.log('TON Connect Bridge connected')
        this.isListeningToBridge = true
      }

      this.eventSource.onmessage = (event) => {
        try {
          const message: BridgeMessage = JSON.parse(event.data)
          this.handleIncomingMessage(message)
        } catch (error) {
          console.error('Failed to parse bridge message:', error)
        }
      }

      this.eventSource.onerror = (error) => {
        console.error('Bridge connection error:', error)
        this.isListeningToBridge = false
        setTimeout(() => this.reconnect(), 5000)
      }

      console.log('HTTP Bridge listening on:', url)
    } catch (error) {
      console.error('Failed to start bridge:', error)
      this.isListeningToBridge = false
    }
  }

  // 处理dApp生成的连接URL
  async handleConnectionUrl(url: string): Promise<void> {
    try {
      const parsedParams = this.parseConnectionUrl(url)
      const request = JSON.parse(parsedParams.r)

      if (!this.walletInfo) {
        throw new Error('Wallet not available')
      }

      // dApp的sessionId就是它的公钥
      const dAppSessionId = parsedParams.id
      console.log('dApp Session ID (Public Key):', dAppSessionId)

      // 存储dApp信息
      this.connections.set(dAppSessionId, dAppSessionId)
      // 保存连接信息到存储
      const store = getDefaultStore()
      const connectionsArray = Array.from(this.connections.entries()).map(
        ([clientSessionId]) => ({
          clientSessionId,
          timestamp: Date.now(),
        }),
      )
      store.set(dappConnectionsAtom, connectionsArray)

      // 创建连接响应 - 直接的 ConnectEvent 格式
      const connectResponse: ConnectResponse = {
        event: 'connect',
        id: Date.now(),
        payload: {
          items: request.items.map((item: ConnectItem) => {
            switch (item.name) {
              case 'ton_addr':
                return {
                  name: 'ton_addr',
                  address: ensureRawAddressFormat(
                    this.walletInfo!.rawAddress || this.walletInfo!.address,
                  ),
                  network: -239, // mainnet
                  publicKey: this.walletInfo!.publicKey,
                  walletStateInit: 'te6ccgEBAQEAOgAAuuMC',
                }
              case 'ton_proof':
                return {
                  name: 'ton_proof',
                  proof: {
                    timestamp: Math.floor(Date.now() / 1000),
                    domain: {
                      lengthBytes: 0,
                      value: '',
                    },
                    signature: this.generateProofSignature(),
                    payload: item.payload || '',
                  },
                }
              default:
                throw new Error(`Unsupported item: ${item.name}`)
            }
          }),
          device: {
            platform: 'chrome',
            appName: 'TON Wallet',
            appVersion: '1.0.0',
            maxProtocolVersion: 2,
            features: ['SendTransaction'],
          },
        },
      }

      // 调试信息：检查发送给 dApp 的地址格式
      const tonAddrItem = connectResponse.payload.items.find(
        (item) => item.name === 'ton_addr',
      )
      if (tonAddrItem) {
        console.log('📤 About to send address to dApp:', tonAddrItem.address)
        console.log(
          '   Address includes ":":',
          tonAddrItem.address?.includes(':'),
        )
      }

      // 发送连接响应到dApp - 直接发送 ConnectEvent，不包装在 result 中
      await this.sendEventToBridge({
        response: connectResponse,
        clientSessionId: dAppSessionId,
      })

      console.log('Connection response sent to dApp:', connectResponse)
    } catch (error) {
      console.error('Failed to handle connection URL:', error)
      throw error
    }
  }

  // 解析连接URL
  private parseConnectionUrl(url: string): ConnectionUrlParams {
    try {
      const urlObj = new URL(url)
      const params = new URLSearchParams(urlObj.search)

      const v = params.get('v')
      const id = params.get('id')
      const r = params.get('r')

      if (!v || !id || !r) {
        throw new Error('Invalid connection URL format')
      }

      return { v, id, r }
    } catch (error) {
      throw new Error('Failed to parse connection URL')
    }
  }

  private async handleIncomingMessage(message: BridgeMessage) {
    try {
      // 尝试解密消息
      const decryptedMessage = this.decryptMessage(message)
      const request: TonConnectMessage = JSON.parse(decryptedMessage)

      console.log('Received request:', request)

      switch (request.method) {
        case 'connect':
          await this.handleConnectRequest(request, message.from)
          break
        case 'sendTransaction':
          await this.handleSendTransaction(request, message.from)
          break
        default:
          console.warn('Unknown method:', request.method)
      }
    } catch (error) {
      console.error('Failed to handle message:', error)
    }
  }

  private decryptMessage(message: BridgeMessage): string {
    try {
      // 解密收到的消息
      const senderPublicKey = Buffer.from(message.from, 'hex')
      const encryptedData = Buffer.from(message.message, 'base64')
      return this.sessionCrypto.decrypt(encryptedData, senderPublicKey)
    } catch (error) {
      console.error('Failed to decrypt message:', error)
      throw error
    }
  }

  private async handleConnectRequest(request: TonConnectMessage, from: string) {
    if (!this.walletInfo) {
      await this.sendError(from, request.id, 'Wallet not available')
      return
    }

    const connectRequest = request.params[0] as ConnectRequest

    // 显示连接确认对话框
    const confirmed = window.confirm(
      `Connect to dApp?\n\nManifest: ${connectRequest.manifestUrl}`,
    )

    if (!confirmed) {
      await this.sendError(from, request.id, 'User rejected connection')
      return
    }

    // 存储连接
    this.connections.set(from, from)
    // 保存连接信息到存储
    const store = getDefaultStore()
    const connectionsArray = Array.from(this.connections.entries()).map(
      ([clientSessionId]) => ({
        clientSessionId,
        timestamp: Date.now(),
      }),
    )
    store.set(dappConnectionsAtom, connectionsArray)

    // 创建连接响应 - 直接的 ConnectEvent 格式
    const connectResponse: ConnectResponse = {
      event: 'connect',
      id: Date.now(),
      payload: {
        items: connectRequest.items.map((item) => {
          switch (item.name) {
            case 'ton_addr':
              return {
                name: 'ton_addr',
                address: ensureRawAddressFormat(
                  this.walletInfo!.rawAddress || this.walletInfo!.address,
                ),
                network: -239, // mainnet
                publicKey: this.walletInfo!.publicKey,
                walletStateInit: 'te6ccgEBAQEAOgAAuuMC',
              }
            case 'ton_proof':
              return {
                name: 'ton_proof',
                proof: {
                  timestamp: Math.floor(Date.now() / 1000),
                  domain: {
                    lengthBytes: 0,
                    value: '',
                  },
                  signature: this.generateProofSignature(),
                  payload: item.payload || '',
                },
              }
            default:
              throw new Error(`Unsupported item: ${item.name}`)
          }
        }),
        device: {
          platform: 'chrome',
          appName: 'TON Wallet',
          appVersion: '1.0.0',
          maxProtocolVersion: 2,
          features: ['SendTransaction'],
        },
      },
    }

    // 调试信息：检查发送给 dApp 的地址格式
    const tonAddrItem = connectResponse.payload.items.find(
      (item) => item.name === 'ton_addr',
    )
    if (tonAddrItem) {
      console.log(
        '📤 About to send address to dApp (from handleConnectRequest):',
        tonAddrItem.address,
      )
      console.log(
        '   Address includes ":":',
        tonAddrItem.address?.includes(':'),
      )
    }

    // 发送响应 - 包装在 JSON-RPC 响应中
    await this.sendEventToBridge({
      response: {
        id: request.id,
        result: connectResponse,
      },
      clientSessionId: from,
    })
  }

  private async handleSendTransaction(
    request: TonConnectMessage,
    from: string,
  ) {
    if (!this.walletInfo) {
      await this.sendError(from, request.id, 'Wallet not available')
      return
    }

    console.log('Received transaction request:', request)
    console.log('Transaction params:', request.params)
    console.log('First param type:', typeof request.params[0])
    console.log('First param value:', request.params[0])

    // 解析交易参数 - 可能是字符串需要JSON解析，也可能已经是对象
    let transaction: SendTransactionRequest
    try {
      if (typeof request.params[0] === 'string') {
        transaction = JSON.parse(request.params[0] as string)
      } else {
        transaction = request.params[0] as SendTransactionRequest
      }
    } catch (error) {
      console.error('Failed to parse transaction params:', error)
      await this.sendError(from, request.id, 'Invalid transaction format')
      return
    }

    console.log('Parsed transaction:', transaction)

    // 检查transaction对象的结构
    if (!transaction) {
      await this.sendError(from, request.id, 'Invalid transaction data')
      return
    }

    // 安全地访问transaction属性
    const validUntil = transaction.valid_until
      ? new Date(transaction.valid_until * 1000).toLocaleString()
      : 'Not specified'

    const messageCount = transaction.messages?.length ?? 0
    const messages = transaction.messages || []

    // 构建确认对话框的详细信息
    let transactionInfo = `Send transaction?\n\nValid until: ${validUntil}\nMessages: ${messageCount}`

    if (messages.length > 0) {
      transactionInfo += '\n\nTransaction details:'
      messages.forEach((msg, index) => {
        transactionInfo += `\n${index + 1}. To: ${msg.address || 'Unknown'}`
        transactionInfo += `\n   Amount: ${msg.amount || '0'} nanoTON`
        if (msg.payload) {
          transactionInfo += `\n   Payload: ${msg.payload}`
        }
      })
    }

    console.log('transactionInfo', transactionInfo)

    try {
      // 使用交易处理器进行用户确认
      const approved = this.transactionHandler
        ? await this.transactionHandler(transaction)
        : window.confirm(transactionInfo) // fallback to old confirm

      if (!approved) {
        await this.sendError(from, request.id, 'User rejected transaction')
        return
      }

      // 使用真实的TON钱包创建交易BOC
      if (!this.tonWallet) {
        throw new Error('TON wallet not available')
      }

      const boc = await this.tonWallet.createTransactionBoc(messages)
      console.log('Created real transaction BOC:', boc)

      await this.sendEventToBridge({
        response: {
          id: request.id,
          result: { boc },
        },
        clientSessionId: from,
      })
    } catch (error) {
      console.error('Failed to create transaction BOC:', error)
      await this.sendError(
        from,
        request.id,
        `Failed to create transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  private generateProofSignature(): string {
    // 生成128字符的十六进制签名（只包含0-9, a-f）
    const chars = '0123456789abcdef'
    let result = ''
    for (let i = 0; i < 128; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  // 发送加密消息到Bridge
  private async sendEventToBridge({
    response,
    clientSessionId,
    ttl = defaultTtl,
  }: {
    response: unknown
    clientSessionId: string
    ttl?: number
  }): Promise<void> {
    try {
      const url = `${this.bridgeUrl}/message?client_id=${this.sessionCrypto.sessionId}&to=${clientSessionId}&ttl=${ttl}`

      // 加密响应
      const clientPublicKey = Buffer.from(clientSessionId, 'hex')
      const encryptedResponse = this.sessionCrypto.encrypt(
        JSON.stringify(response),
        clientPublicKey,
      )

      console.log('Sending response to dApp:', response)
      console.log('Client Session ID:', clientSessionId)
      console.log('Our Session ID:', this.sessionCrypto.sessionId)

      const response_req = await fetch(url, {
        method: 'POST',
        body: Buffer.from(encryptedResponse).toString('base64'),
      })

      if (!response_req.ok) {
        const errorText = await response_req.text()
        throw new Error(
          `Bridge request failed: ${response_req.status} ${errorText}`,
        )
      }

      console.log('Encrypted message sent to bridge successfully')
    } catch (error) {
      console.error('Failed to send bridge message:', error)
    }
  }

  private async sendError(
    clientSessionId: string,
    requestId: string,
    error: string,
  ): Promise<void> {
    await this.sendEventToBridge({
      response: {
        id: requestId,
        error: {
          code: -1,
          message: error,
        },
      },
      clientSessionId,
    })
  }

  private reconnect() {
    if (this.eventSource) {
      this.eventSource.close()
    }
    setTimeout(() => this.startListening(), 5000)
  }

  // 停止监听
  stop() {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
    this.isListeningToBridge = false
  }

  // 断开连接
  disconnect() {
    this.stop()
    this.walletInfo = null
    this.connections.clear()
  }

  // 检查是否正在监听
  isListening(): boolean {
    return this.isListeningToBridge
  }

  getSessionId(): string {
    return this.sessionCrypto.sessionId
  }

  getBridgeUrl(): string {
    return this.bridgeUrl
  }

  getClientId(): string {
    return this.sessionCrypto.sessionId
  }

  getKeyPair(): KeyPair {
    return this.sessionCrypto.stringifyKeypair()
  }
}
