/// <reference types="node" />
import { mkdirSync, writeFileSync } from 'node:fs'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { LanguageProvider, type Language } from '@/i18n/LanguageProvider'
import { AuthContext } from '@/features/auth/AuthProvider'
import type { AuthContextValue } from '@/features/auth/types'
import { CartProvider } from '@/features/cart'
import { ThemeProvider } from '@/components/ui/ThemeProvider'
import { ToggleSwitch } from '@/components/ui/ToggleSwitch'
import AdminShell from '@/features/admin/AdminShell'
import { Navbar } from './Navbar'

vi.mock('@/features/admin/AdminRoutes', () => ({
  AdminRoutes: () => (
    <div style={{ minHeight: 2400 }}>
      <h1>Workspace fixture</h1>
      <ToggleSwitch checked aria-label="Active fixture" />
      <ToggleSwitch checked={false} aria-label="Inactive fixture" />
    </div>
  ),
}))
vi.mock('@/features/admin/payments/api', () => ({ getPaymentReviewCount: async () => 0 }))
vi.mock('@/features/notifications/api', () => ({
  fetchCustomerNotificationsApi: async () => [],
  markNotificationReadApi: async () => {},
  markAllNotificationsReadApi: async () => {},
  deleteNotificationApi: async () => {},
}))

beforeEach(() => localStorage.clear())

function mount(ui: ReactNode, lang: Language, role: 'guest' | 'customer' | 'admin') {
  const auth: AuthContextValue = {
    user:
      role === 'guest' ? null : ({ id: 'fixture-user', email: 'fixture@example.invalid' } as User),
    session: null,
    profile: null,
    profileError: null,
    role: role === 'guest' ? 'customer' : role,
    aal: 'aal2',
    factors: [],
    loading: false,
    loadingFactors: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    resetPassword: vi.fn(),
    resendConfirmation: vi.fn(),
    signOut: vi.fn(),
    refreshProfile: vi.fn(),
    refreshAal: vi.fn(),
    refreshFactors: vi.fn(),
    enrollTotp: vi.fn(),
    challengeAndVerify: vi.fn(),
    unenrollFactor: vi.fn(),
    updatePassword: vi.fn(),
    updateEmail: vi.fn(),
  }
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <AuthContext.Provider value={auth}>
          <LanguageProvider initialLanguage={lang}>
            <ThemeProvider>
              <CartProvider initialItems={[]}>{ui}</CartProvider>
            </ThemeProvider>
          </LanguageProvider>
        </AuthContext.Provider>
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

// Explicit opt-in exports real rendered markup for offline compiled-CSS browser checks.
// No user session, app server or network is used by those checks.
function fixture(name: string, container: HTMLElement) {
  if (process.env.EXPORT_UI_FIXTURES !== '1') return
  mkdirSync('.tools/layout-fixtures', { recursive: true })
  // nosemgrep: lolys-no-inner-html
  writeFileSync(`.tools/layout-fixtures/${name}.html`, container.innerHTML)
}

for (const lang of ['ar', 'en'] as const) {
  for (const role of ['guest', 'customer', 'admin'] as const) {
    test(`${lang}: social links are available to ${role}, with named icons and exact destinations`, async () => {
      const user = userEvent.setup()
      const { container } = mount(<Navbar />, lang, role)
      await user.click(
        screen.getByRole('button', {
          name: lang === 'ar' ? 'فتح القائمة الرئيسية' : 'Open main menu',
        }),
      )
      const menu = await screen.findByRole('menu')
      const links = [
        ['TikTok', 'https://www.tiktok.com/@lolys_11?_r=1'],
        ['Instagram', 'https://www.instagram.com/11_lolys_11'],
        [
          lang === 'ar' ? 'تواصل معنا!' : 'Chat with us!',
          'https://chat.whatsapp.com/BtoioO8A1SvA5TaSREHPJs?s=cl&p=i&ilr=4&iam=2',
        ],
      ]
      for (const [name, url] of links) {
        const link = within(menu).getByRole('menuitem', { name })
        expect(link).toHaveAttribute('href', url)
        expect(link).toHaveAttribute('rel', 'noopener noreferrer')
        expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
      }
      if (role !== 'guest')
        expect(
          within(menu).getByRole('menuitem', { name: lang === 'ar' ? 'طلباتي' : 'My Orders' }),
        ).toHaveAttribute('href', '/account/orders')

      if (role === 'admin') {
        const adminHeaderLink = screen.getByRole('link', {
          name: lang === 'ar' ? 'لوحة التحكم' : 'Dashboard',
        })
        expect(adminHeaderLink).toHaveAttribute('href', '/admin')
      } else {
        expect(
          screen.queryByRole('link', {
            name: lang === 'ar' ? 'لوحة التحكم' : 'Dashboard',
          }),
        ).not.toBeInTheDocument()
      }

      fixture(`${lang}-store-${role}`, container)
      await user.keyboard('{Escape}')
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })
  }

  test(`${lang}: mobile drawer and desktop collapse stay independently operable`, async () => {
    const user = userEvent.setup()
    const { container } = mount(<AdminShell />, lang, 'admin')
    await screen.findByRole('heading', { name: 'Workspace fixture' })
    fixture(`${lang}-admin`, container)
    await user.click(
      screen.getByRole('button', {
        name: lang === 'ar' ? 'طي الشريط الجانبي' : 'Collapse sidebar',
      }),
    )
    fixture(`${lang}-admin-collapsed`, container)
    const toggle = screen.getByRole('button', {
      name: lang === 'ar' ? 'قائمة لوحة التحكم' : 'Admin menu',
    })
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('id', 'admin-mobile-sidebar')
    await user.click(
      within(dialog).getByRole('button', {
        name: lang === 'ar' ? 'إغلاق النافذة' : 'Close dialog',
      }),
    )
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(
      screen.getByRole('button', {
        name: lang === 'ar' ? 'توسيع الشريط الجانبي' : 'Expand sidebar',
      }),
    ).toHaveAttribute('aria-expanded', 'false')
  })
}
