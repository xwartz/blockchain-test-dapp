import type { TronWeb, TronLink, TIP712Domain, TIP712TypeField } from '@/types'

/** Get TronLink instance from window (if present) */
export function getTronLink(): TronLink | null {
  if (typeof window === 'undefined') return null
  return window.tronLink ?? null
}

/** Get TronWeb instance — supports any wallet that injects window.tronWeb */
export function getTronWeb(): TronWeb | null {
  if (typeof window === 'undefined') return null
  const tronLink = getTronLink()
  if (tronLink?.ready && tronLink.tronWeb) return tronLink.tronWeb
  if (window.tronWeb) return window.tronWeb
  return null
}

/** Check if any Tron wallet is available (TronLink or any window.tronWeb injector) */
export function isTronWalletAvailable(): boolean {
  return getTronWeb() !== null
}

/** @deprecated use isTronWalletAvailable */
export const isTronLinkInstalled = isTronWalletAvailable

/**
 * Request wallet connection.
 * - If a TronLink-compatible wallet is present, uses tron_requestAccounts.
 * - Otherwise reads the already-injected tronWeb address directly.
 */
export async function connectWallet(): Promise<{
  address: string
  addressHex: string
}> {
  const tronLink = getTronLink()

  if (tronLink) {
    // TronLink-compatible: trigger the approval popup
    await tronLink.request({ method: 'tron_requestAccounts' })
  }

  const tronWeb = getTronWeb()
  if (!tronWeb?.defaultAddress?.base58) {
    throw new Error(
      'No Tron wallet found or wallet is locked. Please unlock your wallet.',
    )
  }

  return {
    address: tronWeb.defaultAddress.base58,
    addressHex: tronWeb.defaultAddress.hex,
  }
}

/** @deprecated use connectWallet */
export const connectTronLink = connectWallet

/** Normalize a signTypedData return value to a plain hex string. */
function extractSignature(raw: unknown): string {
  if (typeof raw === 'string') return raw
  if (raw && typeof raw === 'object') {
    // Some versions return { signature: '...' } or { result: true, signature: '...' }
    const obj = raw as Record<string, unknown>
    if (typeof obj.signature === 'string') return obj.signature
    if (typeof obj.result === 'string') return obj.result
  }
  throw new Error(
    `Unexpected signTypedData return value: ${JSON.stringify(raw)}`,
  )
}

/** Build EIP712Domain type fields from a domain object */
function buildEIP712DomainTypes(
  domain: TIP712Domain,
): { name: string; type: string }[] {
  const fields: { name: string; type: string }[] = []
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

/**
 * Sign TIP-712 typed data via TronLink.
 *
 * In browser context TronLink sets `defaultPrivateKey = false`, so calling
 * `trx.signTypedData` / `trx._signTypedData` directly falls through to the
 * npm-tronweb implementation which tries `false.replace(...)` → error.
 *
 * Fix: route through `tronLink.request()` which communicates with the
 * TronLink extension popup and never touches the local private key.
 */
export async function signTypedData(
  domain: TIP712Domain,
  types: Record<string, TIP712TypeField[]>,
  message: Record<string, unknown>,
  primaryType?: string,
): Promise<string> {
  const tronLink = getTronLink()
  const tronWeb = getTronWeb()
  if (!tronWeb) throw new Error('TronWeb not available')

  // ── Browser path: wallet has a request() API (TronLink-compatible) ──────
  if (tronLink) {
    const address = tronWeb.defaultAddress?.base58
    if (!address) throw new Error('No connected address')

    // Infer primaryType from types keys when not provided
    const resolvedPrimaryType =
      primaryType ??
      Object.keys(types).find((k) => k !== 'EIP712Domain') ??
      Object.keys(types)[0]

    const fullTypedData = {
      types: {
        EIP712Domain: buildEIP712DomainTypes(domain),
        ...types,
      },
      domain,
      primaryType: resolvedPrimaryType,
      message,
    }

    // eth_signTypedData_v4 routes through TronLink extension popup — no
    // private key needed on the DApp side (supported by TronLink ≥ 4.x)
    try {
      const result = await tronLink.request({
        method: 'eth_signTypedData_v4',
        params: [address, JSON.stringify(fullTypedData)],
      })
      return extractSignature(result)
    } catch (err) {
      // Fall through to trx-level methods if request rejected with
      // MethodNotFound rather than a user-rejection
      const msg = err instanceof Error ? err.message : ''
      if (
        msg.toLowerCase().includes('reject') ||
        msg.toLowerCase().includes('denied') ||
        msg.toLowerCase().includes('cancel')
      ) {
        throw err // user rejected — propagate immediately
      }
      // Method unsupported by this TronLink version → try trx methods
    }

    // Fallback: _signTypedData — TronLink 4.x intercepts this for popup
    if (typeof tronWeb.trx._signTypedData === 'function') {
      return extractSignature(
        await tronWeb.trx._signTypedData(domain, types, message),
      )
    }

    throw new Error(
      'Wallet does not support typed data signing on this version. Please update your wallet.',
    )
  }

  // ── Non-browser / standalone: sign with private key ─────────────────────
  if (typeof tronWeb.trx.signTypedData === 'function') {
    return extractSignature(
      await tronWeb.trx.signTypedData(domain, types, message),
    )
  }
  if (typeof tronWeb.trx._signTypedData === 'function') {
    return extractSignature(
      await tronWeb.trx._signTypedData(domain, types, message),
    )
  }

  throw new Error('signTypedData not supported by the current TronWeb version')
}

/** Get currently connected address */
export function getCurrentAddress(): string | null {
  const tronWeb = getTronWeb()
  return tronWeb?.defaultAddress?.base58 ?? null
}
