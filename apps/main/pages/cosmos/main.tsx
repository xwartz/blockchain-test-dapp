import React from 'react'
import ReactDOM from 'react-dom/client'
import { ChainProvider } from '@cosmos-kit/react'
import { wallets as keplr } from '@cosmos-kit/keplr'
import { wallets as leap } from '@cosmos-kit/leap'
import { assets, chains } from 'chain-registry'

import App from './App.tsx'
import '@repo/ui/main.css'
import { Toaster } from '@ui/components/index.ts'
import { ThemeProvider } from '@/components/theme-provider'

import '@interchain-ui/react/styles'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <ChainProvider
        chains={chains}
        assetLists={assets}
        wallets={[...keplr, ...leap]}
        walletConnectOptions={{
          signClient: {
            projectId:
              '3ed8cc046c6211a798dc5ec70f1302b43e07db9639fd287de44a9aa115a21ed6',
            relayUrl: 'wss://relay.walletconnect.org',
            metadata: {
              name: 'Cosmos DApp',
              description: 'Blockchain Test DApp',
              url: 'https://blockchain-test-dapp.vercel.app/',
              icons: [
                'https://raw.githubusercontent.com/xwartz/blockchain-test-dapp/main/apps/main/public/logo.svg',
              ],
            },
          },
        }}
        logLevel={'DEBUG'}
      >
        <App />
      </ChainProvider>
    </ThemeProvider>
    <Toaster />
  </React.StrictMode>,
)
