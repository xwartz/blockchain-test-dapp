import { keccak256 } from 'js-sha3'
import type { TIP712Domain, TIP712TypeField, TIP712Payload } from '@/types'

// ── Hex helpers ──────────────────────────────────────────────

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function hexToBytes(hex: string): Uint8Array {
  const h = hex.startsWith('0x') ? hex.slice(2) : hex
  const bytes = new Uint8Array(h.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(h.substring(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

function keccak256Bytes(input: Uint8Array): Uint8Array {
  return hexToBytes(keccak256(input))
}

function keccak256Hex(input: Uint8Array): string {
  return '0x' + keccak256(input)
}

function utf8ToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str)
}

function padLeft(hex: string, bytes: number): string {
  const h = hex.startsWith('0x') ? hex.slice(2) : hex
  return h.padStart(bytes * 2, '0')
}

// ── TRON address helpers ────────────────────────────────────

/** Convert TRON base58 address to 20-byte hex (strip 0x41 prefix). */
export function tronAddressToHex20(address: string): string {
  // If it's already a hex address starting with 41
  if (/^(0x)?41[0-9a-fA-F]{40}$/.test(address)) {
    const hex = address.startsWith('0x') ? address.slice(2) : address
    return hex.slice(2) // strip "41"
  }

  // Try using tronWeb if available
  if (window.tronWeb) {
    try {
      const hex = window.tronWeb.address.toHex(address)
      // toHex returns hex with "41" prefix
      return hex.startsWith('41') ? hex.slice(2) : hex
    } catch {
      // fall through
    }
  }

  throw new Error(`Cannot convert TRON address: ${address}`)
}

// ── Type encoding ───────────────────────────────────────────

/** Build the encodeType string for a given type, following EIP-712 */
function encodeType(
  typeName: string,
  types: Record<string, TIP712TypeField[]>,
): string {
  const fields = types[typeName]
  if (!fields) throw new Error(`Type not found: ${typeName}`)

  const primary = `${typeName}(${fields.map((f) => `${f.type} ${f.name}`).join(',')})`

  // Collect referenced struct types (not including self)
  const referenced = new Set<string>()
  const collectDeps = (name: string) => {
    for (const field of types[name] || []) {
      const baseType = field.type.replace(/\[\d*\]$/, '') // strip array suffix
      if (
        types[baseType] &&
        baseType !== typeName &&
        !referenced.has(baseType)
      ) {
        referenced.add(baseType)
        collectDeps(baseType)
      }
    }
  }
  collectDeps(typeName)

  // Sort alphabetically and append
  const sorted = [...referenced].sort()
  const suffix = sorted
    .map((t) => {
      const fs = types[t]!
      return `${t}(${fs.map((f) => `${f.type} ${f.name}`).join(',')})`
    })
    .join('')

  return primary + suffix
}

/** Compute typeHash = keccak256(encodeType) */
function typeHash(
  typeName: string,
  types: Record<string, TIP712TypeField[]>,
): Uint8Array {
  const encoded = encodeType(typeName, types)
  return keccak256Bytes(utf8ToBytes(encoded))
}

// ── Field encoding ──────────────────────────────────────────

function encodeField(
  fieldType: string,
  value: unknown,
  types: Record<string, TIP712TypeField[]>,
): Uint8Array {
  // Array types
  const arrayMatch = fieldType.match(/^(.+?)(\[\d*\])$/)
  if (arrayMatch) {
    const baseType = arrayMatch[1]
    const arr = value as unknown[]
    const encoded = new Uint8Array(arr.length * 32)
    arr.forEach((item, i) => {
      encoded.set(encodeField(baseType, item, types), i * 32)
    })
    return keccak256Bytes(encoded)
  }

  // Struct types (referenced in types object)
  if (types[fieldType]) {
    return hashStruct(fieldType, value as Record<string, unknown>, types)
  }

  // Atomic / dynamic types
  switch (fieldType) {
    case 'string':
      return keccak256Bytes(utf8ToBytes(value as string))

    case 'bytes':
      return keccak256Bytes(hexToBytes(value as string))

    case 'address': {
      const hex20 = tronAddressToHex20(value as string)
      return hexToBytes(padLeft(hex20, 32))
    }

    case 'bool':
      return hexToBytes(padLeft(value ? '1' : '0', 32))

    case 'trcToken':
    case 'uint256':
    case 'uint128':
    case 'uint160':
    case 'uint48':
    case 'uint8': {
      const n = BigInt(value as string | number)
      return hexToBytes(padLeft(n.toString(16), 32))
    }

    case 'int256': {
      let n = BigInt(value as string | number)
      if (n < 0n) {
        n = (1n << 256n) + n // two's complement
      }
      return hexToBytes(padLeft(n.toString(16), 32))
    }

    case 'bytes32':
    case 'bytes31':
    case 'bytes20':
    case 'bytes16':
    case 'bytes8':
    case 'bytes4':
    case 'bytes1': {
      const h = (value as string).startsWith('0x')
        ? (value as string).slice(2)
        : (value as string)
      // Right-pad to 32 bytes
      return hexToBytes(h.padEnd(64, '0'))
    }

    default: {
      // Fallback: try as uint
      if (fieldType.startsWith('uint') || fieldType.startsWith('int')) {
        const n = BigInt(value as string | number)
        return hexToBytes(padLeft(n.toString(16), 32))
      }
      if (fieldType.startsWith('bytes')) {
        const h = (value as string).startsWith('0x')
          ? (value as string).slice(2)
          : (value as string)
        return hexToBytes(h.padEnd(64, '0'))
      }
      throw new Error(`Unsupported type: ${fieldType}`)
    }
  }
}

// ── hashStruct ──────────────────────────────────────────────

function hashStruct(
  typeName: string,
  data: Record<string, unknown>,
  types: Record<string, TIP712TypeField[]>,
): Uint8Array {
  const fields = types[typeName]
  if (!fields) throw new Error(`Type not found: ${typeName}`)

  const th = typeHash(typeName, types)
  const encodedFields = fields.map((f) =>
    encodeField(f.type, data[f.name], types),
  )

  // Concatenate: typeHash + encodedField1 + encodedField2 + ...
  const totalLen = 32 + encodedFields.length * 32
  const buffer = new Uint8Array(totalLen)
  buffer.set(th, 0)
  encodedFields.forEach((ef, i) => buffer.set(ef, 32 + i * 32))

  return keccak256Bytes(buffer)
}

// ── Domain separator ────────────────────────────────────────

function buildDomainType(domain: TIP712Domain): TIP712TypeField[] {
  const fields: TIP712TypeField[] = []
  if (domain.name !== undefined) fields.push({ name: 'name', type: 'string' })
  if (domain.version !== undefined)
    fields.push({ name: 'version', type: 'string' })
  if (domain.chainId !== undefined)
    fields.push({ name: 'chainId', type: 'uint256' })
  if (domain.verifyingContract !== undefined)
    fields.push({ name: 'verifyingContract', type: 'address' })
  if (domain.salt !== undefined) fields.push({ name: 'salt', type: 'bytes32' })
  return fields
}

function computeDomainSeparator(domain: TIP712Domain): Uint8Array {
  const domainFields = buildDomainType(domain)
  const domainTypes: Record<string, TIP712TypeField[]> = {
    EIP712Domain: domainFields,
  }
  const domainData: Record<string, unknown> = {}
  if (domain.name !== undefined) domainData['name'] = domain.name
  if (domain.version !== undefined) domainData['version'] = domain.version
  if (domain.chainId !== undefined) domainData['chainId'] = domain.chainId
  if (domain.verifyingContract !== undefined)
    domainData['verifyingContract'] = domain.verifyingContract
  if (domain.salt !== undefined) domainData['salt'] = domain.salt

  return hashStruct('EIP712Domain', domainData, domainTypes)
}

// ── Signing hash ────────────────────────────────────────────

export interface HashResult {
  signingHash: string
  domainSeparator: string
  messageHash: string
  domainTypeString: string
  messageTypeString: string
  domainTypeHash: string
  messageTypeHash: string
}

export function computeSigningHash(payload: TIP712Payload): HashResult {
  const { domain, types, primaryType, message } = payload

  // Domain separator
  const ds = computeDomainSeparator(domain)
  const domainSeparatorHex = '0x' + toHex(ds)

  // Message hash
  const mh = hashStruct(primaryType, message as Record<string, unknown>, types)
  const messageHashHex = '0x' + toHex(mh)

  // Signing hash = keccak256(\x19\x01 ‖ domainSeparator ‖ messageHash)
  const prefix = new Uint8Array([0x19, 0x01])
  const input = new Uint8Array(66)
  input.set(prefix, 0)
  input.set(ds, 2)
  input.set(mh, 34)
  const signingHashHex = keccak256Hex(input)

  // Debug info
  const domainFields = buildDomainType(domain)
  const domainTypeStr = `EIP712Domain(${domainFields.map((f) => `${f.type} ${f.name}`).join(',')})`
  const messageTypeStr = encodeType(primaryType, types)

  return {
    signingHash: signingHashHex,
    domainSeparator: domainSeparatorHex,
    messageHash: messageHashHex,
    domainTypeString: domainTypeStr,
    messageTypeString: messageTypeStr,
    domainTypeHash: keccak256Hex(utf8ToBytes(domainTypeStr)),
    messageTypeHash: keccak256Hex(utf8ToBytes(messageTypeStr)),
  }
}

// ── Signature helpers ───────────────────────────────────────

export function splitSignature(signature: string): {
  r: string
  s: string
  v: number
} {
  const raw = signature.startsWith('0x') ? signature.slice(2) : signature
  if (raw.length !== 130) {
    throw new Error(`Invalid signature length: ${raw.length}, expected 130`)
  }
  const r = '0x' + raw.slice(0, 64)
  const s = '0x' + raw.slice(64, 128)
  let v = parseInt(raw.slice(128, 130), 16)
  // Normalize v: if 0 or 1, add 27
  if (v === 0 || v === 1) {
    v += 27
  }
  if (v !== 27 && v !== 28) {
    throw new Error(`Invalid v value: ${v}`)
  }
  return { r, s, v }
}

export function normalizeSignature(signature: string): string {
  const { r, s, v } = splitSignature(signature)
  return '0x' + r.slice(2) + s.slice(2) + v.toString(16).padStart(2, '0')
}
