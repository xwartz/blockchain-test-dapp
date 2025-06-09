# Vercel 部署指南

本项目包含多个独立的应用，每个应用都可以单独部署到 Vercel。

## 部署架构

```
主应用 (导航)     → blockchain-test-dapp-main.vercel.app (Port 3000)
BIP-322 应用     → blockchain-test-dapp-bip322.vercel.app (Port 3001)
BIP-370 应用     → blockchain-test-dapp-bip370.vercel.app (Port 3002)
Cosmos 应用      → blockchain-test-dapp-cosmos.vercel.app (Port 3003)
```

## 部署步骤

### 1. 准备 GitHub 仓库

确保你的代码已推送到 GitHub 仓库。

### 2. 在 Vercel 中创建项目

对于每个应用，都需要在 Vercel 中创建一个独立的项目：

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 "New Project"
3. 导入你的 GitHub 仓库
4. 为每个应用创建独立的项目

### 3. 配置项目设置

#### 主应用 (Main)
- **Project Name**: `blockchain-test-dapp-main`
- **Build Command**: `pnpm build --filter=main`
- **Output Directory**: `apps/main/dist`
- **Install Command**: `pnpm install`
- **Framework**: `vite`
- **Node.js Version**: 18.x

#### BIP-322 应用
- **Project Name**: `blockchain-test-dapp-bip322`
- **Build Command**: `pnpm build --filter=bip322`
- **Output Directory**: `apps/bip322/dist`
- **Install Command**: `pnpm install`
- **Framework**: `vite`
- **Node.js Version**: 18.x

#### BIP-370 应用
- **Project Name**: `blockchain-test-dapp-bip370`
- **Build Command**: `pnpm build --filter=bip370`
- **Output Directory**: `apps/bip370/dist`
- **Install Command**: `pnpm install`
- **Framework**: `vite`
- **Node.js Version**: 18.x

#### Cosmos 应用
- **Project Name**: `blockchain-test-dapp-cosmos`
- **Build Command**: `pnpm build --filter=cosmos`
- **Output Directory**: `apps/cosmos/dist`
- **Install Command**: `pnpm install`
- **Framework**: `vite`
- **Node.js Version**: 18.x

### 4. 环境变量配置

#### 主应用环境变量
在主应用的 Vercel 项目设置中添加以下环境变量：

```
VITE_BASE_URL=https://blockchain-test-dapp
```

这样主应用会自动生成正确的链接：
- `https://blockchain-test-dapp-bip322.vercel.app`
- `https://blockchain-test-dapp-bip370.vercel.app`
- `https://blockchain-test-dapp-cosmos.vercel.app`

#### 其他应用环境变量
其他应用通常不需要额外的环境变量，但如果需要可以添加：

```
NODE_ENV=production
```

## 构建优化

### Vercel 配置文件

每个应用都包含一个 `vercel.json` 文件来优化部署：

```json
{
  "name": "blockchain-test-dapp-{app-name}",
  "buildCommand": "pnpm build --filter={app-name}",
  "outputDirectory": "apps/{app-name}/dist",
  "installCommand": "pnpm install",
  "framework": "vite"
}
```

> **重要说明**: Vercel 会自动从项目根目录运行命令，所以不需要使用 `cd ../..` 来切换目录。

### 依赖优化

- 每个应用的 `package.json` 只包含必要的依赖
- 共享依赖通过 workspace 管理
- Tailwind CSS 配置已优化，避免未使用的样式

## 自动化部署

### 使用 Vercel CLI

安装 Vercel CLI：
```bash
npm i -g vercel
```

部署所有应用：
```bash
# 部署主应用
cd apps/main && vercel --prod

# 部署 BIP-322 应用
cd apps/bip322 && vercel --prod

# 部署 BIP-370 应用
cd apps/bip370 && vercel --prod

# 部署 Cosmos 应用
cd apps/cosmos && vercel --prod
```

### GitHub Actions (可选)

你可以创建 GitHub Actions 工作流来自动化部署过程。每当代码推送到主分支时，所有应用都会自动部署。

示例工作流配置：

```yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        app: [main, bip322, bip370, cosmos]
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - name: Deploy ${{ matrix.app }}
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID_${{ matrix.app }} }}
          working-directory: ./apps/${{ matrix.app }}
```

## 域名配置

如果你有自定义域名，可以为每个应用配置子域名：

- `main.yourdomain.com` → 主应用
- `bip322.yourdomain.com` → BIP-322 应用
- `bip370.yourdomain.com` → BIP-370 应用
- `cosmos.yourdomain.com` → Cosmos 应用

记得在主应用的环境变量中更新 `VITE_BASE_URL`：
```
VITE_BASE_URL=https://yourdomain.com
```

然后应用链接会变成：
- `https://bip322.yourdomain.com`
- `https://bip370.yourdomain.com`
- `https://cosmos.yourdomain.com`

## 性能优化

### 构建优化

1. **Tree Shaking**: Vite 自动移除未使用的代码
2. **Code Splitting**: 大型依赖会自动分割为独立的块
3. **图片优化**: 使用 Vercel 的图片优化功能
4. **缓存策略**: 静态资源使用长期缓存

### 监控

- 使用 Vercel Analytics 监控性能
- 设置错误报告和监控
- 定期检查构建日志

## 故障排除

### 常见问题

1. **构建失败**:
   - 检查 Node.js 版本是否为 18.x
   - 确保所有依赖都已正确安装
   - 检查 TypeScript 错误

2. **"No Output Directory named 'dist' found" 错误**:
   - 确保 `outputDirectory` 设置为 `apps/{app-name}/dist`
   - 不要在 `buildCommand` 中使用 `cd ../..`，Vercel 已经从项目根目录运行
   - 检查构建日志确认 dist 目录是否被正确创建

3. **路径问题**:
   - 移除 vercel.json 中的 `rootDirectory` 设置（已弃用）
   - 检查相对路径引用

4. **环境变量**:
   - 确保环境变量在 Vercel 项目设置中正确配置
   - 变量名必须以 `VITE_` 开头才能在客户端使用

5. **依赖问题**:
   - 清除 Vercel 缓存并重新部署
   - 检查 workspace 依赖是否正确解析

## 最新配置变更 (2024年6月)

我们最近更新了 Vercel 配置，以解决部署问题：

1. **移除了不必要的目录切换**:
   - 旧配置: `"buildCommand": "cd ../.. && pnpm build --filter=app"`
   - 新配置: `"buildCommand": "pnpm build --filter=app"`

2. **更新了输出目录路径**:
   - 旧配置: `"outputDirectory": "dist"`
   - 新配置: `"outputDirectory": "apps/{app-name}/dist"`

3. **移除了 Root Directory 设置**:
   - Vercel 现在自动从项目根目录运行命令
   - 不再需要设置 `rootDirectory` 字段

这些更改解决了 "No Output Directory named 'dist' found" 的部署错误。

## 注意事项

1. **构建时间**: 由于使用了 monorepo，构建时间可能较长，因为需要安装整个项目的依赖。

2. **缓存**: Vercel 会缓存 `node_modules`，但由于使用了 workspace，可能需要额外的缓存配置。

3. **依赖优化**: 每个应用的 `package.json` 中只包含必要的依赖，以减少构建包大小。

4. **环境检测**: 应用会自动检测运行环境（开发/生产），并显示相应的信息。

5. **TypeScript**: 确保所有 TypeScript 错误都已解决，否则构建会失败。

6. **图标导入**: 所有 Lucide React 图标都通过 `@repo/ui` 包导入，避免重复依赖。

## 成本优化

- 每个应用独立部署，只有实际使用的应用才会产生流量费用
- 静态资源缓存减少带宽成本
- 按需加载减少初始包大小
