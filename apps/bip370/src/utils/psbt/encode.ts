import { Psbt } from 'bitcoinjs-lib'

export enum SegWitType {
  VERSION_1 = 'VERSION_1',
  VERSION_0 = 'VERSION_0',
  P2WPKH = 'P2WPKH',
  NONE = 'NONE',
}

const toXOnly = (pubKey: Buffer) =>
  pubKey.length === 32 ? pubKey : pubKey.slice(1, 33)

export type ToSignInput = {
  txHash: string
  vout: number
  scriptPubKey: string
  scriptType: string
  amount: string
  address: string
  blockNumber: number
  derivedPath: string
}

type Account = {
  path: string
  segWit: SegWitType
  publicKey: string
}

export const getAccountPath = (path: string) => {
  if (!path) return path
  const pathSplit = path.split('/')
  const [m, purpose, coinType, account] = pathSplit
  return `${m}/${purpose}/${coinType}/${account}`
}

export const addBip32DerivationToPSBT = (
  psbtHex: string,
  toSignInputs: ToSignInput[],
  account: Account,
) => {
  if (!toSignInputs.length) return psbtHex

  const psbt = Psbt.fromHex(psbtHex)
  const isWitness = account.segWit !== SegWitType.NONE
  const accountPath = getAccountPath(account.path)
  const accountPublicKey = account.publicKey.replace(/^0x/, '')
  if (isWitness) {
    const isP2TR = account.segWit === SegWitType.VERSION_1
    psbt.data.inputs.forEach((input, index) => {
      const scriptPubKey = input.witnessUtxo?.script.toString('hex')
      const signInput = toSignInputs?.find(
        (signInput) => scriptPubKey === signInput.scriptPubKey,
      )
      const derivationName = isP2TR ? 'tapBip32Derivation' : 'bip32Derivation'
      const derivation = psbt.data.inputs[index][derivationName]

      if (!signInput || derivation) return

      const path = `${accountPath}/${signInput.derivedPath}`
      const bypassPubkey = Buffer.from(accountPublicKey, 'hex')
      const bypassFingerprint = Buffer.from('00', 'hex')
      const pubkey = toXOnly(bypassPubkey)
      const bip32Derivation = {
        masterFingerprint: bypassFingerprint,
        path,
        pubkey,
      }
      if (isP2TR) {
        psbt.data.inputs[index].tapBip32Derivation = [
          {
            ...bip32Derivation,
            leafHashes: [],
          },
        ]
      } else {
        psbt.data.inputs[index].bip32Derivation = [bip32Derivation]
      }
    })
  }
  return psbt.toHex()
}
