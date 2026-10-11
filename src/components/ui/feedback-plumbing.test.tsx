import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from '../ErrorBoundary'
import { LanguageProvider } from '../../i18n/LanguageProvider'
import { ThemeProvider } from './ThemeProvider'
import { EmptyState } from './EmptyState'
import { ErrorPanel } from './ErrorPanel'
import { ToastProvider, useToast } from './ToastProvider'
import { createQueryClient } from '../../lib/queryClient'

function renderWithProviders(ui: React.ReactNode, customClient?: QueryClient) {
  const client = customClient ?? createQueryClient()
  return {
    ...render(
      <LanguageProvider>
        <ThemeProvider>
          <QueryClientProvider client={client}>
            <ToastProvider>{ui}</ToastProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </LanguageProvider>,
    ),
    client,
  }
}

describe('Data and feedback plumbing (T-2.05)', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('ErrorPanel', () => {
    it('renders default Arabic error title and description', () => {
      renderWithProviders(<ErrorPanel />)
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText('حدث خطأ غير متوقع')).toBeInTheDocument()
      expect(screen.getByText('تعذر إكمال الطلب. يرجى المحاولة مرة أخرى.')).toBeInTheDocument()
    })

    it('renders custom title, message and error code with LTR formatting', () => {
      renderWithProviders(
        <ErrorPanel
          title="فشل تحميل قائمة المنتجات"
          message="الخادم غير متاح حالياً"
          code="CAT-001"
        />,
      )

      expect(screen.getByText('فشل تحميل قائمة المنتجات')).toBeInTheDocument()
      expect(screen.getByText('الخادم غير متاح حالياً')).toBeInTheDocument()
      expect(screen.getByText(/CAT-001/)).toBeInTheDocument()
    })

    it('calls onRetry callback when retry button is clicked', async () => {
      const user = userEvent.setup()
      const onRetry = vi.fn()

      renderWithProviders(<ErrorPanel onRetry={onRetry} retryLabel="إعادة المحاولة الآن" />)

      const retryBtn = screen.getByRole('button', { name: 'إعادة المحاولة الآن' })
      await user.click(retryBtn)
      expect(onRetry).toHaveBeenCalledTimes(1)
    })
  })

  describe('EmptyState', () => {
    it('renders empty state with default title and bow ornament', () => {
      renderWithProviders(<EmptyState />)
      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.getByText('لا توجد عناصر لعرضها')).toBeInTheDocument()
    })

    it('renders custom title, description and action', () => {
      renderWithProviders(
        <EmptyState
          title="سلة التسوق فارغة"
          description="لم تقم بإضافة أي إكسسوارات حتى الآن."
          action={<button type="button">تصفح المنتجات</button>}
        />,
      )

      expect(screen.getByText('سلة التسوق فارغة')).toBeInTheDocument()
      expect(screen.getByText('لم تقم بإضافة أي إكسسوارات حتى الآن.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'تصفح المنتجات' })).toBeInTheDocument()
    })
  })

  describe('ErrorBoundary', () => {
    it('catches render errors and renders default ErrorPanel with retry functionality', async () => {
      const user = userEvent.setup()
      // Suppress React boundary console.error during expected test error
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

      function BuggyComponent({ shouldThrow }: { shouldThrow: boolean }) {
        if (shouldThrow) {
          throw new Error('Crash in component')
        }
        return <div>المحتوى سليم</div>
      }

      function Parent() {
        const [hasBug, setHasBug] = useState(true)
        return (
          <ErrorBoundary onReset={() => setHasBug(false)}>
            <BuggyComponent shouldThrow={hasBug} />
          </ErrorBoundary>
        )
      }

      renderWithProviders(<Parent />)

      expect(screen.getByText('حدث خطأ غير متوقع في الصفحة')).toBeInTheDocument()
      const retryBtn = screen.getByRole('button', { name: 'إعادة المحاولة' })
      await user.click(retryBtn)

      expect(screen.getByText('المحتوى سليم')).toBeInTheDocument()
      spy.mockRestore()
    })
  })

  describe('ToastProvider and useToast', () => {
    function ToastTrigger() {
      const { success, error, dismissToast, toasts } = useToast()
      return (
        <div>
          <button type="button" onClick={() => success('تمت العملية بنجاح', 'تم الحفظ')}>
            أظهر نجاح
          </button>
          <button type="button" onClick={() => error('فشلت العملية', 'خطأ')}>
            أظهر خطأ
          </button>
          {toasts.map((t) => (
            <button key={t.id} type="button" onClick={() => dismissToast(t.id)}>
              إغلاق {t.title}
            </button>
          ))}
        </div>
      )
    }

    it('displays and manually dismisses toasts', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ToastTrigger />)

      await user.click(screen.getByRole('button', { name: 'أظهر نجاح' }))
      expect(screen.getByText('تم الحفظ')).toBeInTheDocument()
      expect(screen.getByText('تمت العملية بنجاح')).toBeInTheDocument()

      const dismissBtn = screen.getByRole('button', { name: 'إغلاق تم الحفظ' })
      await user.click(dismissBtn)
      expect(screen.queryByText('تمت العملية بنجاح')).not.toBeInTheDocument()
    })

    it('auto-dismisses toasts after durationMs expires', () => {
      vi.useFakeTimers()

      function QuickToast() {
        const { showToast } = useToast()
        return (
          <button
            type="button"
            onClick={() =>
              showToast({
                title: 'تنبيه سريع',
                message: 'سيختفي قريباً',
                durationMs: 1000,
              })
            }
          >
            تشغيل
          </button>
        )
      }

      renderWithProviders(<QuickToast />)
      act(() => {
        screen.getByRole('button', { name: 'تشغيل' }).click()
      })

      expect(screen.getByText('تنبيه سريع')).toBeInTheDocument()

      act(() => {
        vi.advanceTimersByTime(1100)
      })

      expect(screen.queryByText('تنبيه سريع')).not.toBeInTheDocument()
      vi.useRealTimers()
    })
  })

  describe('QueryClient and Failing Query with Retry', () => {
    it('sets default staleTime to 1 minute and gcTime to 5 minutes', () => {
      const client = createQueryClient()
      const defaults = client.getDefaultOptions()
      expect(defaults.queries?.staleTime).toBe(60000)
      expect(defaults.queries?.gcTime).toBe(300000)
      expect(defaults.queries?.refetchOnWindowFocus).toBe(false)
    })

    it('does not retry 4xx errors but retries 5xx errors up to 2 times', () => {
      const client = createQueryClient()
      const retryFn = client.getDefaultOptions().queries?.retry as (
        count: number,
        err: unknown,
      ) => boolean

      // 400 error should not retry
      expect(retryFn(0, { status: 400 })).toBe(false)
      expect(retryFn(0, { status: 404 })).toBe(false)

      // 500 error retries up to count 2
      expect(retryFn(0, { status: 500 })).toBe(true)
      expect(retryFn(1, { status: 500 })).toBe(true)
      expect(retryFn(2, { status: 500 })).toBe(false)
    })

    it('failing query displays ErrorPanel with retry button, and retrying fetches successfully', async () => {
      const user = userEvent.setup()
      let attempt = 0

      const client = createQueryClient({
        defaultOptions: {
          queries: {
            retry: false, // disable auto retry in this test to test manual retry button
          },
        },
      })

      function DataConsumer() {
        const { data, error, isLoading, refetch } = useQuery({
          queryKey: ['test-failing-query'],
          queryFn: async () => {
            attempt++
            if (attempt === 1) {
              throw new Error('Failed network request')
            }
            return { message: 'بيانات محملة بنجاح' }
          },
        })

        if (isLoading) {
          return <div>جار التحميل...</div>
        }

        if (error) {
          return (
            <ErrorPanel
              title="فشل تحميل البيانات"
              message="تعذر جلب البيانات من الخادم"
              onRetry={() => {
                void refetch()
              }}
            />
          )
        }

        return <div>{data?.message}</div>
      }

      renderWithProviders(<DataConsumer />, client)

      // Initial failure shows ErrorPanel with retry button
      expect(await screen.findByText('فشل تحميل البيانات')).toBeInTheDocument()
      expect(screen.getByText('تعذر جلب البيانات من الخادم')).toBeInTheDocument()

      const retryBtn = screen.getByRole('button', { name: 'إعادة المحاولة' })
      expect(retryBtn).toBeInTheDocument()

      // Click retry
      await user.click(retryBtn)

      // After retry, query succeeds
      expect(await screen.findByText('بيانات محملة بنجاح')).toBeInTheDocument()
      expect(screen.queryByText('فشل تحميل البيانات')).not.toBeInTheDocument()
    })
  })
})
