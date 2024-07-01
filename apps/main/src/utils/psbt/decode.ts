import { Psbt, Transaction, address, initEccLib } from 'bitcoinjs-lib'
import * as ecc from '@bitcoin-js/tiny-secp256k1-asmjs'
import { Network } from '../providers/base'
import { toPsbtNetwork } from '../network/transport'
import { decodePsbt } from '../mempool/api'

initEccLib(ecc)

const getAddressFromScript = (script: Buffer, network: Network) => {
  const nw = toPsbtNetwork(network)
  try {
    return address.fromOutputScript(script, nw)
  } catch (e) {
    return ''
  }
}

type Result = {
  tx: {
    inputs: {
      address: string
      value: number
    }[]
    outputs: {
      address: string
      value: number
    }[]
    txid: string
    fee: number
    vsize: number
  }
  version: number
}
export const decodeFromHex = (psbtHex: string, network: Network): Result => {
  const psbt = Psbt.fromHex(psbtHex, {
    network: toPsbtNetwork(network),
  })

  const unSignedTx = Transaction.fromBuffer(psbt.data.getTransaction())
  const txid = unSignedTx.getId()
  const vsize = unSignedTx.virtualSize()

  const result: Result = {
    tx: {
      inputs: [],
      outputs: [],
      txid,
      fee: 0,
      vsize,
    },
    version: psbt.version,
  }

  psbt.data.inputs.forEach(({ witnessUtxo }) => {
    if (!witnessUtxo) {
      return
    }
    const { script, value } = witnessUtxo
    const address = getAddressFromScript(script, network)
    result.tx.inputs.push({
      address,
      value: value / 1e8,
    })
  })

  psbt.txOutputs.forEach(({ script, value }) => {
    const address = getAddressFromScript(script, network)
    result.tx.outputs.push({
      address,
      value: value / 1e8,
    })
  })

  // inputs's value - outputs's value
  result.tx.fee =
    result.tx.inputs.reduce((a, b) => a + b.value, 0) -
    result.tx.outputs.reduce((a, b) => a + b.value, 0)

  return result
}

export const decodeByNode = async (psbtHex: string) => {
  const psbt = Psbt.fromHex(psbtHex)
  const psbtBase64 = psbt.toBase64()
  const { result } = await decodePsbt(psbtBase64)
  return result
}
