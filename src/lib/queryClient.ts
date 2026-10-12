import { QueryClient, type QueryClientConfig } from '@tanstack/react-query'

export function createQueryClient(config?: QueryClientConfig): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          if (failureCount >= 2) return false
          const status =
            error && typeof error === 'object' && 'status' in error
              ? Number((error as { status: unknown }).status)
              : 0
          return !(status >= 400 && status < 500)
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
