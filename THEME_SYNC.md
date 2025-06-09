# 跨应用主题同步功能

## 问题描述

在将单一应用拆分为多个独立应用后，每个应用都有自己的运行时环境，无法直接共享主题状态。用户在一个应用中切换主题后，其他应用无法自动同步主题变化。

## 解决方案

我们实现了一个跨应用的主题同步机制，包含以下特性：

### 1. 共享主题组件

- **位置**: `packages/ui/src/components/theme-provider.tsx`
- **功能**: 统一的主题管理逻辑，支持跨窗口同步
- **特性**:
  - URL 参数主题传递
  - localStorage 存储
  - 跨窗口实时同步
  - 系统主题监听

### 2. 主题同步机制

#### URL 参数传递
```typescript
// 主应用跳转时携带当前主题
const getAppUrl = (appName: string, port?: number, theme?: string) => {
  // ... 基础 URL 构建

  // 添加主题参数
  if (theme && theme !== 'system') {
    const separator = baseUrl.includes('?') ? '&' : '?'
    baseUrl += `${separator}theme=${theme}`
  }

  return baseUrl
}
```

#### 跨窗口监听
```typescript
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
```

#### 主题广播
```typescript
const setTheme = (newTheme: Theme) => {
  localStorage.setItem(storageKey, newTheme)
  setTheme(newTheme)

  // 广播给同源的其他窗口
  window.dispatchEvent(
    new StorageEvent('storage', {
      key: storageKey,
      newValue: newTheme,
      oldValue: theme,
    })
  )
}
```

### 3. 主题优先级

1. **URL 参数** - 最高优先级，用于跨应用传递
2. **localStorage** - 持久化存储，跨会话保持
3. **默认主题** - 兜底方案

### 4. 使用方式

#### 在应用中使用
```typescript
import { ThemeProvider, ModeToggle } from '@ui/components'

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div>
        <ModeToggle />
        {/* 应用内容 */}
      </div>
    </ThemeProvider>
  )
}
```

#### 主题切换组件
```typescript
import { useTheme } from '@ui/components'

function CustomThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      切换主题
    </button>
  )
}
```

## 技术实现

### 1. 共享组件架构
- 所有主题相关组件移至 `@repo/ui` 包
- 删除各应用中的本地主题组件
- 统一导出和使用

### 2. 事件驱动同步
- 使用 `StorageEvent` 实现跨窗口通信
- 手动触发 `storage` 事件进行同窗口内广播
- 监听系统主题变化

### 3. 状态管理
- React Context 管理应用内主题状态
- localStorage 持久化存储
- URL 参数临时传递

## 测试验证

### 开发环境测试
1. 启动主应用: `pnpm dev:main` (端口 3000)
2. 启动其他应用: `pnpm dev:bip322` (端口 3001)
3. 在主应用中切换主题
4. 点击链接跳转到其他应用，验证主题同步
5. 在新窗口中切换主题，验证实时同步

### 生产环境
- 主题参数通过 URL 传递到独立部署的应用
- 同域名下的应用可以实时同步主题变化

## 优势

1. **无缝体验**: 用户在不同应用间切换时主题保持一致
2. **实时同步**: 在一个应用中切换主题，其他打开的应用立即同步
3. **持久化**: 主题选择跨会话保持
4. **兼容性**: 支持系统主题自动切换
5. **性能**: 轻量级实现，无额外网络请求

## 注意事项

1. **同源限制**: 跨窗口同步仅在同源应用间有效
2. **URL 参数**: 仅传递 'dark' 和 'light'，'system' 主题不通过 URL 传递
3. **存储键**: 所有应用使用相同的 `storageKey` 确保同步
4. **浏览器支持**: 依赖现代浏览器的 StorageEvent 支持
