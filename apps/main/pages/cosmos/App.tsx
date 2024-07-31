import { useReducer } from 'react'
import { ThemeProvider } from '@/components/theme-provider'
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing'
import { chains } from 'chain-registry'
import { stringToPath } from '@cosmjs/crypto'
import { Separator, useToast } from '@ui/components'
import { pubkeyToAddress } from '@cosmjs/amino'
import { toBase64 } from '@cosmjs/encoding'
import { getHDPath } from '@/utils/cosmos/path'
import { genMsgSend, makeSignMessage } from '@/utils/cosmos/sign'
import { ApiClient } from '@/utils/cosmos/api'
import { calculateFee } from '@cosmjs/stargate'
import { initialState, reducer } from './state'
import { Header } from './components/Header'
import { WalletInfo } from './components/WalletInfo'
import { Mnemonic } from './components/Mnemonic'
import { SignTx } from './components/SignTx'

const initApi = () => {
  let client: ApiClient | null = null
  return {
    getClient: async (chain: (typeof chains)[number]) => {
      if (!client) {
        const endpoint = chain.apis?.rpc
        if (!endpoint) {
          throw new Error('No RPC endpoint found')
        }
        client = await ApiClient.getClient(endpoint)
      }
      return client
    },
  }
}

const api = initApi()

export default function App() {
  const { toast } = useToast()
  const [state, dispatch] = useReducer(reducer, initialState)

  const generateMnemonic = async () => {
    const wallet = await DirectSecp256k1HdWallet.generate(12)
    dispatch({ type: 'SET_MNEMONIC', payload: wallet.mnemonic })
  }

  const generateAddress = async () => {
    try {
      if (!state.mnemonic || !state.selectedChain) return

      const chain = chains.find((c) => c.chain_name === state.selectedChain)
      if (!chain) return

      console.log('chain', chain)

      const wallet = await DirectSecp256k1HdWallet.fromMnemonic(
        state.mnemonic,
        {
          prefix: chain.bech32_prefix,
          hdPaths: [stringToPath(getHDPath(`${chain.slip44}`))],
        },
      )

      const [{ pubkey, address }] = await wallet.getAccounts()
      const publicKey = Buffer.from(pubkey).toString('hex')
      dispatch({
        type: 'SET_PUBLIC_KEY',
        payload: publicKey,
      })
      dispatch({ type: 'SET_ADDRESS', payload: address })
      const pubkeyAddress = pubkeyToAddress(
        {
          type: 'tendermint/PubKeySecp256k1',
          value: toBase64(Buffer.from(publicKey, 'hex')),
        },
        chain.bech32_prefix,
      )
      console.log('pubkeyAddress', pubkeyAddress)

      const client = await api.getClient(chain)
      const status = await client.status()
      console.log('status', status)
      dispatch({
        type: 'SET_NODE_INFO',
        payload: {
          channels: status.nodeInfo.channels,
          network: status.nodeInfo.network,
          version: status.nodeInfo.version,
        },
      })
      const account = await client.getAccountInfo(address)
      console.log('account', account)
      dispatch({
        type: 'SET_ACCOUNT_NUMBER',
        payload: account.accountNumber,
      })
      dispatch({ type: 'SET_SEQUENCE', payload: account.sequence })
      const balances = await client.getAccountBalance(address)
      console.log('balances', balances)
      dispatch({
        type: 'SET_BALANCES',
        payload: balances,
      })
    } catch (error) {
      toast({
        title: 'generateAddress error',
        description: `${error}`,
        variant: 'destructive',
      })
    }
  }

  const onSignTx = async () => {
    try {
      const chain = chains.find((c) => c.chain_name === state.selectedChain)
      if (!chain) return

      const msg = genMsgSend(
        state.address,
        state.recipient,
        state.amount,
        state.denom,
      )

      const client = await api.getClient(chain)
      const { gasPrice, denom } = client.getGasPrice(chain.fees, state.denom)
      const gas = await client.estimateGas(
        msg,
        state.memo,
        state.publicKey,
        state.sequence,
      )
      const fee = calculateFee(
        Number(gas.gasInfo?.gasWanted ?? 0),
        `${gasPrice}${denom}`,
      )
      const unSignedTx = makeSignMessage({
        chainId: chain.chain_id,
        accountNumber: 0,
        sequence: 0,
        fee,
        memo: state.memo,
        msgs: [msg],
        pubKey: state.publicKey,
      })
      dispatch({ type: 'SET_UNSIGNED_TX', payload: unSignedTx })
    } catch (error) {
      toast({
        title: 'onSignTx error',
        description: `${error}`,
        variant: 'destructive',
      })
    }
  }

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Header />
      <Separator />
      <Mnemonic
        mnemonic={state.mnemonic}
        selectedChain={state.selectedChain}
        generateMnemonic={generateMnemonic}
        generateAddress={generateAddress}
        onMnemonicChange={(e) =>
          dispatch({ type: 'SET_MNEMONIC', payload: e.target.value })
        }
        onSelectChange={(value) =>
          dispatch({ type: 'SET_SELECTED_CHAIN', payload: value })
        }
      />
      <WalletInfo
        selectedChain={state.selectedChain}
        address={state.address}
        publicKey={state.publicKey}
        accountNumber={state.accountNumber}
        sequence={state.sequence}
        balances={state.balances}
      />
      <Separator />
      <SignTx
        selectedChain={state.selectedChain}
        unSignedTx={state.unSignedTx}
        onRecipientChange={(e) =>
          dispatch({ type: 'SET_RECIPIENT', payload: e.target.value })
        }
        onAmountChange={(e) =>
          dispatch({ type: 'SET_AMOUNT', payload: e.target.value })
        }
        onMemoChange={(e) =>
          dispatch({ type: 'SET_MEMO', payload: e.target.value })
        }
        onDenomChange={(e) =>
          dispatch({ type: 'SET_DENOM', payload: e.target.value })
        }
        onSignTx={onSignTx}
      />
      <Separator />
    </ThemeProvider>
  )
}

