import { createContext, useContext, type ReactNode } from 'react'

type ThemeProviderProps = {
  children: ReactNode
  [key: string]: unknown
}

type ThemeProviderState = {
  theme: string
  setTheme: (_theme: string) => void
}

const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <ThemeProviderContext.Provider {...props} value={initialState}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  return useContext(ThemeProviderContext)
}
