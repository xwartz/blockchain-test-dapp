import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light' | 'system'

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

function getThemeFromUrl(): Theme | null {
  if (typeof window === 'undefined') return null

  const urlParams = new URLSearchParams(window.location.search)
  const themeParam = urlParams.get('theme') as Theme

  if (themeParam && ['dark', 'light', 'system'].includes(themeParam)) {
    return themeParam
  }

  return null
}

function getStoredTheme(storageKey: string): Theme | null {
  if (typeof window === 'undefined') return null

  try {
    return localStorage.getItem(storageKey) as Theme
  } catch {
    return null
  }
}

function applyTheme(theme: Theme) {
  const root = window.document.documentElement

  root.classList.remove('light', 'dark')

  if (theme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
      .matches
      ? 'dark'
      : 'light'

    root.classList.add(systemTheme)
    return
  }

  root.classList.add(theme)
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'vite-ui-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    // 优先级：URL 参数 > localStorage > 默认主题
    return getThemeFromUrl() || getStoredTheme(storageKey) || defaultTheme
  })

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // 监听其他窗口的主题变化
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        const newTheme = e.newValue as Theme
        if (['dark', 'light', 'system'].includes(newTheme)) {
          setTheme(newTheme)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [storageKey])

  // 监听系统主题变化
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      localStorage.setItem(storageKey, newTheme)
      setTheme(newTheme)

      // 广播给同源的其他窗口
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: storageKey,
          newValue: newTheme,
          oldValue: theme,
        }),
      )
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider')

  return context
}
