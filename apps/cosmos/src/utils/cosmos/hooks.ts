import { useEffect, useState } from 'react'
import { ApiClient } from './api'

export const useApiClient = (endpoint: string) => {
  const [apiClient, setClient] = useState<ApiClient | null>(null)
  useEffect(() => {
    ApiClient.connect(endpoint).then(setClient)
  }, [endpoint])
  return apiClient
}
