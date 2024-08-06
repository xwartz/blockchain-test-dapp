import { Account, StargateClient } from '@cosmjs/stargate'
import { pubkeyType } from '@cosmjs/amino'
import { Coin } from 'cosmjs-types/cosmos/base/v1beta1/coin'
import { SimulateResponse } from 'cosmjs-types/cosmos/tx/v1beta1/service'
import { chains } from 'chain-registry'
import { StatusResponse } from '@cosmjs/tendermint-rpc'
import { EncodeObject } from '@cosmjs/proto-signing'
import { fromHex, toBase64 } from '@cosmjs/encoding'
import axios from 'axios'
import { getRegistry } from './registry'

const IBC_URL = 'https://assets.leapwallet.io/ibc-support-db/pairs'

interface IBCData {
  $schema: string
  chain_1: Blockchain
  chain_2: Blockchain
  channels: Channel[]
}

interface Channel {
  chain_1: Blockchain
  chain_2: Blockchain
  ordering: string
  version: string
}

interface Blockchain {
  channel_id: string
  port_id: string
  connection_id?: string
}

type Chains = typeof chains

export class ApiClient {
  private client: StargateClient

  public static async getClient(
    rpcs: Array<{ address: string }>,
  ): Promise<ApiClient> {
    return new ApiClient(
      await Promise.any(
        rpcs.map(async (rpc) => {
          const client = await StargateClient.connect(rpc.address)
          await client.getChainId()
          return client
        }),
      ),
    )
  }

  public static async connect(endpoint: string): Promise<ApiClient> {
    const client = await StargateClient.connect(endpoint)
    return new ApiClient(client)
  }

  constructor(client: StargateClient) {
    this.client = client
  }

  async status(): Promise<StatusResponse> {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    return await this.client.forceGetCometClient().status()
  }

  async getAccountInfo(address: string): Promise<Account> {
    const account = await this.client.getAccount(address)

    if (!account) {
      return {
        address,
        accountNumber: 0,
        sequence: 0,
        pubkey: null,
      }
    }
    return account
  }
  async getAccountBalance(address: string): Promise<Coin[]> {
    return (await this.client.getAllBalances(address)) as Coin[]
  }
  async estimateGas(
    msg: EncodeObject,
    memo: string | undefined,
    pubKey: string,
    sequence: number,
  ): Promise<SimulateResponse> {
    const registry = getRegistry()
    const msgAny = registry.encodeAsAny(msg)
    const messages = [msgAny]
    const signer = {
      type: pubkeyType.secp256k1,
      value: toBase64(fromHex(pubKey)),
    }
    return await this.client
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      .forceGetQueryClient()
      .tx.simulate(messages, memo, signer, sequence)
  }
  getGasPrice(fees: Chains[number]['fees']) {
    const feeToken = fees?.fee_tokens[0]
    if (!feeToken) {
      throw new Error('Fee token not found')
    }
    return {
      gasPrice: feeToken.average_gas_price ?? 1,
      highGasPrice: feeToken.high_gas_price ?? 1,
      lowGasPrice: feeToken.low_gas_price ?? 1,
      denom: feeToken.denom,
    }
  }
  disconnect() {
    this.client.disconnect()
  }
  async getIbcData(
    sourceChain: string,
    recipientChain: string,
  ): Promise<{ chain1: string; chain2: string; ibcData: IBCData }> {
    const chainOrder = [sourceChain, recipientChain]
      .sort()
      .sort((a, b) => a.localeCompare(b))
    const filePath = chainOrder.join('-')
    const response = await axios(`${IBC_URL}/${filePath}.json`)
    const ibcData: IBCData = await response.data
    const [chain1, chain2] = chainOrder
    return { chain1, chain2, ibcData }
  }

  async getSourceChannelId(sourceChainId: string, recipientChainId: string) {
    const sourceChain = chainIdToChainName(sourceChainId)
    const recipientChain = chainIdToChainName(recipientChainId)
    const { chain1, ibcData } = await this.getIbcData(
      sourceChain,
      recipientChain,
    )
    const [channel] = ibcData.channels
    return chain1 === sourceChain
      ? channel['chain_1'].channel_id
      : channel['chain_2'].channel_id
  }
}

function chainIdToChainName(chainId: string) {
  return chainId.split('-')[0]
}
