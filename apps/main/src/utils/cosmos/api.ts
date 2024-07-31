import { Account, defaultRegistryTypes, StargateClient } from '@cosmjs/stargate'
import { Any } from 'cosmjs-types/google/protobuf/any'
import { Pubkey, pubkeyType } from '@cosmjs/amino'
import { Coin } from 'cosmjs-types/cosmos/base/v1beta1/coin'
import { SimulateResponse } from 'cosmjs-types/cosmos/tx/v1beta1/service'
import { chains } from 'chain-registry'
import { StatusResponse } from '@cosmjs/tendermint-rpc'
import { EncodeObject, Registry } from '@cosmjs/proto-signing'
import { TxBody } from 'cosmjs-types/cosmos/tx/v1beta1/tx'
import { fromHex, toBase64 } from '@cosmjs/encoding'

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
    const registry = new Registry(defaultRegistryTypes)
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
  getGasPrice(fees: Chains[number]['fees'], denom: string) {
    const feeToken = fees?.fee_tokens.find((f) => f.denom === denom)
    if (!feeToken) {
      throw new Error('Fee token not found')
    }
    return {
      gasPrice: feeToken.average_gas_price ?? 1,
      highGasPrice: feeToken.high_gas_price ?? 1,
      lowGasPrice: feeToken.low_gas_price ?? 1,
      denom,
    }
  }
  disconnect() {
    this.client.disconnect()
  }
}
