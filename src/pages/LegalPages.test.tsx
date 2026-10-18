import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import PrivacyPage from './PrivacyPage'
import TermsPage from './TermsPage'
import ShippingPage from './ShippingPage'
import ReturnsPage from './ReturnsPage'
import ContactPage from './ContactPage'
import { Footer } from '../components/layout/Footer'
import { LanguageProvider, type Language } from '../i18n/LanguageProvider'
import * as settingsHooks from '../features/settings/hooks'

function renderWithProviders(ui: React.ReactElement, initialLanguage: Language = 'ar') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <LanguageProvider initialLanguage={initialLanguage}>
        <MemoryRouter>{ui}</MemoryRouter>
      </LanguageProvider>
    </QueryClientProvider>,
  )
}

describe('Legal & Policy Pages (T-7.11 & T-3.12)', () => {
  beforeEach(() => {
    vi.spyOn(settingsHooks, 'usePublicSettings').mockReturnValue({
      data: { storefront_content: {} },
    } as unknown as ReturnType<typeof settingsHooks.usePublicSettings>)
  })

  describe('Arabic (Default)', () => {
    it('renders PrivacyPage with Arabic headings, storage notice, and retention schedule', () => {
      renderWithProviders(<PrivacyPage />, 'ar')

      expect(screen.getByRole('heading', { level: 1, name: 'سياسة الخصوصية' })).toBeInTheDocument()
      expect(screen.getByText(/إشعار التخزين المحلي/i)).toBeInTheDocument()
      expect(screen.getByText(/cart:v1/i)).toBeInTheDocument()
      expect(screen.getByText(/قانون حماية البيانات الشخصية المصري/i)).toBeInTheDocument()
      expect(screen.getByText(/90 يومًا بعد التسليم/i)).toBeInTheDocument()
    })

    it('renders TermsPage with Arabic headings and terms of sale', () => {
      renderWithProviders(<TermsPage />, 'ar')

      expect(screen.getByRole('heading', { level: 1, name: 'الشروط والأحكام' })).toBeInTheDocument()
      expect(screen.getByText(/أهلية الشراء والتعاقد/i)).toBeInTheDocument()
      expect(screen.getByText(/الجنيه المصري/i)).toBeInTheDocument()
      expect(screen.getAllByText(/إنستاباي/i).length).toBeGreaterThan(0)
    })

    it('renders ShippingPage with carriers and delivery information', () => {
      renderWithProviders(<ShippingPage />, 'ar')

      expect(screen.getByRole('heading', { level: 1, name: 'الشحن والتوصيل' })).toBeInTheDocument()
      expect(screen.getAllByText(/البريد المصري/i).length).toBeGreaterThan(0)
      expect(screen.getByText(/مندوبو التوصيل المعتمدون/i)).toBeInTheDocument()
      expect(screen.getByText(/27 محافظة/i)).toBeInTheDocument()
    })

    it('renders ReturnsPage with 14-day return period and conditions', () => {
      renderWithProviders(<ReturnsPage />, 'ar')

      expect(
        screen.getByRole('heading', { level: 1, name: 'سياسة الاستبدال والاسترجاع' }),
      ).toBeInTheDocument()
      expect(screen.getByText(/14 يومًا/i)).toBeInTheDocument()
      expect(screen.getByText(/قانون حماية المستهلك المصري/i)).toBeInTheDocument()
    })

    it('renders ContactPage with support channels and hours', () => {
      renderWithProviders(<ContactPage />, 'ar')

      expect(screen.getByRole('heading', { level: 1, name: 'تواصل معنا' })).toBeInTheDocument()
      expect(screen.getByText('واتساب')).toBeInTheDocument()
      expect(screen.getByText('البريد الإلكتروني')).toBeInTheDocument()
      expect(screen.getByText('support@lolys.com')).toBeInTheDocument()
      expect(screen.getByText(/ساعات العمل وخدمة العملاء/i)).toBeInTheDocument()
    })
  })

  describe('English (T-3.12)', () => {
    it('renders PrivacyPage with full English body, storage notice, and retention schedule', () => {
      renderWithProviders(<PrivacyPage />, 'en')

      expect(screen.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeInTheDocument()
      expect(screen.getByText(/Local Storage Notice & Cookies/i)).toBeInTheDocument()
      expect(screen.getByText(/cart:v1/i)).toBeInTheDocument()
      expect(
        screen.getByText(/Egyptian Personal Data Protection Law No. 151 of 2020/i),
      ).toBeInTheDocument()
      expect(screen.getByText(/90 days after delivery/i)).toBeInTheDocument()
      expect(screen.queryByText('سياسة الخصوصية')).not.toBeInTheDocument()
    })

    it('renders TermsPage with English headings and sale terms without Arabic fallback', () => {
      renderWithProviders(<TermsPage />, 'en')

      expect(
        screen.getByRole('heading', { level: 1, name: 'Terms & Conditions' }),
      ).toBeInTheDocument()
      expect(screen.getByText(/Purchasing Eligibility & Contracting/i)).toBeInTheDocument()
      expect(screen.getByText(/Egyptian Pounds \(EGP\)/i)).toBeInTheDocument()
      expect(screen.getAllByText(/InstaPay/i).length).toBeGreaterThan(0)
      expect(screen.queryByText('الشروط والأحكام')).not.toBeInTheDocument()
    })

    it('renders ShippingPage with English carriers and delivery zones', () => {
      renderWithProviders(<ShippingPage />, 'en')

      expect(
        screen.getByRole('heading', { level: 1, name: 'Shipping & Delivery' }),
      ).toBeInTheDocument()
      expect(screen.getAllByText(/Egypt Post/i).length).toBeGreaterThan(0)
      expect(screen.getByText(/Direct Couriers/i)).toBeInTheDocument()
      expect(screen.getByText(/27 governorates/i)).toBeInTheDocument()
      expect(screen.queryByText('الشحن والتوصيل')).not.toBeInTheDocument()
    })

    it('renders ReturnsPage with 14-day return period and conditions in English', () => {
      renderWithProviders(<ReturnsPage />, 'en')

      expect(
        screen.getByRole('heading', { level: 1, name: 'Return & Exchange Policy' }),
      ).toBeInTheDocument()
      expect(screen.getByText(/14 days/i)).toBeInTheDocument()
      expect(screen.getByText(/Egyptian Consumer Protection Law/i)).toBeInTheDocument()
      expect(screen.queryByText('سياسة الاستبدال والاسترجاع')).not.toBeInTheDocument()
    })

    it('renders ContactPage with English channels, support hours, and tips', () => {
      renderWithProviders(<ContactPage />, 'en')

      expect(screen.getByRole('heading', { level: 1, name: 'Contact Us' })).toBeInTheDocument()
      expect(screen.getByText('WhatsApp')).toBeInTheDocument()
      expect(screen.getByText('Email Support')).toBeInTheDocument()
      expect(screen.getByText('support@lolys.com')).toBeInTheDocument()
      expect(screen.getByText(/Working Hours & Customer Service/i)).toBeInTheDocument()
      expect(screen.queryByText('تواصل معنا')).not.toBeInTheDocument()
    })
  })

  it('Footer renders navigation links in Arabic when initialLanguage is ar', () => {
    renderWithProviders(<Footer />, 'ar')

    expect(screen.getByRole('link', { name: 'الشروط والأحكام' })).toHaveAttribute('href', '/terms')
    expect(screen.getByRole('link', { name: 'سياسة الخصوصية' })).toHaveAttribute('href', '/privacy')
    expect(screen.getByRole('link', { name: 'سياسة الاستبدال والاسترجاع' })).toHaveAttribute(
      'href',
      '/returns',
    )
    expect(screen.getByRole('link', { name: 'الشحن والتوصيل' })).toHaveAttribute(
      'href',
      '/shipping',
    )
    expect(screen.getByRole('link', { name: 'تواصل معنا' })).toHaveAttribute('href', '/contact')
  })

  it('Footer renders navigation links in English when initialLanguage is en', () => {
    renderWithProviders(<Footer />, 'en')

    expect(screen.getByRole('link', { name: 'Terms & Conditions' })).toHaveAttribute(
      'href',
      '/terms',
    )
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy')
    expect(screen.getByRole('link', { name: 'Return & Exchange Policy' })).toHaveAttribute(
      'href',
      '/returns',
    )
    expect(screen.getByRole('link', { name: 'Shipping & Delivery' })).toHaveAttribute(
      'href',
      '/shipping',
    )
    expect(screen.getByRole('link', { name: 'Contact Us' })).toHaveAttribute('href', '/contact')
  })

  describe('T-5.15: Dynamic bilingual policy editor & footer integration', () => {
    const customContent = {
      brand_name_ar: 'متجر لوليز المخصص',
      brand_name_en: 'Custom Lolys Boutique',
      tagline_ar: 'إكسسوارات فاخرة لكل مناسبة',
      tagline_en: 'Fine accessories for every occasion',
      copyright_ar: 'جميع الحقوق محفوظة ومسجلة رسمياً',
      copyright_en: 'All rights reserved and officially registered',
      phone: '+201012345678',
      whatsapp_url: 'https://wa.me/201012345678',
      instagram_url: 'https://instagram.com/lolys_custom',
      tiktok_url: 'https://tiktok.com/@lolys_custom',
      footer_order: ['contact', 'returns', 'shipping', 'privacy', 'terms'] as const,
      terms_label_ar: 'شروط التعاقد الرسمية',
      terms_label_en: 'Official Terms of Sale',
      terms_body_ar: 'هذا النص المخصص لشروط التعاقد والبيع لعام 2026.',
      terms_body_en: 'This is the custom published terms of sale copy for 2026.',
      privacy_label_ar: 'بيان سرية البيانات',
      privacy_label_en: 'Data Confidentiality Statement',
      privacy_body_ar: 'نص سياسة الخصوصية المخصص والمدقق لحماية بيانات العملاء.',
      privacy_body_en: 'Custom audited privacy policy text protecting customer data.',
      returns_label_ar: 'ضوابط الاسترجاع المحدثة',
      returns_label_en: 'Updated Return Policy',
      returns_body_ar: 'نص سياسة الاسترجاع المخصص: الاسترجاع متاح خلال 14 يوماً وفق القانون.',
      returns_body_en: 'Custom returns policy: returns allowed within 14 days under Egyptian law.',
      shipping_label_ar: 'سياسة الشحن للمحافظات',
      shipping_label_en: 'Governorates Shipping Policy',
      shipping_body_ar: 'نص الشحن والتوصيل المخصص: التوصيل عبر البريد المصري والمندوبين.',
      shipping_body_en: 'Custom shipping text: delivery through Egypt Post and couriers.',
      contact_label_ar: 'قنوات الدعم والتواصل',
      contact_label_en: 'Support & Contact Channels',
      contact_body_ar: 'نص التواصل المخصص: تواصل مع خدمة العملاء من 10 صباحاً حتى 10 مساءً.',
      contact_body_en: 'Custom contact copy: reach our customer team 10 AM to 10 PM.',
    }

    beforeEach(() => {
      vi.spyOn(settingsHooks, 'usePublicSettings').mockReturnValue({
        data: { storefront_content: customContent },
      } as unknown as ReturnType<typeof settingsHooks.usePublicSettings>)
    })

    it('renders custom policy titles and bodies for all 5 policy routes in Arabic', () => {
      // 1. Terms
      const { unmount: u1 } = renderWithProviders(<TermsPage />, 'ar')
      expect(
        screen.getByRole('heading', { level: 1, name: 'شروط التعاقد الرسمية' }),
      ).toBeInTheDocument()
      expect(
        screen.getByText('هذا النص المخصص لشروط التعاقد والبيع لعام 2026.'),
      ).toBeInTheDocument()
      u1()

      // 2. Privacy
      const { unmount: u2 } = renderWithProviders(<PrivacyPage />, 'ar')
      expect(
        screen.getByRole('heading', { level: 1, name: 'بيان سرية البيانات' }),
      ).toBeInTheDocument()
      expect(
        screen.getByText('نص سياسة الخصوصية المخصص والمدقق لحماية بيانات العملاء.'),
      ).toBeInTheDocument()
      u2()

      // 3. Returns
      const { unmount: u3 } = renderWithProviders(<ReturnsPage />, 'ar')
      expect(
        screen.getByRole('heading', { level: 1, name: 'ضوابط الاسترجاع المحدثة' }),
      ).toBeInTheDocument()
      expect(
        screen.getByText('نص سياسة الاسترجاع المخصص: الاسترجاع متاح خلال 14 يوماً وفق القانون.'),
      ).toBeInTheDocument()
      u3()

      // 4. Shipping
      const { unmount: u4 } = renderWithProviders(<ShippingPage />, 'ar')
      expect(
        screen.getByRole('heading', { level: 1, name: 'سياسة الشحن للمحافظات' }),
      ).toBeInTheDocument()
      expect(
        screen.getByText('نص الشحن والتوصيل المخصص: التوصيل عبر البريد المصري والمندوبين.'),
      ).toBeInTheDocument()
      u4()

      // 5. Contact
      const { unmount: u5 } = renderWithProviders(<ContactPage />, 'ar')
      expect(
        screen.getByRole('heading', { level: 1, name: 'قنوات الدعم والتواصل' }),
      ).toBeInTheDocument()
      expect(
        screen.getByText('نص التواصل المخصص: تواصل مع خدمة العملاء من 10 صباحاً حتى 10 مساءً.'),
      ).toBeInTheDocument()
      u5()
    })

    it('renders custom policy titles and bodies for all 5 policy routes in English', () => {
      // 1. Terms
      const { unmount: u1 } = renderWithProviders(<TermsPage />, 'en')
      expect(
        screen.getByRole('heading', { level: 1, name: 'Official Terms of Sale' }),
      ).toBeInTheDocument()
      expect(
        screen.getByText('This is the custom published terms of sale copy for 2026.'),
      ).toBeInTheDocument()
      u1()

      // 2. Privacy
      const { unmount: u2 } = renderWithProviders(<PrivacyPage />, 'en')
      expect(
        screen.getByRole('heading', { level: 1, name: 'Data Confidentiality Statement' }),
      ).toBeInTheDocument()
      expect(
        screen.getByText('Custom audited privacy policy text protecting customer data.'),
      ).toBeInTheDocument()
      u2()

      // 3. Returns
      const { unmount: u3 } = renderWithProviders(<ReturnsPage />, 'en')
      expect(
        screen.getByRole('heading', { level: 1, name: 'Updated Return Policy' }),
      ).toBeInTheDocument()
      expect(
        screen.getByText(
          'Custom returns policy: returns allowed within 14 days under Egyptian law.',
        ),
      ).toBeInTheDocument()
      u3()

      // 4. Shipping
      const { unmount: u4 } = renderWithProviders(<ShippingPage />, 'en')
      expect(
        screen.getByRole('heading', { level: 1, name: 'Governorates Shipping Policy' }),
      ).toBeInTheDocument()
      expect(
        screen.getByText('Custom shipping text: delivery through Egypt Post and couriers.'),
      ).toBeInTheDocument()
      u4()

      // 5. Contact
      const { unmount: u5 } = renderWithProviders(<ContactPage />, 'en')
      expect(
        screen.getByRole('heading', { level: 1, name: 'Support & Contact Channels' }),
      ).toBeInTheDocument()
      expect(
        screen.getByText('Custom contact copy: reach our customer team 10 AM to 10 PM.'),
      ).toBeInTheDocument()
      u5()
    })

    it('safely escapes HTML tags and scripts without executing them', () => {
      vi.spyOn(settingsHooks, 'usePublicSettings').mockReturnValue({
        data: {
          storefront_content: {
            terms_label_ar: '<script>alert("xss")</script>الشروط الآمنة',
            terms_body_ar: '<img src=x onerror=alert(1)>نص آمن خالي من الثغرات',
          },
        },
      } as unknown as ReturnType<typeof settingsHooks.usePublicSettings>)

      renderWithProviders(<TermsPage />, 'ar')

      // Rendered as literal text node, never dangerous HTML
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        '<script>alert("xss")</script>الشروط الآمنة',
      )
      expect(
        screen.getByText(/<img src=x onerror=alert\(1\)>نص آمن خالي من الثغرات/),
      ).toBeInTheDocument()
      expect(document.querySelector('img[src="x"]')).toBeNull()
    })

    it('renders custom footer branding, labels, reordered links, and contact channels in Arabic', () => {
      renderWithProviders(<Footer />, 'ar')

      // Custom brand and tagline
      expect(screen.getByText('متجر لوليز المخصص')).toBeInTheDocument()
      expect(screen.getByText('إكسسوارات فاخرة لكل مناسبة')).toBeInTheDocument()
      expect(screen.getByText(/جميع الحقوق محفوظة ومسجلة رسمياً/)).toBeInTheDocument()

      // Contact channels
      expect(screen.getByRole('link', { name: /01012345678/ })).toHaveAttribute(
        'href',
        'tel:+201012345678',
      )
      expect(screen.getByRole('link', { name: /واتساب/ })).toHaveAttribute(
        'href',
        'https://wa.me/201012345678',
      )
      expect(screen.getByRole('link', { name: /إنستغرام/ })).toHaveAttribute(
        'href',
        'https://instagram.com/lolys_custom',
      )
      expect(screen.getByRole('link', { name: /تيك توك/ })).toHaveAttribute(
        'href',
        'https://tiktok.com/@lolys_custom',
      )

      // Reordered policy links: contact, returns, shipping, privacy, terms
      const navLinks = screen
        .getAllByRole('link')
        .filter((l) =>
          ['/contact', '/returns', '/shipping', '/privacy', '/terms'].includes(
            l.getAttribute('href') || '',
          ),
        )
      expect(navLinks.map((l) => l.getAttribute('href'))).toEqual([
        '/contact',
        '/returns',
        '/shipping',
        '/privacy',
        '/terms',
      ])
      expect(navLinks[0]).toHaveTextContent('قنوات الدعم والتواصل')
      expect(navLinks[1]).toHaveTextContent('ضوابط الاسترجاع المحدثة')
      expect(navLinks[2]).toHaveTextContent('سياسة الشحن للمحافظات')
      expect(navLinks[3]).toHaveTextContent('بيان سرية البيانات')
      expect(navLinks[4]).toHaveTextContent('شروط التعاقد الرسمية')
    })

    it('renders custom footer branding, labels, and contact channels in English', () => {
      renderWithProviders(<Footer />, 'en')

      expect(screen.getByText('Custom Lolys Boutique')).toBeInTheDocument()
      expect(screen.getByText('Fine accessories for every occasion')).toBeInTheDocument()
      expect(screen.getByText(/All rights reserved and officially registered/)).toBeInTheDocument()

      const navLinks = screen
        .getAllByRole('link')
        .filter((l) =>
          ['/contact', '/returns', '/shipping', '/privacy', '/terms'].includes(
            l.getAttribute('href') || '',
          ),
        )
      expect(navLinks[0]).toHaveTextContent('Support & Contact Channels')
      expect(navLinks[1]).toHaveTextContent('Updated Return Policy')
      expect(navLinks[2]).toHaveTextContent('Governorates Shipping Policy')
      expect(navLinks[3]).toHaveTextContent('Data Confidentiality Statement')
      expect(navLinks[4]).toHaveTextContent('Official Terms of Sale')
    })
  })
})
