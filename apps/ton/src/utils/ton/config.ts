// TON API Configuration
export const TON_CONFIG = {
  // 使用 TonCenter API 避免 CORS 问题
  endpoint: import.meta.env.VITE_TON_ENDPOINT || 'https://toncenter.com/api/v2',

  // TonCenter API 不需要 token 进行基本查询
  apiToken: import.meta.env.VITE_TON_API_TOKEN || '',

  // Network configuration
  network: import.meta.env.VITE_TON_NETWORK || 'mainnet',

  // API headers for TonCenter
  getHeaders: () => ({
    'Content-Type': 'application/json',
    // TonCenter 支持 CORS，不需要特殊的认证头
  }),

  // TonCenter API endpoints
  endpoints: {
    // TonCenter 使用不同的端点结构
    addressInfo: (address: string) =>
      `${TON_CONFIG.endpoint}/getAddressInformation?address=${address}`,
    transactions: (address: string, limit = 10) =>
      `${TON_CONFIG.endpoint}/getTransactions?address=${address}&limit=${limit}`,
    balance: (address: string) =>
      `${TON_CONFIG.endpoint}/getAddressBalance?address=${address}`,

    // 备用端点（如果需要）
    alternativeEndpoints: {
      tonapi: 'https://tonapi.io/v2',
      toncenter: 'https://toncenter.com/api/v2',
      tonconsole: 'https://api.ton.sh/v1',
    },
  },
}

// Helper function to make requests to TonCenter API
export async function fetchTonAPI(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...TON_CONFIG.getHeaders(),
      ...options.headers,
    },
  })

  if (!response.ok) {
    throw new Error(
      `TonCenter API request failed: ${response.status} ${response.statusText}`,
    )
  }

  return response.json()
}

// 工具函数：检查 API 可用性
export async function checkAPIHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${TON_CONFIG.endpoint}/getMasterchainInfo`, {
      method: 'GET',
      headers: TON_CONFIG.getHeaders(),
    })
    return response.ok
  } catch (error) {
    console.warn('TonCenter API health check failed:', error)
    return false
  }
}

// 地址验证工具
export function isValidTonAddress(address: string): boolean {
  // TON 地址的基本验证
  if (!address) return false

  // User-friendly 格式 (EQ..., UQ...)
  if (/^[EU]Q[A-Za-z0-9_-]{46}$/.test(address)) return true

  // Raw 格式 (0:hex64 或 -1:hex64)
  if (/^-?[0-9]+:[a-fA-F0-9]{64}$/.test(address)) return true

  return false
}
