import { ethers } from 'ethers'
import { ImTokenProvider, EthereumAccount, BitcoinAccount } from '@/types'

// Sepolia testnet configuration
const SEPOLIA_CHAIN_ID = '0xaa36a7' // 11155111 in hex
const SEPOLIA_RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com'

export class ImTokenWallet {
  private provider: ImTokenProvider | null = null

  constructor() {
    this.provider = this.getProvider()
  }

  // Get imToken provider
  private getProvider(): ImTokenProvider | null {
    if (typeof window === 'undefined') return null

    if (window.ethereum && window.bitcoin) {
      return window as unknown as ImTokenProvider
    }

    return null
  }

  // Check if imToken is installed
  isInstalled(): boolean {
    return this.provider !== null
  }

  // Connect to Ethereum Sepolia network
  async connectEthereum(): Promise<EthereumAccount> {
    if (!this.provider) {
      throw new Error('imToken not installed')
    }

    try {
      // Request connection
      const accounts = (await this.provider.ethereum?.request({
        method: 'eth_requestAccounts',
      })) as string[]

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned')
      }

      // Get current chain ID
      const chainId = (await this.provider.ethereum?.request({
        method: 'eth_chainId',
      })) as string

      // Check if on Sepolia network
      if (chainId !== SEPOLIA_CHAIN_ID) {
        // Try to switch to Sepolia network
        try {
          await this.provider.ethereum?.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: SEPOLIA_CHAIN_ID }],
          })
        } catch (switchError) {
          // If network doesn't exist, try to add it
          await this.provider.ethereum?.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: SEPOLIA_CHAIN_ID,
                chainName: 'Sepolia Test Network',
                nativeCurrency: {
                  name: 'SepoliaETH',
                  symbol: 'SEP',
                  decimals: 18,
                },
                rpcUrls: [SEPOLIA_RPC_URL],
                blockExplorerUrls: ['https://sepolia.etherscan.io/'],
              },
            ],
          })
        }
      }

      return {
        address: accounts[0],
        chainId: parseInt(SEPOLIA_CHAIN_ID, 16),
        network: 'sepolia',
      }
    } catch (error) {
      console.error('Connect Ethereum error:', error)
      throw error
    }
  }

  // Connect to Bitcoin Signet network
  async connectBitcoin(): Promise<BitcoinAccount> {
    if (!this.provider?.bitcoin) {
      throw new Error('imToken Bitcoin not available')
    }

    try {
      const accounts = await this.provider.bitcoin.request({
        method: 'btc_requestAccounts',
      })

      const address = (accounts as string[])[0]
      const publicKeyHex = (await this.provider.bitcoin.request({
        method: 'btc_getPublicKey',
      })) as string

      return {
        address,
        publicKey: publicKeyHex,
        network: 'signet',
      }
    } catch (error) {
      console.error('Connect Bitcoin error:', error)
      throw error
    }
  }

  // Check if currently on the correct Ethereum account
  async checkEthereumAccount(expectedAddress: string): Promise<boolean> {
    if (!this.provider) {
      throw new Error('imToken not connected')
    }

    try {
      const accounts = (await this.provider.ethereum?.request({
        method: 'eth_accounts',
      })) as string[]

      return (
        accounts.length > 0 &&
        accounts[0].toLowerCase() === expectedAddress.toLowerCase()
      )
    } catch (error) {
      console.error('Check Ethereum account error:', error)
      return false
    }
  }

  // Ensure on correct Ethereum account
  async ensureEthereumAccount(expectedAddress: string): Promise<void> {
    if (!this.provider) {
      throw new Error('imToken not connected')
    }

    const isCorrectAccount = await this.checkEthereumAccount(expectedAddress)

    if (!isCorrectAccount) {
      // Try to reconnect to Ethereum account
      try {
        const accounts = (await this.provider.ethereum?.request({
          method: 'eth_requestAccounts',
        })) as string[]

        if (!accounts || accounts.length === 0) {
          throw new Error('No Ethereum accounts available')
        }

        const currentAccount = accounts[0].toLowerCase()
        if (currentAccount !== expectedAddress.toLowerCase()) {
          console.log(
            `Account mismatch. Expected: ${expectedAddress}, Current: ${accounts[0]}. Please switch to the correct Ethereum account in imToken.`,
          )
        }
      } catch (error) {
        throw new Error(
          `Please ensure you are on the correct Ethereum account (${expectedAddress}) in imToken wallet.`,
        )
      }
    }

    // Ensure on Sepolia network
    const chainId = (await this.provider.ethereum?.request({
      method: 'eth_chainId',
    })) as string

    if (chainId !== SEPOLIA_CHAIN_ID) {
      try {
        await this.provider.ethereum?.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: SEPOLIA_CHAIN_ID }],
        })
      } catch (switchError) {
        throw new Error('Please switch to Sepolia network in imToken wallet.')
      }
    }
  }

  // Sign Ethereum message
  async signEthereumMessage(message: string, address: string): Promise<string> {
    if (!this.provider) {
      throw new Error('imToken not connected')
    }

    // Ensure on correct account and network
    await this.ensureEthereumAccount(address)

    try {
      const signature = (await this.provider.ethereum?.request({
        method: 'personal_sign',
        params: [ethers.hexlify(ethers.toUtf8Bytes(message)), address],
      })) as string

      return signature
    } catch (error) {
      console.error('Sign Ethereum message error:', error)
      throw error
    }
  }

  // Send Ethereum transaction
  async sendEthereumTransaction(
    to: string,
    value: string,
    from: string,
  ): Promise<string> {
    if (!this.provider) {
      throw new Error('imToken not connected')
    }

    // Ensure on correct account and network
    await this.ensureEthereumAccount(from)

    try {
      const txHash = (await this.provider.ethereum?.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from,
            to,
            value: ethers.parseEther(value).toString(),
            gas: '21000', // 21000 gas for simple transfer
          },
        ],
      })) as string

      return txHash
    } catch (error) {
      console.error('Send Ethereum transaction error:', error)
      throw error
    }
  }

  // Get Ethereum balance
  async getEthereumBalance(address: string): Promise<string> {
    if (!this.provider) {
      throw new Error('imToken not connected')
    }

    try {
      const balance = (await this.provider.ethereum?.request({
        method: 'eth_getBalance',
        params: [address, 'latest'],
      })) as string

      return ethers.formatEther(balance)
    } catch (error) {
      console.error('Get Ethereum balance error:', error)
      throw error
    }
  }

  // Sign Bitcoin message
  async signBitcoinMessage(message: string): Promise<string> {
    if (!this.provider?.bitcoin) {
      throw new Error('imToken Bitcoin not available')
    }

    try {
      const signature = (await this.provider.bitcoin.request({
        method: 'bitcoin_signMessage',
        params: [message],
      })) as string
      return signature
    } catch (error) {
      console.error('Sign Bitcoin message error:', error)
      throw error
    }
  }

  // Listen for account changes
  // Note: imToken does not support this event
  onAccountsChanged(callback: (accounts: string[]) => void): void {
    if (!this.provider) return

    // Standard ethereum provider events
    if ('on' in this.provider) {
      this.provider.ImTokenEventEmitter.on('accountsChanged', callback)
    }
  }

  // Listen for chain changes
  // Note: imToken does not support this event
  onChainChanged(callback: (chainId: string) => void): void {
    if (!this.provider) return

    // Standard ethereum provider events
    if ('on' in this.provider) {
      this.provider.ImTokenEventEmitter.on('chainChanged', callback)
    }
  }

  // Disconnect
  disconnect(): void {
    // imToken usually doesn't need explicit disconnection
    // But we can clear local state
    this.provider = null
  }
}
