import { Provider } from 'jotai'
import { ThemeProvider, ModeToggle, Separator } from '@ui/components'
import { Header } from '@/components/Header'
import { WalletConnect } from '@/components/WalletConnect'
import { WalletInfo } from '@/components/WalletInfo'
import { PayloadEditor } from '@/components/PayloadEditor'
import { HashDetails } from '@/components/HashDetails'
import { SignaturePanel } from '@/components/SignaturePanel'
import { GasFreePanel } from '@/components/GasFreePanel'
import { useActiveTab, useIsConnected } from '@/store/hooks'

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      }`}
    >
      {children}
    </button>
  )
}

function AppContent() {
  const [activeTab, setActiveTab] = useActiveTab()
  const isConnected = useIsConnected()

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Header />
          <ModeToggle />
        </div>

        <div className="space-y-6">
          {/* Wallet Connection */}
          <WalletConnect />

          {/* Wallet Info */}
          {isConnected && <WalletInfo />}

          <Separator />

          {/* Tab Navigation */}
          <div className="flex gap-2 p-1 bg-muted/50 rounded-lg w-fit">
            <TabButton
              active={activeTab === 'sign'}
              onClick={() => setActiveTab('sign')}
            >
              TIP-712 Signing
            </TabButton>
            <TabButton
              active={activeTab === 'gasfree'}
              onClick={() => setActiveTab('gasfree')}
            >
              GasFree
            </TabButton>
          </div>

          {/* Tab Content */}
          {activeTab === 'sign' && (
            <div className="space-y-4">
              <PayloadEditor />
              <HashDetails />
              <SignaturePanel />
            </div>
          )}

          {activeTab === 'gasfree' && (
            <div className="space-y-4">
              <GasFreePanel />
              <HashDetails />
              <SignaturePanel />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <Provider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </Provider>
  )
}

export default App
