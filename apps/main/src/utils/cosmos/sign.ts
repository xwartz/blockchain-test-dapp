import { pubkeyType, StdFee } from '@cosmjs/amino'
import { fromHex, toBase64, toHex } from '@cosmjs/encoding'
import {
  encodePubkey,
  makeAuthInfoBytes,
  makeSignBytes,
  makeSignDoc,
  Registry,
} from '@cosmjs/proto-signing'
import { defaultRegistryTypes } from '@cosmjs/stargate'
import { MsgSend } from 'cosmjs-types/cosmos/bank/v1beta1/tx'
import { SignMode } from 'cosmjs-types/cosmos/tx/signing/v1beta1/signing'
import { TxBody } from 'cosmjs-types/cosmos/tx/v1beta1/tx'
import { MsgTransfer } from 'cosmjs-types/ibc/applications/transfer/v1/tx'

export type Msg = {
  typeUrl: string
  value: Partial<MsgSend> | Partial<MsgTransfer> // todo: other tx types
}

export const genMsgSend = (value: Partial<MsgSend>) => {
  return {
    typeUrl: MsgSend.typeUrl,
    value,
  }
}

export const genMsgTransfer = (value: Partial<MsgTransfer>) => {
  return {
    typeUrl: MsgTransfer.typeUrl,
    value,
  }
}

type SignMessage<T extends Msg> = {
  pubKey: string
  msgs: T[]
  memo: string
  sequence: number
  fee: StdFee
  chainId: string
  accountNumber: number
}
export const makeSignMessage = <T extends Msg>({
  pubKey,
  msgs,
  memo,
  sequence,
  fee,
  chainId,
  accountNumber,
}: SignMessage<T>) => {
  const txBodyFields = {
    typeUrl: TxBody.typeUrl,
    value: {
      messages: msgs,
      memo,
    },
  }
  const registry = new Registry(defaultRegistryTypes)
  const bodyBytes = registry.encode(txBodyFields)

  // todo: ed25519
  const pubkey = encodePubkey({
    type: pubkeyType.secp256k1,
    value: toBase64(fromHex(pubKey)),
  })

  const authInfoBytes = makeAuthInfoBytes(
    [{ pubkey, sequence: Number(sequence) }],
    fee.amount,
    Number(fee.gas),
    undefined,
    undefined,
    SignMode.SIGN_MODE_DIRECT,
  )

  const signDoc = makeSignDoc(bodyBytes, authInfoBytes, chainId, accountNumber)
  const signBytes = makeSignBytes(signDoc)
  return toHex(signBytes)
}
