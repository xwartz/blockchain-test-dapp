# Vercel Deployment Guide

This project contains multiple independent applications, each can be deployed to Vercel separately.

## Deployment Architecture

```
Main App (Navigation)    → blockchain-test-dapp-main.vercel.app (Port 3000)
BIP-322 App             → blockchain-test-dapp-bip322.vercel.app (Port 3001)
BIP-370 App             → blockchain-test-dapp-bip370.vercel.app (Port 3002)
Cosmos App              → blockchain-test-dapp-cosmos.vercel.app (Port 3003)
```

## Deployment Steps

### 1. Prepare GitHub Repository

Ensure your code is pushed to a GitHub repository.

### 2. Create Projects in Vercel

For each application, you need to create an independent project in Vercel:

1. Visit [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Create independent projects for each application

### 3. Configure Project Settings

#### Main Application
- **Project Name**: `blockchain-test-dapp-main`
- **Build Command**: `cd ../.. && pnpm build --filter=main`
- **Output Directory**: `dist`
- **Install Command**: `cd ../.. && pnpm install`
- **Framework**: `vite`
- **Node.js Version**: 18.x

#### BIP-322 Application
- **Project Name**: `blockchain-test-dapp-bip322`
- **Build Command**: `cd ../.. && pnpm build --filter=bip322`
- **Output Directory**: `dist`
- **Install Command**: `cd ../.. && pnpm install`
- **Framework**: `vite`
- **Node.js Version**: 18.x

#### BIP-370 Application
- **Project Name**: `blockchain-test-dapp-bip370`
- **Build Command**: `cd ../.. && pnpm build --filter=bip370`
- **Output Directory**: `dist`
- **Install Command**: `cd ../.. && pnpm install`
- **Framework**: `vite`
- **Node.js Version**: 18.x

#### Cosmos Application
- **Project Name**: `blockchain-test-dapp-cosmos`
- **Build Command**: `cd ../.. && pnpm build --filter=cosmos`
- **Output Directory**: `dist`
- **Install Command**: `cd ../.. && pnpm install`
- **Framework**: `vite`
- **Node.js Version**: 18.x

### 4. Environment Variables Configuration

#### Main Application Environment Variables
Add the following environment variables in the main application's Vercel project settings:

```
VITE_BASE_URL=https://blockchain-test-dapp
```

This way the main application will automatically generate correct links:
- `https://blockchain-test-dapp-bip322.vercel.app`
- `https://blockchain-test-dapp-bip370.vercel.app`
- `https://blockchain-test-dapp-cosmos.vercel.app`

#### Other Applications Environment Variables
Other applications usually don't need additional environment variables, but you can add if needed:

```
NODE_ENV=production
```

## Build Optimization

### Vercel Configuration Files

Each application contains a `vercel.json` file to optimize deployment:

```json
{
  "name": "blockchain-test-dapp-{app-name}",
  "buildCommand": "cd ../.. && pnpm build --filter={app-name}",
  "outputDirectory": "dist",
  "installCommand": "cd ../.. && pnpm install",
  "framework": "vite"
}
```

> **Important Note**: Vercel runs commands from the application directory (`apps/{app-name}`), so we need to use `cd ../..` to switch to the project root directory, then use the relative path `dist` as the output directory.

### Dependency Optimization

- Each application's `package.json` only contains necessary dependencies
- Shared dependencies are managed through workspace
- Tailwind CSS configuration is optimized to avoid unused styles

## Automated Deployment

### Using Vercel CLI

Install Vercel CLI:
```bash
npm i -g vercel
```

Deploy all applications:
```bash
# Deploy main application
cd apps/main && vercel --prod

# Deploy BIP-322 application
cd apps/bip322 && vercel --prod

# Deploy BIP-370 application
cd apps/bip370 && vercel --prod

# Deploy Cosmos application
cd apps/cosmos && vercel --prod
```

### GitHub Actions (Optional)

You can create GitHub Actions workflows to automate the deployment process. All applications will be automatically deployed whenever code is pushed to the main branch.

Example workflow configuration:

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

## Domain Configuration

If you have a custom domain, you can configure subdomains for each application:

- `main.yourdomain.com` → Main application
- `bip322.yourdomain.com` → BIP-322 application
- `bip370.yourdomain.com` → BIP-370 application
- `cosmos.yourdomain.com` → Cosmos application

Remember to update `VITE_BASE_URL` in the main application's environment variables:
```
VITE_BASE_URL=https://yourdomain.com
```

Then the application links will become:
- `https://bip322.yourdomain.com`
- `https://bip370.yourdomain.com`
- `https://cosmos.yourdomain.com`

## Performance Optimization

### Build Optimization

1. **Tree Shaking**: Vite automatically removes unused code
2. **Code Splitting**: Large dependencies are automatically split into independent chunks
3. **Image Optimization**: Use Vercel's image optimization features
4. **Caching Strategy**: Static assets use long-term caching

### Monitoring

- Use Vercel Analytics to monitor performance
- Set up error reporting and monitoring
- Regularly check build logs

## Troubleshooting

### Common Issues

1. **Build failures**:
   - Check if Node.js version is 18.x
   - Ensure all dependencies are properly installed
   - Check TypeScript errors

2. **"No Output Directory named 'dist' found" error**:
   - Ensure `outputDirectory` is set to `dist` (relative to application directory)
   - Must use `cd ../..` in `buildCommand` to switch to project root directory
   - Check build logs to confirm dist directory is created correctly
   - Vercel runs from application directory, not project root directory

3. **Path issues**:
   - Remove `rootDirectory` setting from vercel.json (deprecated)
   - Check relative path references

4. **Environment variables**:
   - Ensure environment variables are correctly configured in Vercel project settings
   - Variable names must start with `VITE_` to be used in client-side

5. **Dependency issues**:
   - Clear Vercel cache and redeploy
   - Check if workspace dependencies are correctly resolved

## Latest Configuration Changes (June 2024)

We recently updated Vercel configuration to resolve deployment issues:

1. **Restored necessary directory switching**:
   - Old config: `"buildCommand": "pnpm build --filter=app"`
   - New config: `"buildCommand": "cd ../.. && pnpm build --filter=app"`

2. **Fixed output directory path**:
   - Old config: `"outputDirectory": "apps/{app-name}/dist"`
   - New config: `"outputDirectory": "dist"`

3. **Understanding Vercel's working directory**:
   - Vercel runs commands from application directory (`apps/{app-name}`)
   - Need to switch to project root directory to use pnpm workspace functionality
   - Output directory is relative to application directory, so using `dist` is sufficient

These changes resolve the "No Output Directory named 'dist' found" deployment error.

## Notes

1. **Build Time**: Due to using monorepo, build time may be longer because it needs to install dependencies for the entire project.

2. **Cache Strategy**: Vercel automatically caches dependencies and build artifacts to speed up subsequent deployments.

3. **Environment Detection**: Applications automatically detect their environment (development/production) and adjust behavior accordingly.

4. **Workspace Dependencies**: Ensure all workspace dependencies (`@repo/*`) are properly configured in each application's `package.json`.

## Support

If you encounter issues during deployment:

1. Check Vercel build logs for detailed error information
2. Verify all configuration files are correct
3. Test build locally using the same commands
4. Contact Vercel support if needed

For project-specific issues, please create an issue in the GitHub repository.
