import * as bitcoin from 'bitcoinjs-lib'
import ECPairFactory from 'ecpair'
import * as ecc from '@bitcoin-js/tiny-secp256k1-asmjs'
import { Network } from '../providers/base'
import { toPsbtNetwork } from '../network/transport'

bitcoin.initEccLib(ecc)
const ECPair = ECPairFactory(ecc)

const validator = (
  pubkey: Buffer,
  msghash: Buffer,
  signature: Buffer,
): boolean => ECPair.fromPublicKey(pubkey).verify(msghash, signature)

const schnorrValidator = (
  pubkey: Buffer,
  msghash: Buffer,
  signature: Buffer,
): boolean => {
  return ECPair.fromPublicKey(pubkey).verifySchnorr(msghash, signature)
}

export function verifyMessageOfBIP322Simple(
  address: string,
  msg: string,
  signature: string,
  networkType: Network,
) {
  if (/^(bc1p|tb1p)/.test(address)) {
    return verifySignatureOfBIP322Simple_P2TR(
      address,
      msg,
      signature,
      networkType,
    )
  } else if (/^(bc1q|tb1q)/.test(address)) {
    return verifySignatureOfBIP322Simple_P2PWPKH(
      address,
      msg,
      signature,
      networkType,
    )
  }
  return false
}

function bip0322_hash(message: string) {
  const { sha256 } = bitcoin.crypto
  const tag = 'BIP0322-signed-message'
  const tagHash = sha256(Buffer.from(tag))
  const result = sha256(Buffer.concat([tagHash, tagHash, Buffer.from(message)]))
  return result.toString('hex')
}

function verifySignatureOfBIP322Simple_P2TR(
  address: string,
  msg: string,
  sign: string,
  networkType: Network,
) {
  const network = toPsbtNetwork(networkType)
  const outputScript = bitcoin.address.toOutputScript(address, network)
  const prevoutHash = Buffer.from(
    '0000000000000000000000000000000000000000000000000000000000000000',
    'hex',
  )
  const prevoutIndex = 0xffffffff
  const sequence = 0
  const scriptSig = Buffer.concat([
    Buffer.from('0020', 'hex'),
    Buffer.from(bip0322_hash(msg), 'hex'),
  ])

  const txToSpend = new bitcoin.Transaction()
  txToSpend.version = 0
  txToSpend.addInput(prevoutHash, prevoutIndex, sequence, scriptSig)
  txToSpend.addOutput(outputScript, 0)

  const data = Buffer.from(sign, 'base64')
  const res = bitcoin.script.decompile(data.slice(1))
  const signature = res?.[0] as Buffer
  const pubkey = Buffer.from(
    `02${outputScript.subarray(2).toString('hex')}`,
    'hex',
  )

  const psbtToSign = new bitcoin.Psbt()
  psbtToSign.setVersion(0)
  psbtToSign.addInput({
    hash: txToSpend.getHash(),
    index: 0,
    sequence: 0,
    witnessUtxo: {
      script: outputScript,
      value: 0,
    },
  })
  psbtToSign.addOutput({ script: Buffer.from('6a', 'hex'), value: 0 })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tapKeyHash = (psbtToSign as any).__CACHE.__TX.hashForWitnessV1(
    0,
    [outputScript],
    [0],
    0,
  )
  return schnorrValidator(pubkey, tapKeyHash, signature)
}

function verifySignatureOfBIP322Simple_P2PWPKH(
  address: string,
  msg: string,
  sign: string,
  networkType: Network = Network.MAINNET,
) {
  const network = toPsbtNetwork(networkType)
  const outputScript = bitcoin.address.toOutputScript(address, network)

  const prevoutHash = Buffer.from(
    '0000000000000000000000000000000000000000000000000000000000000000',
    'hex',
  )
  const prevoutIndex = 0xffffffff
  const sequence = 0
  const scriptSig = Buffer.concat([
    Buffer.from('0020', 'hex'),
    Buffer.from(bip0322_hash(msg), 'hex'),
  ])

  const txToSpend = new bitcoin.Transaction()
  txToSpend.version = 0
  txToSpend.addInput(prevoutHash, prevoutIndex, sequence, scriptSig)
  txToSpend.addOutput(outputScript, 0)

  const data = Buffer.from(sign, 'base64')
  const res = bitcoin.script.decompile(data.slice(1))

  const psbtToSign = new bitcoin.Psbt()
  psbtToSign.setVersion(0)
  psbtToSign.addInput({
    hash: txToSpend.getHash(),
    index: 0,
    sequence: 0,
    witnessUtxo: {
      script: outputScript,
      value: 0,
    },
  })
  psbtToSign.addOutput({ script: Buffer.from('6a', 'hex'), value: 0 })

  psbtToSign.updateInput(0, {
    partialSig: [
      {
        pubkey: res?.[1] as Buffer,
        signature: res?.[0] as Buffer,
      },
    ],
  })
  return psbtToSign.validateSignaturesOfAllInputs(validator)
}

export function genPsbtOfBIP322Simple({
  message,
  address,
  networkType,
}: {
  message: string
  address: string
  networkType: Network
}) {
  const outputScript = addressToScriptPk(address, networkType)

  const prevoutHash = Buffer.from(
    '0000000000000000000000000000000000000000000000000000000000000000',
    'hex',
  )
  const prevoutIndex = 0xffffffff
  const sequence = 0
  const scriptSig = Buffer.concat([
    Buffer.from('0020', 'hex'),
    Buffer.from(bip0322_hash(message), 'hex'),
  ])

  const txToSpend = new bitcoin.Transaction()
  txToSpend.version = 0
  txToSpend.addInput(prevoutHash, prevoutIndex, sequence, scriptSig)
  txToSpend.addOutput(outputScript, 0)

  const psbtToSign = new bitcoin.Psbt()
  psbtToSign.setVersion(0)
  psbtToSign.addInput({
    hash: txToSpend.getHash(),
    index: 0,
    sequence: 0,
    witnessUtxo: {
      script: outputScript,
      value: 0,
    },
  })
  psbtToSign.addOutput({ script: Buffer.from('6a', 'hex'), value: 0 })

  return psbtToSign
}

function addressToScriptPk(address: string, networkType: Network) {
  const network = toPsbtNetwork(networkType)
  return bitcoin.address.toOutputScript(address, network)
}
