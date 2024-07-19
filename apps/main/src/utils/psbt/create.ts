import * as bitcoin from 'bitcoinjs-lib'
import * as ecc from '@bitcoin-js/tiny-secp256k1-asmjs'
bitcoin.initEccLib(ecc)

export interface UTXO {
  // hash of transaction that holds the UTXO
  txid: string
  // index of the output in the transaction
  vout: number
  // amount of satoshis the UTXO holds
  value: number
  // the script that the UTXO contains
  scriptPubKey: string
}

type CreatePsbtParams = {
  toAddress: string
  utxos: UTXO[]
  amount: number
  changeAddress: string
  network: bitcoin.Network
  feeRate: number
}
export const createPSBT = ({
  toAddress,
  utxos,
  amount,
  changeAddress,
  network,
  feeRate,
}: CreatePsbtParams): string => {
  const psbt = new bitcoin.Psbt({ network })

  // 添加输入
  utxos.forEach(({ txid, vout, value, scriptPubKey }) => {
    psbt.addInput({
      hash: txid,
      index: vout,
      witnessUtxo: {
        script: Buffer.from(scriptPubKey, 'hex'),
        value,
      },
    })
  })

  // 添加输出
  psbt.addOutput({
    address: toAddress,
    value: amount,
  })

  // 添加找零输出
  const totalInput = utxos.reduce((sum, { value }) => sum + value, 0)
  const estimatedTxSize = utxos.length * 148 + 2 * 34 + 10
  const fee = feeRate * estimatedTxSize
  const change = totalInput - amount - fee
  // 大于粉尘限额
  if (change > 546) {
    psbt.addOutput({
      address: changeAddress,
      value: change,
    })
  }
  return psbt.toHex()
}
