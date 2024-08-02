import { useCallback, useEffect, useMemo, useReducer } from 'react'
import { DirectSecp256k1HdWallet, coins } from '@cosmjs/proto-signing'
import { chains } from 'chain-registry'
import { stringToPath } from '@cosmjs/crypto'
import { Button, Separator, useToast } from '@ui/components'
import { pubkeyToAddress } from '@cosmjs/amino'
import { toBase64 } from '@cosmjs/encoding'
import { calculateFee } from '@cosmjs/stargate'
import { useChain } from '@cosmos-kit/react'
import { Cable, Unplug } from 'lucide-react'

import { getHDPath } from '@/utils/cosmos/path'
import {
  genMsgExecuteContractTransfer,
  genMsgSend,
  genMsgTransfer,
  makeSignMessage,
} from '@/utils/cosmos/sign'
import { ApiClient } from '@/utils/cosmos/api'
import { initialState, reducer } from './state'
import { Header } from './components/Header'
import { WalletInfo } from './components/WalletInfo'
import { Mnemonic } from './components/Mnemonic'
import { SignTx } from './components/SignTx'
import { getChainFromAddress, isIBCTransfer } from '@/utils/cosmos/ibc'

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
    clearClient: () => {
      client = null
    },
  }
}

const api = initApi()

export default function App() {
  const { toast } = useToast()
  const [state, dispatch] = useReducer(reducer, initialState)

  const chainContext = useChain(state.selectedChainName || 'cosmoshub')

  const chain = useMemo(() => {
    return chains.find((c) => c.chain_name === state.selectedChainName)
  }, [state.selectedChainName])

  const updateBalances = useCallback(
    async (address: string) => {
      if (!address) return

      if (!chain) return

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
    },
    [chain],
  )

  useEffect(() => {
    const updateWalletInfo = async () => {
      const account = await chainContext.getAccount()
      const publicKey = Buffer.from(account.pubkey).toString('hex')
      dispatch({
        type: 'SET_PUBLIC_KEY',
        payload: publicKey,
      })
      dispatch({
        type: 'CONNECT',
        payload: {
          selectedChainName: chainContext.chain.chain_name,
          address: account.address,
        },
      })
    }

    if (chainContext.status === 'Connected') {
      updateWalletInfo()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainContext.status, updateBalances])

  const generateMnemonic = async () => {
    const wallet = await DirectSecp256k1HdWallet.generate(12)
    dispatch({ type: 'SET_MNEMONIC', payload: wallet.mnemonic })
  }

  const generateAddress = async () => {
    try {
      if (!state.mnemonic || !state.selectedChainName) return

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
      await updateBalances(address)
    } catch (error) {
      toast({
        title: 'generateAddress error',
        description: `${error}`,
        variant: 'destructive',
      })
    }
  }

  const onConnect = async () => {
    await chainContext.connect()
  }

  const onDisconnect = async () => {
    if (chainContext.status === 'Connected') {
      await chainContext.disconnect()
    }
    dispatch({ type: 'DISCONNECT' })
  }

  const onSignTx = async () => {
    try {
      if (!chain) return

      const client = await api.getClient(chain)

      const isIBCTx = isIBCTransfer(state.address, state.recipient)

      const isCW20 = state.denom.startsWith('cw20')

      const genMsg = async () => {
        if (isIBCTx) {
          toast({
            title: 'IBC transfer',
          })
          const recipientChain = getChainFromAddress(state.recipient)
          if (!recipientChain) {
            throw new Error("Recipient address doesn't belong to any chain")
          }
          const recipientChainId = recipientChain.chain_id
          const sourceChainId = chain.chain_id
          const sourceChannelId = await client.getSourceChannelId(
            sourceChainId,
            recipientChainId,
          )
          return genMsgTransfer({
            sourcePort: 'transfer',
            sourceChannel: sourceChannelId,
            sender: state.address,
            receiver: state.recipient,
            token: {
              denom: state.denom,
              amount: state.amount,
            },
            memo: state.memo,
            timeoutTimestamp: BigInt(
              (Math.floor(Date.now() / 1000) + 120) * 1_000_000_000,
            ),
          })
        }
        if (isCW20) {
          toast({
            title: 'cw20 transfer',
          })
          return genMsgExecuteContractTransfer({
            sender: state.address,
            contract: state.denom.replace('cw20:', ''),
            recipient: state.recipient,
            amount: state.amount,
          })
        }
        return genMsgSend({
          fromAddress: state.address,
          toAddress: state.recipient,
          amount: coins(state.amount, state.denom),
        })
      }

      const msg = await genMsg()
      console.log('msg', msg)
      const { gasPrice, denom } = client.getGasPrice(chain.fees)
      const { gasInfo } = await client.estimateGas(
        msg,
        state.memo,
        state.publicKey,
        state.sequence,
      )
      const gasLimit = Number(gasInfo?.gasUsed ?? 0) * 1.5
      const fee = calculateFee(gasLimit, `${gasPrice}${denom}`)
      console.log('fee', fee)
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
    <div className="mt-4 grid w-full gap-2 grid w-full max-w-5xl mx-auto">
      <Header />
      <Separator />
      <Mnemonic
        mnemonic={state.mnemonic}
        selectedChainName={state.selectedChainName}
        generateMnemonic={generateMnemonic}
        generateAddress={generateAddress}
        onMnemonicChange={(e) =>
          dispatch({ type: 'SET_MNEMONIC', payload: e.target.value })
        }
        onSelectChange={(value) => {
          api.clearClient()
          dispatch({ type: 'SET_SELECTED_CHAIN', payload: value })
        }}
      />
      <Separator />
      <div className="p-5 text-center">
        <ConnectButton
          connected={state.connected}
          onConnect={onConnect}
          onDisconnect={onDisconnect}
        />
      </div>
      <Separator />
      <WalletInfo
        selectedChainName={state.selectedChainName}
        address={state.address}
        publicKey={state.publicKey}
        accountNumber={state.accountNumber}
        sequence={state.sequence}
        balances={state.balances}
      />
      <Separator />
      <SignTx
        selectedChainName={state.selectedChainName}
        unSignedTx={state.unSignedTx}
        onRecipientChange={(e) => {
          dispatch({ type: 'SET_RECIPIENT', payload: e.target.value })
        }}
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
    </div>
  )
}

function ConnectButton({
  connected,
  onConnect,
  onDisconnect,
}: {
  connected: boolean
  onConnect: () => void
  onDisconnect: () => void
}) {
  if (!connected) {
    return (
      <Button onClick={onConnect}>
        <Cable className="mr-2 h-4 w-4" /> Connect Wallet
      </Button>
    )
  }
  return (
    <Button variant="destructive" onClick={onDisconnect}>
      <Unplug className="mr-2 h-4 w-4" /> Disconnect Wallet
    </Button>
  )
}
