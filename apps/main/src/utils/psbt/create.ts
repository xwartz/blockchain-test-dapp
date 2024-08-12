import * as bitcoin from 'bitcoinjs-lib'
import * as ecc from '@bitcoin-js/tiny-secp256k1-asmjs'

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
  bitcoin.initEccLib(ecc)
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
    value: 2000,
  })

  psbt.addOutput({
    address: 'tb1pv9w2hxrdf3mdw0m4efyze0ext7mmpmyt632dl203sp85yfst3m2qq2ylqf',
    value: 1000,
  })

  psbt.addOutput({
    address: 'tb1q8nex3hshcs86nmre2g34cfjl8555n0yxzh4fcy',
    value: 1000,
  })

  psbt.addOutput({
    address: 'tb1pm8tddeyeq52p5nucq39h4t258lv4dvlmghgh6x8r64q7lhldmfes6f72q3',
    value: 1000,
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
