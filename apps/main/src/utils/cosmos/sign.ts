import { pubkeyType, StdFee } from '@cosmjs/amino'
import { fromHex, toBase64, toHex } from '@cosmjs/encoding'
import {
  coins,
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

type Msg = {
  typeUrl: string
  value: MsgSend // todo: other tx types
}

export const genMsgSend = (
  sender: string,
  recipient: string,
  amount: string,
  denom: string,
) => {
  return {
    typeUrl: MsgSend.typeUrl,
    value: {
      fromAddress: sender,
      toAddress: recipient,
      amount: coins(amount, denom),
    },
  }
}

type SignMessage = {
  pubKey: string
  msgs: Msg[]
  memo: string
  sequence: number
  fee: StdFee
  chainId: string
  accountNumber: number
}
export const makeSignMessage = ({
  pubKey,
  msgs,
  memo,
  sequence,
  fee,
  chainId,
  accountNumber,
}: SignMessage) => {
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
