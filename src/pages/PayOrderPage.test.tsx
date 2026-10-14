import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import PayOrderPage from './PayOrderPage'
import * as paymentsApi from '@/features/payments/api'
import * as settingsApi from '@/features/settings/api'
import type { OrderPaymentDetails } from '@/features/payments/types'
import { ToastProvider } from '@/components/ui/ToastProvider'
import type { AuthContextValue } from '@/features/auth/types'
import type { User } from '@supabase/supabase-js'

import { LanguageProvider } from '@/i18n/LanguageProvider'

// Mock useAuth
const mockUser = {
  id: 'user-123',
  email: 'customer@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2026-10-12T00:00:00Z',
}

const mockAuthValue: Partial<AuthContextValue> = {
  user: mockUser as unknown as User,
  session: null,
  role: 'customer',
  loading: false,
}

vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => mockAuthValue,
}))

vi.mock('@/features/payments/api', () => ({
  getOrderPaymentDetailsApi: vi.fn(),
  uploadPaymentProofApi: vi.fn(),
  submitPaymentProofApi: vi.fn(),
}))

vi.mock('@/features/settings/api', () => ({
  getPublicSettings: vi.fn(),
}))

const baseOrder: OrderPaymentDetails = {
  id: 101,
  user_id: 'user-123',
  status: 'pending',
  payment_status: 'awaiting_proof',
  payment_method: 'instapay_qr',
  payment_deadline: new Date(Date.now() + 3600_000).toISOString(), // 1 hour in future
  payment_reference: null,
  payment_proof_path: null,
  payment_submitted_at: null,
  payment_review_note: null,
  total: 550,
  created_at: '2026-10-12T10:00:00Z',
}

function renderComponent(orderId = '101') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })

  return render(
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <MemoryRouter initialEntries={[`/pay/${orderId}`]}>
            <Routes>
              <Route path="/pay/:orderId" element={<PayOrderPage />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    </LanguageProvider>,
  )
}

describe('PayOrderPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(settingsApi.getPublicSettings).mockResolvedValue({
      instapay_handle: 'lolys@instapay',
      instapay_qr_path: undefined,
    })

    if (!globalThis.URL.createObjectURL) {
      globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    }
    if (!globalThis.URL.revokeObjectURL) {
      globalThis.URL.revokeObjectURL = vi.fn()
    }
  })

  it('renders loading indicator while loading order details', () => {
    vi.mocked(paymentsApi.getOrderPaymentDetailsApi).mockReturnValue(new Promise(() => {}))
    renderComponent('101')

    expect(screen.getByRole('status', { name: /جارٍ تحميل/ })).toBeInTheDocument()
  })

  it('renders error panel on fetch failure', async () => {
    vi.mocked(paymentsApi.getOrderPaymentDetailsApi).mockRejectedValue(new Error('Network error'))
    renderComponent('101')

    expect(
      await screen.findByRole('heading', { name: /تعذّر تحميل بيانات الدفع/ }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /إعادة المحاولة/ })).toBeInTheDocument()
  })

  it('renders COD notice when order payment method is not instapay_qr', async () => {
    vi.mocked(paymentsApi.getOrderPaymentDetailsApi).mockResolvedValue({
      ...baseOrder,
      payment_method: 'cod',
    })
    renderComponent('101')

    expect(await screen.findByRole('heading', { name: /الدفع عند الاستلام/ })).toBeInTheDocument()
    expect(screen.getByText(/مسجل بطريقة الدفع عند الاستلام/)).toBeInTheDocument()
  })

  it('renders active InstaPay payment screen with QR, handle, amount, and instructions', async () => {
    vi.mocked(paymentsApi.getOrderPaymentDetailsApi).mockResolvedValue(baseOrder)
    renderComponent('101')

    // Order ID and total
    expect(await screen.findByRole('heading', { name: '#101' })).toBeInTheDocument()
    expect(screen.getByText(/550.*ج\.م/)).toBeInTheDocument()

    // Status chip
    expect(screen.getByText('بانتظار الدفع')).toBeInTheDocument()

    // Handle and order reference
    expect(screen.getByText('lolys@instapay')).toBeInTheDocument()
    expect(screen.getByText('101')).toBeInTheDocument()

    // Instructions
    expect(screen.getByText(/خطوات الدفع عبر إنستاباي/)).toBeInTheDocument()
    expect(screen.getByText(/افتح تطبيق إنستاباي أو تطبيق البنك/)).toBeInTheDocument()

    // Form elements
    expect(screen.getByLabelText(/رقم عملية التحويل/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /تأكيد وإرسال إثبات التحويل/ })).toBeDisabled()
  })

  it('renders under review state when payment_status is under_review', async () => {
    vi.mocked(paymentsApi.getOrderPaymentDetailsApi).mockResolvedValue({
      ...baseOrder,
      payment_status: 'under_review',
      payment_reference: 'REF-123456',
    })
    renderComponent('101')

    expect(await screen.findByText('قيد المراجعة')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /إثبات التحويل قيد المراجعة/ })).toBeInTheDocument()
    expect(screen.getByText('REF-123456')).toBeInTheDocument()
    // Upload form is hidden
    expect(screen.queryByLabelText(/رقم عملية التحويل/)).not.toBeInTheDocument()
  })

  it('renders paid state when payment_status is paid', async () => {
    vi.mocked(paymentsApi.getOrderPaymentDetailsApi).mockResolvedValue({
      ...baseOrder,
      payment_status: 'paid',
    })
    renderComponent('101')

    expect(await screen.findByText('تم تأكيد الدفع')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /تم تأكيد الدفع بنجاح/ })).toBeInTheDocument()
    expect(screen.queryByLabelText(/رقم عملية التحويل/)).not.toBeInTheDocument()
  })

  it('renders rejected state with review note and allows re-uploading', async () => {
    vi.mocked(paymentsApi.getOrderPaymentDetailsApi).mockResolvedValue({
      ...baseOrder,
      payment_status: 'rejected',
      payment_review_note: 'صورة الإشعار غير واضحة والمبلغ غير مطابق',
    })
    renderComponent('101')

    expect(await screen.findByText('مرفوض')).toBeInTheDocument()
    expect(screen.getByText(/تم رفض إثبات الدفع السابق/)).toBeInTheDocument()
    expect(screen.getByText(/صورة الإشعار غير واضحة والمبلغ غير مطابق/)).toBeInTheDocument()
    // Upload form is available for re-upload
    expect(screen.getByLabelText(/رقم عملية التحويل/)).toBeInTheDocument()
  })

  it('renders expired notice when payment deadline has passed', async () => {
    vi.mocked(paymentsApi.getOrderPaymentDetailsApi).mockResolvedValue({
      ...baseOrder,
      payment_deadline: new Date(Date.now() - 3600_000).toISOString(), // 1 hour ago
    })
    renderComponent('101')

    expect(await screen.findByText(/انتهت مهلة الدفع المحددة لهذا الطلب/)).toBeInTheDocument()
    expect(screen.queryByLabelText(/رقم عملية التحويل/)).not.toBeInTheDocument()
  })

  it('handles proof upload and submission flow', async () => {
    vi.mocked(paymentsApi.getOrderPaymentDetailsApi).mockResolvedValue(baseOrder)
    vi.mocked(paymentsApi.uploadPaymentProofApi).mockResolvedValue('user-123/101/uuid.jpg')
    vi.mocked(paymentsApi.submitPaymentProofApi).mockResolvedValue(undefined)

    renderComponent('101')

    const refInput = await screen.findByLabelText(/رقم عملية التحويل/)
    fireEvent.change(refInput, { target: { value: 'INSTA-998877' } })

    // Simulate file input with valid JPEG header
    const jpegBytes = new Uint8Array([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x00,
    ])
    const validFile = new File([jpegBytes], 'receipt.jpg', { type: 'image/jpeg' })

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).toBeInTheDocument()

    // Trigger file change
    fireEvent.change(fileInput, { target: { files: [validFile] } })

    const submitBtn = screen.getByRole('button', { name: /تأكيد وإرسال إثبات التحويل/ })
    await waitFor(() => {
      expect(submitBtn).not.toBeDisabled()
    })

    const form = submitBtn.closest('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(paymentsApi.uploadPaymentProofApi).toHaveBeenCalledWith(
        'user-123',
        101,
        expect.any(Blob),
        'image/jpeg',
        'jpg',
      )
      expect(paymentsApi.submitPaymentProofApi).toHaveBeenCalledWith({
        orderId: 101,
        reference: 'INSTA-998877',
        proofPath: 'user-123/101/uuid.jpg',
      })
    })
  })

  it('displays UPL-001 error when renamed invalid file is selected', async () => {
    vi.mocked(paymentsApi.getOrderPaymentDetailsApi).mockResolvedValue(baseOrder)
    renderComponent('101')

    await screen.findByLabelText(/رقم عملية التحويل/)

    // Malicious SVG renamed to .jpg
    const fakeFile = new File(['<svg>bad</svg>'], 'fake.jpg', { type: 'image/jpeg' })
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

    fireEvent.change(fileInput, { target: { files: [fakeFile] } })

    // Displays UPL-001 Arabic error
    expect(await screen.findByText(/نوع الملف غير مدعوم/)).toBeInTheDocument()
    expect(screen.getByText(/UPL-001/)).toBeInTheDocument()

    // Submit button remains disabled
    expect(screen.getByRole('button', { name: /تأكيد وإرسال إثبات التحويل/ })).toBeDisabled()
  })
})
