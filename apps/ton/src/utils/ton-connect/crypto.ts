import nacl from 'tweetnacl'

export interface KeyPair {
  publicKey: string
  secretKey: string
}

export function toHexString(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function concatUint8Arrays(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const array of arrays) {
    result.set(array, offset)
    offset += array.length
  }
  return result
}

export class SessionCrypto {
  private readonly nonceLength = 24
  private readonly keyPair: nacl.BoxKeyPair
  public readonly sessionId: string

  constructor(keyPair?: KeyPair) {
    this.keyPair = keyPair
      ? this.createKeypairFromString(keyPair)
      : this.createKeypair()
    this.sessionId = toHexString(this.keyPair.publicKey)
  }

  private createKeypair(): nacl.BoxKeyPair {
    return nacl.box.keyPair()
  }

  private createKeypairFromString(keyPair: KeyPair): nacl.BoxKeyPair {
    return {
      publicKey: Buffer.from(keyPair.publicKey, 'hex'),
      secretKey: Buffer.from(keyPair.secretKey, 'hex'),
    }
  }

  private createNonce(): Uint8Array {
    return nacl.randomBytes(this.nonceLength)
  }

  public encrypt(message: string, receiverPublicKey: Buffer): Uint8Array {
    const encodedMessage = new TextEncoder().encode(message)
    const nonce = this.createNonce()
    const encrypted = nacl.box(
      encodedMessage,
      nonce,
      receiverPublicKey,
      this.keyPair.secretKey,
    )
    if (!encrypted) {
      throw new Error('Encryption failed')
    }
    return concatUint8Arrays(nonce, encrypted)
  }

  public decrypt(message: Buffer, senderPublicKey: Buffer): string {
    const nonce = message.subarray(0, this.nonceLength)
    const internalMessage = message.subarray(this.nonceLength)

    const decrypted = nacl.box.open(
      internalMessage,
      nonce,
      senderPublicKey,
      this.keyPair.secretKey,
    )

    if (!decrypted) {
      throw new Error(
        `Decryption error: \n message: ${message.toString()} \n sender pubkey: ${senderPublicKey.toString()} \n keypair pubkey: ${this.keyPair.publicKey.toString()} \n keypair secretkey: ${this.keyPair.secretKey.toString()}`,
      )
    }

    return new TextDecoder().decode(decrypted)
  }

  public stringifyKeypair(): KeyPair {
    return {
      publicKey: Buffer.from(this.keyPair.publicKey).toString('hex'),
      secretKey: Buffer.from(this.keyPair.secretKey).toString('hex'),
    }
  }
}
