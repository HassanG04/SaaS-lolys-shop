import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LanguageProvider, useLanguage } from '../../i18n/LanguageProvider'
import { ThemeProvider } from '../../components/ui/ThemeProvider'
import { useSeo, formatDocumentTitle, BRAND_NAME } from './index'
import { Layout } from '../../components/layout/Layout'

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>{ui}</LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  )
}

function TestSeoConsumer({
  title,
  description,
  image,
  type,
  noindex,
}: {
  title?: string
  description?: string
  image?: string
  type?: string
  noindex?: boolean
}) {
  useSeo({ title, description, image, type, noindex })
  return <div data-testid="consumer">SEO Consumer</div>
}

function TestLanguageSwitch() {
  const { setLang } = useLanguage()
  return (
    <button type="button" onClick={() => setLang('en')} data-testid="switch-en">
      Switch to EN
    </button>
  )
}

describe('SEO Hook and Route Metadata (T-3.08)', () => {
  beforeEach(() => {
    document.title = BRAND_NAME
    document.documentElement.lang = 'ar'
    document.documentElement.dir = 'rtl'
    // Clear dynamically added meta tags
    const metas = document.head.querySelectorAll(
      'meta[property], meta[name="description"], meta[name="robots"], meta[name^="twitter"]',
    )
    metas.forEach((m) => m.remove())
  })

  it('formatDocumentTitle formats titles correctly', () => {
    expect(formatDocumentTitle()).toBe(BRAND_NAME)
    expect(formatDocumentTitle('')).toBe(BRAND_NAME)
    expect(formatDocumentTitle(BRAND_NAME)).toBe(BRAND_NAME)
    expect(formatDocumentTitle('عن المتجر')).toBe(`عن المتجر | ${BRAND_NAME}`)
    expect(formatDocumentTitle('  About Us  ')).toBe(`About Us | ${BRAND_NAME}`)
  })

  it('useSeo sets document.title and Open Graph/Twitter meta tags', () => {
    render(
      <TestSeoConsumer
        title="عن المتجر"
        description="تفاصيل المتجر وقصته"
        image="/custom-img.png"
        type="article"
      />,
    )

    expect(document.title).toBe(`عن المتجر | ${BRAND_NAME}`)

    const desc = document.head.querySelector('meta[name="description"]')?.getAttribute('content')
    expect(desc).toBe('تفاصيل المتجر وقصته')

    const ogTitle = document.head
      .querySelector('meta[property="og:title"]')
      ?.getAttribute('content')
    expect(ogTitle).toBe(`عن المتجر | ${BRAND_NAME}`)

    const ogDesc = document.head
      .querySelector('meta[property="og:description"]')
      ?.getAttribute('content')
    expect(ogDesc).toBe('تفاصيل المتجر وقصته')

    const ogType = document.head.querySelector('meta[property="og:type"]')?.getAttribute('content')
    expect(ogType).toBe('article')

    const ogImage = document.head
      .querySelector('meta[property="og:image"]')
      ?.getAttribute('content')
    expect(ogImage).toBe('/custom-img.png')

    const ogSite = document.head
      .querySelector('meta[property="og:site_name"]')
      ?.getAttribute('content')
    expect(ogSite).toBe(BRAND_NAME)

    const twTitle = document.head
      .querySelector('meta[name="twitter:title"]')
      ?.getAttribute('content')
    expect(twTitle).toBe(`عن المتجر | ${BRAND_NAME}`)

    const twCard = document.head.querySelector('meta[name="twitter:card"]')?.getAttribute('content')
    expect(twCard).toBe('summary_large_image')
  })

  it('useSeo manages robots noindex tag correctly', () => {
    const { rerender } = render(<TestSeoConsumer title="صفحة خاصة" noindex={true} />)

    const robotsMeta = document.head.querySelector('meta[name="robots"]')
    expect(robotsMeta?.getAttribute('content')).toBe('noindex, nofollow')

    rerender(<TestSeoConsumer title="صفحة عامة" noindex={false} />)
    const afterRobots = document.head.querySelector('meta[name="robots"]')
    expect(afterRobots).toBeNull()
  })

  const routesToTest = [
    { path: '/', expectedTitle: `الرئيسية | ${BRAND_NAME}` },
    { path: '/category/hair', expectedTitle: `التشكيلات | ${BRAND_NAME}` },
    { path: '/product/item-1', expectedTitle: `المنتج | ${BRAND_NAME}` },
    { path: '/cart', expectedTitle: `سلة التسوق | ${BRAND_NAME}` },
    { path: '/login', expectedTitle: `تسجيل الدخول | ${BRAND_NAME}` },
    { path: '/register', expectedTitle: `إنشاء حساب | ${BRAND_NAME}` },
    { path: '/reset-password', expectedTitle: `استعادة كلمة المرور | ${BRAND_NAME}` },
    { path: '/resend-confirmation', expectedTitle: `إعادة إرسال تأكيد الحساب | ${BRAND_NAME}` },
    { path: '/checkout', expectedTitle: `إتمام الطلب | ${BRAND_NAME}` },
    { path: '/pay/ord-123', expectedTitle: `دفع الطلب | ${BRAND_NAME}` },
    { path: '/account/orders', expectedTitle: `طلباتي | ${BRAND_NAME}` },
    { path: '/account/security', expectedTitle: `أمان الحساب | ${BRAND_NAME}` },
    { path: '/account/mfa/enroll', expectedTitle: `إعداد التحقق بخطوتين | ${BRAND_NAME}` },
    { path: '/mfa/challenge', expectedTitle: `تأكيد الهوية | ${BRAND_NAME}` },
    { path: '/admin/mfa/enroll', expectedTitle: `إعداد التحقق بخطوتين - الإدارة | ${BRAND_NAME}` },
    { path: '/admin/mfa/challenge', expectedTitle: `تأكيد الهوية - الإدارة | ${BRAND_NAME}` },
    { path: '/admin', expectedTitle: `لوحة التحكم | ${BRAND_NAME}` },
    { path: '/about', expectedTitle: `عن المتجر | ${BRAND_NAME}` },
    { path: '/terms', expectedTitle: `الشروط والأحكام | ${BRAND_NAME}` },
    { path: '/privacy', expectedTitle: `سياسة الخصوصية | ${BRAND_NAME}` },
    { path: '/returns', expectedTitle: `سياسة الاستبدال والاسترجاع | ${BRAND_NAME}` },
    { path: '/shipping', expectedTitle: `الشحن والتوصيل | ${BRAND_NAME}` },
    { path: '/unmatched-404', expectedTitle: `الصفحة غير موجودة | ${BRAND_NAME}` },
  ]

  routesToTest.forEach(({ path: testPath, expectedTitle }) => {
    it(`changes title for route: ${testPath}`, () => {
      renderWithProviders(
        <MemoryRouter initialEntries={[testPath]}>
          <Layout />
        </MemoryRouter>,
      )

      expect(document.title).toBe(expectedTitle)
    })
  })

  it('updates title and meta locale when language changes', async () => {
    renderWithProviders(
      <MemoryRouter initialEntries={['/about']}>
        <Layout />
        <TestLanguageSwitch />
      </MemoryRouter>,
    )

    expect(document.title).toBe(`عن المتجر | ${BRAND_NAME}`)

    const btn = screen.getByTestId('switch-en')
    await act(async () => {
      btn.click()
    })

    expect(document.title).toBe(`About Us | ${BRAND_NAME}`)
  })
})
