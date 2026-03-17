// TronLink / TronWeb type declarations

export interface TronWeb {
  trx: {
    signTypedData(
      domain: TIP712Domain,
      types: Record<string, TIP712TypeField[]>,
      message: Record<string, unknown>,
      privateKey?: string,
    ): Promise<string>
    _signTypedData(
      domain: TIP712Domain,
      types: Record<string, TIP712TypeField[]>,
      message: Record<string, unknown>,
      privateKey?: string,
    ): Promise<string>
    getAccount(address: string): Promise<{ address?: string }>
  }
  defaultAddress: {
    base58: string
    hex: string
  }
  address: {
    fromHex(hex: string): string
    toHex(base58: string): string
  }
  isAddress(address: string): boolean
}

export interface TronLink {
  ready: boolean
  tronWeb: TronWeb
  request(args: { method: string; params?: unknown }): Promise<unknown>
}

export interface TIP712Domain {
  name?: string
  version?: string
  chainId?: string | number
  verifyingContract?: string
  salt?: string
}

export interface TIP712TypeField {
  name: string
  type: string
}

export interface TIP712Payload {
  domain: TIP712Domain
  types: Record<string, TIP712TypeField[]>
  primaryType: string
  message: Record<string, unknown>
}

export interface SignatureResult {
  signature: string
  r: string
  s: string
  v: number
  recoveredAddress?: string
}

// TRON chain configurations
export const TRON_CHAINS = {
  mainnet: {
    name: 'TRON Mainnet',
    chainId: 0x2b6653dc,
    chainIdHex: '0x2b6653dc',
    fullNodeHost: 'https://api.trongrid.io',
  },
  nile: {
    name: 'Nile Testnet',
    chainId: 0xcd8690dc,
    chainIdHex: '0xcd8690dc',
    fullNodeHost: 'https://nile.trongrid.io',
  },
  shasta: {
    name: 'Shasta Testnet',
    chainId: 0x94a9059e,
    chainIdHex: '0x94a9059e',
    fullNodeHost: 'https://api.shasta.trongrid.io',
  },
} as const

export type TronChainId = 'mainnet' | 'nile' | 'shasta'

// GasFree configurations per network
export const GASFREE_CONFIG = {
  mainnet: {
    controllerAddress: 'TFFAMQLZybALaLb4uxHA9RBE7pxhUAjF3U',
    domainName: 'GasFreeController',
    domainVersion: 'V1.0.0',
  },
  nile: {
    controllerAddress: 'THQGuFzL87ZqhxkgqYEryRAd7gqFqL5rdc',
    domainName: 'GasFreeController',
    domainVersion: 'V1.0.0',
  },
} as const

// Well-known TRON tokens
export const TRON_TOKENS = {
  USDT: {
    address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    symbol: 'USDT',
    decimals: 6,
  },
  USDC: {
    address: 'TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8',
    symbol: 'USDC',
    decimals: 6,
  },
} as const

// Preset TIP-712 templates
export const TIP712_PRESETS = {
  gasfreePermitTransfer: {
    label: 'GasFree PermitTransfer',
    payload: {
      domain: {
        name: 'GasFreeController',
        version: 'V1.0.0',
        chainId: '0x2b6653dc',
        verifyingContract: 'TFFAMQLZybALaLb4uxHA9RBE7pxhUAjF3U',
      },
      types: {
        PermitTransfer: [
          { name: 'token', type: 'address' },
          { name: 'serviceProvider', type: 'address' },
          { name: 'user', type: 'address' },
          { name: 'receiver', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'maxFee', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
          { name: 'version', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
        ],
      },
      primaryType: 'PermitTransfer',
      message: {
        token: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        serviceProvider: 'TGzz8gjYiYRqpfmDwnLxfgPuLVNmpCswVp',
        user: '',
        receiver: '',
        value: '1000000',
        maxFee: '200000',
        deadline: '',
        version: '1',
        nonce: '0',
      },
    },
  },
  permit2TransferFrom: {
    label: 'Permit2 TransferFrom',
    payload: {
      domain: {
        name: 'Permit2',
        chainId: '0x2b6653dc',
        verifyingContract: 'TJhMXTHQHeQyMD7TcKQFqAePNgG4b31H9m',
      },
      types: {
        PermitTransferFrom: [
          { name: 'permitted', type: 'TokenPermissions' },
          { name: 'spender', type: 'address' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
        TokenPermissions: [
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' },
        ],
      },
      primaryType: 'PermitTransferFrom',
      message: {
        permitted: {
          token: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
          amount: '1000000',
        },
        spender: '',
        nonce: '0',
        deadline: '',
      },
    },
  },
  trc20Permit: {
    label: 'TRC-20 Permit',
    payload: {
      domain: {
        name: 'MyToken',
        version: '1',
        chainId: '0x2b6653dc',
        verifyingContract: '',
      },
      types: {
        Permit: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
      },
      primaryType: 'Permit',
      message: {
        owner: '',
        spender: '',
        value: '1000000000',
        nonce: '0',
        deadline: '',
      },
    },
  },
  customMail: {
    label: 'Mail (Custom Example)',
    payload: {
      domain: {
        name: 'TRON Mail',
        version: '1',
        chainId: '0x2b6653dc',
        verifyingContract: 'TUe6BwpA7sVTDKaJQoia7FWZpC9sK8WM2t',
      },
      types: {
        Person: [
          { name: 'name', type: 'string' },
          { name: 'wallet', type: 'address' },
        ],
        Mail: [
          { name: 'from', type: 'Person' },
          { name: 'to', type: 'Person' },
          { name: 'contents', type: 'string' },
        ],
      },
      primaryType: 'Mail',
      message: {
        from: { name: 'Alice', wallet: '' },
        to: { name: 'Bob', wallet: '' },
        contents: 'Hello, Bob!',
      },
    },
  },
} as const

declare global {
  interface Window {
    tronLink?: TronLink
    tronWeb?: TronWeb
  }
}
