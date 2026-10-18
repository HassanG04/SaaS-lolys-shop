import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session, User } from '@supabase/supabase-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { supabase } from '../../lib/supabase'
import * as authApi from '../auth/api'
import { getAuthMessage } from '../auth/authErrors'
import type { MfaFactor } from '../auth/types'
import * as loader from '../../lib/adminLoader'

describe('Admin shell and access control (T-5.01)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function mockUserSession(options: {
    role: 'customer' | 'admin'
    aal?: 'aal1' | 'aal2'
    factors?: MfaFactor[]
    email?: string
  }) {
    const { role, aal = 'aal1', factors = [], email = 'user@example.com' } = options
    const mockUser = { id: 'user-456', email } as unknown as User
    const mockSession = { user: mockUser } as unknown as Session

    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: { session: mockSession },
      error: null,
    })
    vi.spyOn(supabase.auth, 'onAuthStateChange').mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn(), id: 'sub-1', callback: vi.fn() } },
    } as unknown as ReturnType<typeof supabase.auth.onAuthStateChange>)

    vi.spyOn(authApi, 'fetchProfileApi').mockResolvedValue({
      id: 'user-456',
      role,
      full_name: 'Test User',
      phone: null,
      governorate_id: null,
    })

    vi.spyOn(authApi, 'fetchAalApi').mockResolvedValue(aal)
    vi.spyOn(authApi, 'fetchFactorsApi').mockResolvedValue(factors)
  }

  describe('Authorization gates and chunk loading', () => {
    it('customer opening /admin sees the 403 view (AUTH-011) and the admin chunk is not downloaded', async () => {
      mockUserSession({ role: 'customer' })
      const loaderSpy = vi.spyOn(loader, 'adminChunkLoader')

      render(<App initialEntries={['/admin']} />)

      // 403 view with AUTH-011 displayed
      expect(await screen.findByText(getAuthMessage('AUTH-011'))).toBeInTheDocument()
      expect(screen.getByText('AUTH-011')).toBeInTheDocument()

      // The lazy admin chunk must NOT have been downloaded
      expect(loaderSpy).not.toHaveBeenCalled()

      // Admin layout elements are not rendered
      expect(screen.queryByRole('aside', { name: 'شريط لوحة التحكم' })).not.toBeInTheDocument()
      expect(screen.queryByText('المنتجات')).not.toBeInTheDocument()
    })

    it('customer opening nested /admin/products is also denied and does not download admin chunk', async () => {
      mockUserSession({ role: 'customer' })
      const loaderSpy = vi.spyOn(loader, 'adminChunkLoader')

      render(<App initialEntries={['/admin/products']} />)

      expect(await screen.findByText(getAuthMessage('AUTH-011'))).toBeInTheDocument()
      expect(loaderSpy).not.toHaveBeenCalled()
    })

    it('unauthenticated guest opening /admin is redirected to login and does not download admin chunk', async () => {
      vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
        data: { session: null },
        error: null,
      })
      vi.spyOn(supabase.auth, 'onAuthStateChange').mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn(), id: 'sub-2', callback: vi.fn() } },
      } as unknown as ReturnType<typeof supabase.auth.onAuthStateChange>)

      const loaderSpy = vi.spyOn(loader, 'adminChunkLoader')

      render(<App initialEntries={['/admin']} />)

      expect(await screen.findByRole('heading', { name: 'تسجيل الدخول' })).toBeInTheDocument()
      expect(loaderSpy).not.toHaveBeenCalled()
    })

    it('admin at aal1 with enrolled factor is sent to MFA challenge showing ADM-002, and chunk is not downloaded', async () => {
      mockUserSession({
        role: 'admin',
        aal: 'aal1',
        factors: [
          {
            id: 'factor-1',
            factor_type: 'totp',
            status: 'verified',
            friendly_name: 'Admin Authenticator',
          },
        ],
      })

      const loaderSpy = vi.spyOn(loader, 'adminChunkLoader')

      render(<App initialEntries={['/admin']} />)

      // Reaches MFA challenge screen
      expect(await screen.findByRole('heading', { name: 'التحقق بخطوتين' })).toBeInTheDocument()
      // Shows ADM-002 requirement message
      expect(screen.getByText(getAuthMessage('ADM-002'))).toBeInTheDocument()
      // Admin chunk was not downloaded
      expect(loaderSpy).not.toHaveBeenCalled()
      expect(screen.queryByRole('heading', { name: 'لوحة تحكم الإدارة' })).not.toBeInTheDocument()
    })

    it('admin at aal1 without enrolled factors is sent to MFA enroll showing ADM-002, and chunk is not downloaded', async () => {
      mockUserSession({
        role: 'admin',
        aal: 'aal1',
        factors: [],
      })

      vi.spyOn(authApi, 'enrollTotpApi').mockResolvedValue({
        data: {
          id: 'factor-enroll-1',
          type: 'totp',
          totp: {
            qr_code: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
            secret: 'SECRETKEY123456',
            uri: 'otpauth://totp/Lolys?secret=SECRETKEY123456',
          },
        },
      })

      const loaderSpy = vi.spyOn(loader, 'adminChunkLoader')

      render(<App initialEntries={['/admin']} />)

      // Reaches MFA enroll screen
      expect(
        await screen.findByRole('heading', { name: 'إعداد التحقق بخطوتين (TOTP)' }),
      ).toBeInTheDocument()
      // Displays ADM-002 alert
      expect(screen.getByText(getAuthMessage('ADM-002'))).toBeInTheDocument()
      // Admin chunk was not downloaded
      expect(loaderSpy).not.toHaveBeenCalled()
    })
  })

  describe('Admin shell layout and sidebar rail at aal2', () => {
    beforeEach(() => {
      mockUserSession({
        role: 'admin',
        aal: 'aal2',
        email: 'admin@lolys.eg',
        factors: [
          {
            id: 'factor-1',
            factor_type: 'totp',
            status: 'verified',
          },
        ],
      })
    })

    it('admin at aal2 downloads admin chunk and renders sidebar rail with Arabic labels', async () => {
      const loaderSpy = vi.spyOn(loader, 'adminChunkLoader')

      render(<App initialEntries={['/admin']} />)

      expect(
        await screen.findByRole('heading', { name: 'لوحة تحكم الإدارة' }, { timeout: 10000 }),
      ).toBeInTheDocument()

      // Lazy loader was invoked
      expect(loaderSpy).toHaveBeenCalled()

      // Sidebar navigation landmark
      const nav = screen.getByRole('navigation', { name: 'لوحة التحكم' })
      expect(nav).toBeInTheDocument()

      // All Arabic sidebar navigation links are present
      const expectedLinks = [
        'لوحة التحكم',
        'المنتجات',
        'الأقسام',
        'الطلبات',
        'المدفوعات',
        'التوصيل',
        'سجل العمليات',
        'التحليلات',
      ]

      for (const linkText of expectedLinks) {
        expect(screen.getAllByRole('link', { name: new RegExp(linkText) })[0]).toBeInTheDocument()
      }

      // Security assurance badge and store return link are present
      expect(screen.getByText('تحقق بخطوتين مفعّل')).toBeInTheDocument()
      expect(screen.getByText('AAL2')).toBeInTheDocument()
      expect(screen.getAllByRole('link', { name: /العودة للمتجر/ })[0]).toBeInTheDocument()

      // Active link on /admin has aria-current="page"
      const dashboardLinks = screen.getAllByRole('link', { name: new RegExp('^لوحة التحكم$') })
      expect(dashboardLinks.some((l) => l.getAttribute('aria-current') === 'page')).toBe(true)
    })

    it('toggles mobile sidebar drawer via accessible toggle button', async () => {
      const user = userEvent.setup()

      render(<App initialEntries={['/admin']} />)

      expect(await screen.findByRole('heading', { name: 'لوحة تحكم الإدارة' })).toBeInTheDocument()

      const toggleButton = screen.getByRole('button', { name: 'قائمة لوحة التحكم' })
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false')

      // Click to open mobile drawer
      await user.click(toggleButton)
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true')

      // Close button inside drawer
      const closeButton = screen.getByRole('button', { name: 'إغلاق النافذة' })
      expect(closeButton).toBeInTheDocument()

      // Click to close drawer
      await user.click(closeButton)
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false')
    })

    it('collapses and restores the desktop sidebar without navigating or signing out (T-5.13e)', async () => {
      const user = userEvent.setup()
      render(<App initialEntries={['/admin']} />)
      const collapse = await screen.findByRole('button', { name: 'طي الشريط الجانبي' })
      expect(collapse).toHaveAttribute('aria-expanded', 'true')
      await user.click(collapse)
      const expand = screen.getByRole('button', { name: 'توسيع الشريط الجانبي' })
      expect(expand).toHaveAttribute('aria-expanded', 'false')
      const sidebar = document.getElementById('admin-desktop-sidebar')
      expect(sidebar).toHaveClass('is-collapsed')
      expect(sidebar).toHaveAttribute('inert')
      await user.click(expand)
      expect(sidebar).toHaveClass('is-expanded')
      expect(sidebar).not.toHaveAttribute('inert')
      expect(screen.getByText('AAL2')).toBeInTheDocument()
    })

    it('renders inner page transition and resets inner scroll on pathname change (T-5.13e)', async () => {
      render(<App initialEntries={['/admin']} />)
      expect(await screen.findByRole('heading', { name: 'لوحة تحكم الإدارة' })).toBeInTheDocument()

      const mainContainer = document.getElementById('admin-main')
      expect(mainContainer).toBeInTheDocument()
      expect(mainContainer?.querySelector('.admin-page-transition')).toBeInTheDocument()
    })

    it('admin header provides store return link, theme toggle, and sign out button', async () => {
      const user = userEvent.setup()
      const signOutSpy = vi.spyOn(supabase.auth, 'signOut').mockResolvedValue({ error: null })

      render(<App initialEntries={['/admin']} />)

      expect(await screen.findByRole('heading', { name: 'لوحة تحكم الإدارة' })).toBeInTheDocument()

      // User email displayed in header
      expect(screen.getByText('admin@lolys.eg')).toBeInTheDocument()

      // Sign out button
      const logoutBtn = screen.getByRole('button', { name: 'تسجيل الخروج' })
      await user.click(logoutBtn)

      await waitFor(() => {
        expect(signOutSpy).toHaveBeenCalled()
      })
    })
  })
})
