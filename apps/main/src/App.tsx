import { ThemeProvider, Separator } from '@ui/components'

// 环境配置
const isDev = import.meta.env.DEV
const getAppUrl = (appName: string, port?: number) => {
  if (isDev) {
    return `http://localhost:${port}`
  }
  const envBaseUrl =
    import.meta.env.VITE_BASE_URL || 'https://blockchain-test-dapp'
  return `${envBaseUrl}-${appName}.vercel.app`
}

function AppContent() {
  const appLinks = [
    {
      name: 'BIP-322',
      description: 'Bitcoin message signing and verification',
      url: getAppUrl('bip322', 3001),
      icon: '₿',
    },
    {
      name: 'BIP-370',
      description: 'PSBT creation and manipulation',
      url: getAppUrl('bip370', 3002),
      icon: '₿',
    },
    {
      name: 'Cosmos',
      description: 'Cosmos blockchain wallet integration',
      url: getAppUrl('cosmos', 3003),
      icon: '🌌',
    },
    {
      name: 'TON',
      description: 'TON blockchain wallet and TonConnect bridge',
      url: getAppUrl('ton', 3004),
      icon: '💎',
    },
    {
      name: 'imToken',
      description: 'imToken wallet integration with Ethereum & Bitcoin',
      url: getAppUrl('imtoken', 3005),
      icon: '🔑',
    },
    {
      name: 'TIP-712',
      description: 'TIP-712 payload signing and verification',
      url: getAppUrl('tip712', 3006),
      icon: 'T',
    },
    {
      name: 'TRON',
      description: 'TRON contract signing preview lab',
      url: getAppUrl('tron', 3007),
      icon: 'T',
    },
  ]

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <div className="mb-5 flex flex-col items-center">
        <h2 className="text-lg font-semibold mt-4">Blockchain Test DApp</h2>
        <a
          href="https://github.com/xwartz"
          target="_blank"
          rel="noopener noreferrer"
        >
          By @xwartz
        </a>
      </div>

      <Separator className="max-w-2xl w-full" />

      <div className="mt-5 w-full max-w-2xl">
        <h4 className="font-semibold mb-4">Test DApps:</h4>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {appLinks.map((app) => (
            <a
              key={app.name}
              href={app.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group p-4 rounded-lg border border-border bg-card hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{app.icon}</span>
                <h5 className="font-semibold group-hover:text-accent-foreground">
                  {app.name}
                </h5>
              </div>
              <p className="text-sm text-muted-foreground">{app.description}</p>
              <p className="text-xs text-muted-foreground mt-2 opacity-70">
                {isDev
                  ? `Port ${app.url.split(':')[2]?.split('?')[0]}`
                  : 'Deployed on Vercel'}
              </p>
            </a>
          ))}
        </div>
      </div>

      <div className="mt-8 p-4 bg-muted rounded-lg w-full max-w-2xl">
        <h5 className="font-semibold mb-2">
          {isDev ? 'Development Mode' : 'Production Mode'}
        </h5>
        {isDev ? (
          <>
            <p className="text-sm text-muted-foreground mb-2">
              Each DApp runs as an independent application. Start them
              individually:
            </p>
            <div className="text-xs font-mono bg-background p-2 rounded space-y-1">
              <div>pnpm dev:bip322 # Port 3001</div>
              <div>pnpm dev:bip370 # Port 3002</div>
              <div>pnpm dev:cosmos # Port 3003</div>
              <div>pnpm dev:ton # Port 3004</div>
              <div>pnpm dev:imtoken # Port 3005</div>
              <div>pnpm dev:tip712 # Port 3006</div>
              <div>pnpm dev:tron # Port 3007</div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              💡 Each DApp runs independently in its own window
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-2">
              Each DApp is deployed independently on Vercel for better
              performance and isolation.
            </p>
            <p className="text-xs text-muted-foreground">
              Environment: {import.meta.env.MODE}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}

export default App
