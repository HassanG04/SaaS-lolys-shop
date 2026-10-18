import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LanguageProvider } from '@/i18n/LanguageProvider'
import SuggestionModal from './components/SuggestionModal'
import { AdminSuggestionsTable } from '@/features/admin/suggestions/AdminSuggestionsTable'
import * as api from './api'
import type { CustomerSuggestion } from './types'

const mockSuggestions: CustomerSuggestion[] = [
  {
    id: 'sug-1',
    customer_id: 'cust-1',
    topic: 'products',
    message: 'يرجى إضافة قسم خاص بالإكسسوارات المصنوعة يدويًا',
    status: 'pending',
    admin_notes: null,
    created_at: new Date().toISOString(),
    reviewed_at: null,
  },
  {
    id: 'sug-2',
    customer_id: 'cust-2',
    topic: 'delivery',
    message: 'Could you offer same day delivery in Cairo?',
    status: 'reviewed',
    admin_notes: 'Under consideration with logistics team',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    reviewed_at: new Date().toISOString(),
  },
]

import { ToastProvider } from '@/components/ui/ToastProvider'

function renderWithProviders(ui: React.ReactElement, initialLang: 'ar' | 'en' = 'ar') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <LanguageProvider initialLanguage={initialLang}>
        <ToastProvider>{ui}</ToastProvider>
      </LanguageProvider>
    </QueryClientProvider>,
  )
}

describe('Customer Suggestions & Admin Review (T-2.10)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(api, 'submitCustomerSuggestionApi').mockResolvedValue('sug-new')
    vi.spyOn(api, 'fetchCustomerSuggestionsApi').mockResolvedValue(mockSuggestions)
    vi.spyOn(api, 'adminFetchSuggestionsApi').mockResolvedValue(mockSuggestions)
    vi.spyOn(api, 'adminReviewSuggestionApi').mockResolvedValue()
  })

  describe('SuggestionModal (Customer UI)', () => {
    it('validates minimum length before submission', async () => {
      renderWithProviders(<SuggestionModal isOpen={true} onClose={vi.fn()} />, 'ar')

      const textarea = screen.getByLabelText(/رسالتك/i)
      fireEvent.change(textarea, { target: { value: 'قصير' } })

      const submitBtn = screen.getByRole('button', { name: /إرسال الاقتراح/i })
      // Even if clicked, minimum character validation triggers
      fireEvent.click(submitBtn)

      expect(api.submitCustomerSuggestionApi).not.toHaveBeenCalled()
    })

    it('submits valid suggestion and displays success feedback', async () => {
      renderWithProviders(<SuggestionModal isOpen={true} onClose={vi.fn()} />, 'ar')

      const textarea = screen.getByLabelText(/رسالتك/i)
      fireEvent.change(textarea, {
        target: { value: 'اقترح توفير أكواب حرارية بحجم أكبر مناسبة للسفر والرحلات' },
      })

      const submitBtn = screen.getByRole('button', { name: /إرسال الاقتراح/i })
      fireEvent.click(submitBtn)

      await waitFor(() => {
        expect(api.submitCustomerSuggestionApi).toHaveBeenCalledWith({
          topic: 'products',
          message: 'اقترح توفير أكواب حرارية بحجم أكبر مناسبة للسفر والرحلات',
        })
      })

      expect(await screen.findByText(/تم إرسال اقتراحك بنجاح/i)).toBeInTheDocument()
    })

    it('handles rate limit error gracefully with user-friendly message', async () => {
      vi.spyOn(api, 'submitCustomerSuggestionApi').mockRejectedValue(
        new Error('Rate limit exceeded: max 5 suggestions per hour'),
      )

      renderWithProviders(<SuggestionModal isOpen={true} onClose={vi.fn()} />, 'en')

      const textarea = screen.getByLabelText(/Your message/i)
      fireEvent.change(textarea, {
        target: { value: 'Testing hourly limit error response from backend API' },
      })

      const submitBtn = screen.getByRole('button', { name: /Submit suggestion/i })
      fireEvent.click(submitBtn)

      expect(
        await screen.findByText(/You have reached the hourly submission limit/i),
      ).toBeInTheDocument()
    })
  })

  describe('AdminSuggestionsTable (Admin UI)', () => {
    it('renders suggestions list with topics and statuses', async () => {
      renderWithProviders(<AdminSuggestionsTable />, 'ar')

      expect(
        await screen.findByText(/يرجى إضافة قسم خاص بالإكسسوارات المصنوعة يدويًا/i),
      ).toBeInTheDocument()
      expect(screen.getAllByText('قيد المراجعة').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('تمت المراجعة').length).toBeGreaterThanOrEqual(1)
    })

    it('filters suggestions by status', async () => {
      renderWithProviders(<AdminSuggestionsTable />, 'ar')

      // Click "تمت المراجعة" filter
      const reviewedFilterBtn = await screen.findByRole('button', { name: 'تمت المراجعة' })
      fireEvent.click(reviewedFilterBtn)

      // Only reviewed item should be visible in table
      expect(screen.getByText(/Could you offer same day delivery/i)).toBeInTheDocument()
      expect(
        screen.queryByText(/يرجى إضافة قسم خاص بالإكسسوارات المصنوعة يدويًا/i),
      ).not.toBeInTheDocument()
    })

    it('opens review dialog and submits status update', async () => {
      renderWithProviders(<AdminSuggestionsTable />, 'en')

      const reviewButtons = await screen.findAllByRole('button', { name: /Review Suggestion/i })
      fireEvent.click(reviewButtons[0])

      // Review dialog is open
      const saveBtn = screen.getByRole('button', { name: /Save/i })
      fireEvent.click(saveBtn)

      await waitFor(() => {
        expect(api.adminReviewSuggestionApi).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'sug-1',
            status: 'reviewed',
          }),
        )
      })
    })
  })
})
