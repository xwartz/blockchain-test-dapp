# Cross-App Theme Synchronization

## Problem Description

After splitting a single application into multiple independent applications, each application has its own runtime environment and cannot directly share theme state. When users switch themes in one application, other applications cannot automatically synchronize theme changes.

## Solution

We implemented a cross-app theme synchronization mechanism with the following features:

### 1. Shared Theme Components

- **Location**: `packages/ui/src/components/theme-provider.tsx`
- **Functionality**: Unified theme management logic with cross-window synchronization support
- **Features**:
  - URL parameter theme passing
  - localStorage storage
  - Real-time cross-window synchronization
  - System theme monitoring

### 2. Theme Synchronization Mechanisms

#### URL Parameter Passing
```typescript
// Main app carries current theme when navigating
const getAppUrl = (appName: string, port?: number, theme?: string) => {
  // ... Base URL construction

  // Add theme parameter
  if (theme && theme !== 'system') {
    const separator = baseUrl.includes('?') ? '&' : '?'
    baseUrl += `${separator}theme=${theme}`
  }

  return baseUrl
}
```

#### Cross-Window Listening
```typescript
// Listen for theme changes from other windows
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
```

#### Theme Broadcasting
```typescript
const setTheme = (newTheme: Theme) => {
  localStorage.setItem(storageKey, newTheme)
  setTheme(newTheme)

  // Broadcast to other windows with same origin
  window.dispatchEvent(
    new StorageEvent('storage', {
      key: storageKey,
      newValue: newTheme,
      oldValue: theme,
    })
  )
}
```

### 3. Theme Priority

1. **URL Parameters** - Highest priority, used for cross-app passing
2. **localStorage** - Persistent storage, maintains across sessions
3. **Default Theme** - Fallback option

### 4. Usage

#### Using in Applications
```typescript
import { ThemeProvider, ModeToggle } from '@ui/components'

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div>
        <ModeToggle />
        {/* Application content */}
      </div>
    </ThemeProvider>
  )
}
```

#### Theme Toggle Component
```typescript
import { useTheme } from '@ui/components'

function CustomThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      Toggle Theme
    </button>
  )
}
```

## Technical Implementation

### 1. Shared Component Architecture
- All theme-related components moved to `@repo/ui` package
- Removed local theme components from individual applications
- Unified export and usage

### 2. Event-Driven Synchronization
- Use `StorageEvent` for cross-window communication
- Manually trigger `storage` events for same-window broadcasting
- Monitor system theme changes

### 3. State Management
- React Context manages application-level theme state
- localStorage for persistent storage
- URL parameters for temporary passing

## Testing and Verification

### Development Environment Testing
1. Start main app: `pnpm dev:main` (port 3000)
2. Start other apps: `pnpm dev:bip322` (port 3001)
3. Switch theme in main app
4. Click links to navigate to other apps, verify theme synchronization
5. Switch theme in new window, verify real-time synchronization

### Production Environment
- Theme parameters passed through URLs to independently deployed applications
- Applications under same domain can synchronize themes in real-time

## Advantages

1. **Seamless Experience**: Themes remain consistent when users switch between different applications
2. **Real-time Synchronization**: Theme switches in one app instantly reflect in other open applications
3. **Persistence**: Theme choices persist across sessions
4. **Compatibility**: Supports automatic system theme switching
5. **Performance**: Lightweight implementation with no additional network requests

## Technical Considerations

1. **Same-Origin Limitation**: Cross-window synchronization only works between same-origin applications
2. **URL Parameters**: Only passes 'dark' and 'light', 'system' theme is not passed through URL
3. **Storage Key**: All applications use the same `storageKey` to ensure synchronization
4. **Browser Support**: Relies on modern browser support for StorageEvent

## Implementation Details

### Enhanced Theme Provider

The enhanced theme provider includes several key features:

#### URL Parameter Detection
```typescript
const getThemeFromUrl = (): Theme | null => {
  if (typeof window === 'undefined') return null

  const urlParams = new URLSearchParams(window.location.search)
  const themeParam = urlParams.get('theme')

  if (themeParam && ['dark', 'light'].includes(themeParam)) {
    return themeParam as Theme
  }

  return null
}
```

#### System Theme Monitoring
```typescript
useEffect(() => {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

  const handleChange = () => {
    if (theme === 'system') {
      setTheme('system') // Trigger re-calculation
    }
  }

  mediaQuery.addEventListener('change', handleChange)
  return () => mediaQuery.removeEventListener('change', handleChange)
}, [theme])
```

#### Cross-Window Storage Events
```typescript
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
```

### Manual Event Broadcasting

For same-window communication (useful for components in the same app):

```typescript
const broadcastThemeChange = (newTheme: Theme, oldTheme: Theme) => {
  window.dispatchEvent(
    new StorageEvent('storage', {
      key: storageKey,
      newValue: newTheme,
      oldValue: oldTheme,
      url: window.location.href,
      storageArea: localStorage,
    })
  )
}
```

### Priority System Implementation

```typescript
const initializeTheme = (): Theme => {
  // 1. Check URL parameters (highest priority)
  const urlTheme = getThemeFromUrl()
  if (urlTheme) return urlTheme

  // 2. Check localStorage (persistent preference)
  const storedTheme = localStorage.getItem(storageKey) as Theme
  if (storedTheme && ['dark', 'light', 'system'].includes(storedTheme)) {
    return storedTheme
  }

  // 3. Use default theme (fallback)
  return defaultTheme
}
```

## Migration Guide

If you're upgrading from local theme components to the shared system:

### 1. Remove Local Components
```bash
# Remove these files from each app
rm apps/*/src/components/theme-provider.tsx
rm apps/*/src/components/mode-toggle.tsx
```

### 2. Update Imports
```typescript
// Before
import { ThemeProvider } from './components/theme-provider'
import { ModeToggle } from './components/mode-toggle'

// After
import { ThemeProvider, ModeToggle } from '@ui/components'
```

### 3. Add URL Theme Support
Update your main app's link generation to include theme parameters:

```typescript
// In main app's navigation
const currentTheme = useTheme().theme
const targetUrl = getAppUrl('bip322', 3001, currentTheme)
```

### 4. Test Cross-App Synchronization
1. Verify theme persistence across app switches
2. Test real-time synchronization in multiple windows
3. Confirm system theme detection works correctly

## Future Enhancements

Potential improvements for the theme synchronization system:

1. **Theme Presets**: Support for custom theme presets beyond dark/light
2. **Animation Sync**: Synchronize theme transition animations across apps
3. **Theme Validation**: Enhanced validation for custom theme configurations
4. **Performance Monitoring**: Track theme synchronization performance metrics
5. **Accessibility**: Enhanced support for high contrast and reduced motion preferences
