# imToken Test DApp

A standalone React application for testing imToken wallet integration with Ethereum Sepolia and Bitcoin Signet networks.

## Features

- imToken wallet connection
- Ethereum Sepolia account management
- Bitcoin Signet account management
- Ethereum transaction signing

## Development

```bash
# Install dependencies
pnpm install

# Start development server (runs on port 3005)
pnpm dev

# Build for production
pnpm build

# Run linting
pnpm lint
```

## Usage

1. Start the development server
2. Open http://localhost:3005 in your browser
3. Connect your imToken wallet
4. Get Ethereum Sepolia and Bitcoin Signet accounts
5. Test signing functionality

## Dependencies

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Ethers.js
- Jotai (state management)

## imToken Integration

This dapp integrates with imToken wallet to:
- Connect to Ethereum Sepolia network
- Connect to Bitcoin Signet network
- Sign Ethereum transactions
