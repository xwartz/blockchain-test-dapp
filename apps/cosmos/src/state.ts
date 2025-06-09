import { Coin } from '@cosmjs/amino'

export type State = {
  connected: boolean
  nodeInfo: {
    channels: string
    network: string
    version: string
  }
  address: string
  publicKey: string
  accountNumber: number
  sequence: number
  balances: Coin[]
  signature: string
  mnemonic: string
  selectedChainName: string
  recipient: string
  amount: string
  denom: string
  memo: string
  unSignedTx: string
}

export type Action =
  | { type: 'CONNECT'; payload: Partial<State> }
  | { type: 'DISCONNECT' }
  | { type: 'SET_NODE_INFO'; payload: Partial<State['nodeInfo']> }
  | { type: 'SET_ACCOUNT_NUMBER'; payload: number }
  | { type: 'SET_SEQUENCE'; payload: number }
  | { type: 'SET_MNEMONIC'; payload: string }
  | { type: 'SET_SELECTED_CHAIN'; payload: string }
  | { type: 'SET_ADDRESS'; payload: string }
  | { type: 'SET_PUBLIC_KEY'; payload: string }
  | { type: 'SET_BALANCES'; payload: Coin[] }
  | { type: 'SET_RECIPIENT'; payload: string }
  | { type: 'SET_AMOUNT'; payload: string }
  | { type: 'SET_DENOM'; payload: string }
  | { type: 'SET_MEMO'; payload: string }
  | { type: 'SET_UNSIGNED_TX'; payload: string }
  | { type: 'SET_SIGNATURE'; payload: string }

export const initialState: State = {
  connected: false,
  nodeInfo: {
    channels: '',
    network: '',
    version: '',
  },
  accountNumber: 0,
  sequence: 0,
  balances: [],
  address: '',
  publicKey: '',
  signature: '',
  mnemonic: '',
  selectedChainName: '',
  recipient: '',
  amount: '0',
  denom: '',
  memo: '',
  unSignedTx: '',
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'CONNECT':
      return { ...state, connected: true, ...action.payload }
    case 'DISCONNECT':
      return { ...initialState }
    case 'SET_MNEMONIC':
      return { ...state, mnemonic: action.payload }
    case 'SET_SELECTED_CHAIN':
      return { ...state, selectedChainName: action.payload }
    case 'SET_PUBLIC_KEY':
      return { ...state, publicKey: action.payload }
    case 'SET_ADDRESS':
      return { ...state, address: action.payload }
    case 'SET_SIGNATURE':
      return { ...state, signature: action.payload }
    case 'SET_RECIPIENT':
      return { ...state, recipient: action.payload }
    case 'SET_AMOUNT':
      return { ...state, amount: action.payload }
    case 'SET_DENOM':
      return { ...state, denom: action.payload }
    case 'SET_MEMO':
      return { ...state, memo: action.payload }
    case 'SET_UNSIGNED_TX':
      return { ...state, unSignedTx: action.payload }
    case 'SET_ACCOUNT_NUMBER':
      return { ...state, accountNumber: action.payload }
    case 'SET_SEQUENCE':
      return { ...state, sequence: action.payload }
    case 'SET_BALANCES':
      return { ...state, balances: action.payload }
    default:
      return state
  }
}
