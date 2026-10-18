import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { LanguageProvider } from '@/i18n/LanguageProvider'
import NotificationBell from './components/NotificationBell'
import * as api from './api'
import type { CustomerNotification } from './types'

const mockNotifications: CustomerNotification[] = [
  {
    id: 'notif-1',
    customer_id: 'cust-1',
    type: 'wishlist_sale',
    title_ar: 'تخفيض على منتج في المفضلة',
    title_en: 'Wishlist Item On Sale',
    message_ar: 'المنتج المفضل أصبح عليه خصم 20%',
    message_en: 'Your wishlisted item is now 20% off',
    link: '/product/12',
    is_read: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'notif-2',
    customer_id: 'cust-1',
    type: 'order_approved',
    title_ar: 'تمت الموافقة على طلبك',
    title_en: 'Order Approved',
    message_ar: 'تمت الموافقة، يرجى إتمام الدفع',
    message_en: 'Your order is approved, please proceed with payment',
    link: '/pay/ord-45',
    is_read: true,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
]

function renderWithProviders(ui: React.ReactElement, initialLang: 'ar' | 'en' = 'ar') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <LanguageProvider initialLanguage={initialLang}>
        <MemoryRouter>{ui}</MemoryRouter>
      </LanguageProvider>
    </QueryClientProvider>,
  )
}

describe('NotificationBell & Notifications API (T-2.10)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(api, 'fetchCustomerNotificationsApi').mockResolvedValue(mockNotifications)
    vi.spyOn(api, 'markNotificationReadApi').mockResolvedValue()
    vi.spyOn(api, 'markAllNotificationsReadApi').mockResolvedValue()
  })

  it('renders notification bell with unread badge counter', async () => {
    renderWithProviders(<NotificationBell />, 'ar')

    // Find the bell button
    const bellBtn = await screen.findByRole('button', { name: /الإشعارات/i })
    expect(bellBtn).toBeInTheDocument()

    // 1 unread notification
    expect(await screen.findByText('1')).toBeInTheDocument()
  })

  it('opens popover when bell is clicked and displays notifications', async () => {
    renderWithProviders(<NotificationBell />, 'ar')

    const bellBtn = await screen.findByRole('button', { name: /الإشعارات/i })
    fireEvent.click(bellBtn)

    // Check popover content
    expect(await screen.findByText('تخفيض على منتج في المفضلة')).toBeInTheDocument()
    expect(screen.getByText('تمت الموافقة على طلبك')).toBeInTheDocument()
    expect(screen.getByText('المنتج المفضل أصبح عليه خصم 20%')).toBeInTheDocument()
  })

  it('calls markAllNotificationsReadApi when clicking mark all read', async () => {
    renderWithProviders(<NotificationBell />, 'en')

    const bellBtn = await screen.findByRole('button', { name: /Notifications/i })
    fireEvent.click(bellBtn)

    const markAllBtn = await screen.findByRole('button', { name: /Mark all as read/i })
    fireEvent.click(markAllBtn)

    await waitFor(() => {
      expect(api.markAllNotificationsReadApi).toHaveBeenCalledTimes(1)
    })
  })

  it('marks individual unread notification as read on click', async () => {
    renderWithProviders(<NotificationBell />, 'ar')

    const bellBtn = await screen.findByRole('button', { name: /الإشعارات/i })
    fireEvent.click(bellBtn)

    const unreadItem = await screen.findByText('تخفيض على منتج في المفضلة')
    fireEvent.click(unreadItem)

    await waitFor(() => {
      expect(api.markNotificationReadApi).toHaveBeenCalledWith('notif-1')
    })
  })

  it('renders empty message when notifications array is empty', async () => {
    vi.spyOn(api, 'fetchCustomerNotificationsApi').mockResolvedValue([])
    renderWithProviders(<NotificationBell />, 'ar')

    const bellBtn = await screen.findByRole('button', { name: /الإشعارات/i })
    fireEvent.click(bellBtn)

    expect(await screen.findByText('لا توجد إشعارات حتى الآن')).toBeInTheDocument()
  })
})
