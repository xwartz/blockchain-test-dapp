import { ThemeProvider } from './components/theme-provider'
import { ModeToggle } from './components/mode-toggle'
import { Separator } from '@ui/components'

// 环境配置
const isDev = import.meta.env.DEV
const getAppUrl = (appName: string, port?: number) => {
  if (isDev) {
    // 开发环境使用 localhost
    return `http://localhost:${port}`
  } else {
    // 生产环境使用环境变量或默认的 Vercel 部署 URL
    const baseUrl = import.meta.env.VITE_BASE_URL || 'https://blockchain-test-dapp'
    return `${baseUrl}-${appName}.vercel.app`
  }
}

function App() {
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
  ]

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="flex min-h-screen flex-col items-center justify-center">
        <ModeToggle />
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

        <Separator />

        <div className="mt-5 max-w-2xl">
          <h4 className="font-semibold mb-4">Test DApps:</h4>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                <p className="text-sm text-muted-foreground">
                  {app.description}
                </p>
                <p className="text-xs text-muted-foreground mt-2 opacity-70">
                  {isDev
                    ? `Port ${app.url.split(':').pop()}`
                    : 'Deployed on Vercel'}
                </p>
              </a>
            ))}
          </div>
        </div>

        <div className="mt-8 p-4 bg-muted rounded-lg max-w-2xl">
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
              </div>
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
    </ThemeProvider>
  )
}

export default App
