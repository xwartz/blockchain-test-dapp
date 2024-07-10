import * as bitcoin from 'bitcoinjs-lib'
import * as ecc from '@bitcoin-js/tiny-secp256k1-asmjs'
import { Network } from '../providers/base'
import { toPsbtNetwork } from '../network/transport'
import { decodePsbt } from '../mempool/api'

bitcoin.initEccLib(ecc)

const getScriptPubKey = (script: Buffer, network: Network) => {
  const nw = toPsbtNetwork(network)
  const chunks = bitcoin.script.decompile(script)
  const opNumber = chunks?.[0]
  let ascii = ''
  const asm = bitcoin.script.toASM(chunks as Buffer[])
  if (opNumber && opNumber === bitcoin.opcodes.OP_RETURN) {
    const opReturnData = chunks.slice(1)
    const asciiData = opReturnData.map((chunk) => {
      if (Buffer.isBuffer(chunk)) {
        return chunk.toString('ascii')
      }
      return chunk
    })
    ascii = asciiData.join('')
  }
  try {
    return {
      address: bitcoin.address.fromOutputScript(script, nw),
      hex: script.toString('hex'),
      asm,
      ascii,
    }
  } catch (e) {
    return {
      address: undefined,
      hex: script.toString('hex'),
      asm,
      ascii,
    }
  }
}

type Result = {
  tx: {
    inputs: {
      scriptPubKey: {
        address: string | undefined
        hex: string
        asm: string
        ascii: string
      }
      value: number
    }[]
    outputs: {
      scriptPubKey: {
        address: string | undefined
        hex: string
        asm: string
        ascii: string
      }
      value: number
    }[]
    txid: string
    fee: number
    vsize: number
  }
  version: number
}
export const decodeFromHex = (psbtHex: string, network: Network): Result => {
  const psbt = bitcoin.Psbt.fromHex(psbtHex, {
    network: toPsbtNetwork(network),
  })

  const unSignedTx = bitcoin.Transaction.fromBuffer(psbt.data.getTransaction())
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
    const scriptPubKey = getScriptPubKey(script, network)
    result.tx.inputs.push({
      scriptPubKey,
      value: value / 1e8,
    })
  })

  psbt.txOutputs.forEach(({ script, value }) => {
    const scriptPubKey = getScriptPubKey(script, network)
    result.tx.outputs.push({
      scriptPubKey,
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
  const psbt = bitcoin.Psbt.fromHex(psbtHex)
  const psbtBase64 = psbt.toBase64()
  const { result } = await decodePsbt(psbtBase64)
  return result
}

export const getSignature = (signedHex: string) => {
  const tx = bitcoin.Psbt.fromHex(signedHex).extractTransaction()
  return tx.toHex()
}
