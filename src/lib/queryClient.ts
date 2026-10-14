import { QueryClient, type QueryClientConfig } from '@tanstack/react-query'

export function createQueryClient(config?: QueryClientConfig): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          if (failureCount >= 2) return false
          if (error && typeof error === 'object' && 'status' in error) {
            const status = (error as { status: unknown }).status
            if (typeof status === 'number' && status >= 400 && status < 500) {
              return false
            }
          }
          return true
        },
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        ...config?.defaultOptions?.queries,
      },
      mutations: {
        retry: false,
        ...config?.defaultOptions?.mutations,
      },
      ...config?.defaultOptions,
    },
    ...config,
  })
}

export const queryClient = createQueryClient()
