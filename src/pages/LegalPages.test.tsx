import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PrivacyPage from './PrivacyPage'
import TermsPage from './TermsPage'
import ShippingPage from './ShippingPage'
import ReturnsPage from './ReturnsPage'
import ContactPage from './ContactPage'
import { Footer } from '../components/layout/Footer'
import { LanguageProvider } from '../i18n/LanguageProvider'

describe('Legal & Policy Pages (T-7.11 & T-3.12)', () => {
  describe('Arabic (Default)', () => {
    it('renders PrivacyPage with Arabic headings, storage notice, and retention schedule', () => {
      render(
        <LanguageProvider initialLanguage="ar">
          <MemoryRouter>
            <PrivacyPage />
          </MemoryRouter>
        </LanguageProvider>,
      )

      expect(screen.getByRole('heading', { level: 1, name: 'سياسة الخصوصية' })).toBeInTheDocument()
      expect(screen.getByText(/إشعار التخزين المحلي/i)).toBeInTheDocument()
      expect(screen.getByText(/cart:v1/i)).toBeInTheDocument()
      expect(screen.getByText(/قانون حماية البيانات الشخصية المصري/i)).toBeInTheDocument()
      expect(screen.getByText(/90 يومًا بعد التسليم/i)).toBeInTheDocument()
    })

    it('renders TermsPage with Arabic headings and terms of sale', () => {
      render(
        <LanguageProvider initialLanguage="ar">
          <MemoryRouter>
            <TermsPage />
          </MemoryRouter>
        </LanguageProvider>,
      )

      expect(screen.getByRole('heading', { level: 1, name: 'الشروط والأحكام' })).toBeInTheDocument()
      expect(screen.getByText(/أهلية الشراء والتعاقد/i)).toBeInTheDocument()
      expect(screen.getByText(/الجنيه المصري/i)).toBeInTheDocument()
      expect(screen.getAllByText(/إنستاباي/i).length).toBeGreaterThan(0)
    })

    it('renders ShippingPage with carriers and delivery information', () => {
      render(
        <LanguageProvider initialLanguage="ar">
          <MemoryRouter>
            <ShippingPage />
          </MemoryRouter>
        </LanguageProvider>,
      )

      expect(screen.getByRole('heading', { level: 1, name: 'الشحن والتوصيل' })).toBeInTheDocument()
      expect(screen.getAllByText(/البريد المصري/i).length).toBeGreaterThan(0)
      expect(screen.getByText(/مندوبو التوصيل المعتمدون/i)).toBeInTheDocument()
      expect(screen.getByText(/27 محافظة/i)).toBeInTheDocument()
    })

    it('renders ReturnsPage with 14-day return period and conditions', () => {
      render(
        <LanguageProvider initialLanguage="ar">
          <MemoryRouter>
            <ReturnsPage />
          </MemoryRouter>
        </LanguageProvider>,
      )

      expect(
        screen.getByRole('heading', { level: 1, name: 'سياسة الاستبدال والاسترجاع' }),
      ).toBeInTheDocument()
      expect(screen.getByText(/14 يومًا/i)).toBeInTheDocument()
      expect(screen.getByText(/قانون حماية المستهلك المصري/i)).toBeInTheDocument()
    })

    it('renders ContactPage with support channels and hours', () => {
      render(
        <LanguageProvider initialLanguage="ar">
          <MemoryRouter>
            <ContactPage />
          </MemoryRouter>
        </LanguageProvider>,
      )

      expect(screen.getByRole('heading', { level: 1, name: 'تواصل معنا' })).toBeInTheDocument()
      expect(screen.getByText('واتساب')).toBeInTheDocument()
      expect(screen.getByText('البريد الإلكتروني')).toBeInTheDocument()
      expect(screen.getByText('support@lolys.com')).toBeInTheDocument()
      expect(screen.getByText(/ساعات العمل وخدمة العملاء/i)).toBeInTheDocument()
    })
  })

  describe('English (T-3.12)', () => {
    it('renders PrivacyPage with full English body, storage notice, and retention schedule', () => {
      render(
        <LanguageProvider initialLanguage="en">
          <MemoryRouter>
            <PrivacyPage />
          </MemoryRouter>
        </LanguageProvider>,
      )

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
      render(
        <LanguageProvider initialLanguage="en">
          <MemoryRouter>
            <TermsPage />
          </MemoryRouter>
        </LanguageProvider>,
      )

      expect(
        screen.getByRole('heading', { level: 1, name: 'Terms & Conditions' }),
      ).toBeInTheDocument()
      expect(screen.getByText(/Purchasing Eligibility & Contracting/i)).toBeInTheDocument()
      expect(screen.getByText(/Egyptian Pounds \(EGP\)/i)).toBeInTheDocument()
      expect(screen.getAllByText(/InstaPay/i).length).toBeGreaterThan(0)
      expect(screen.queryByText('الشروط والأحكام')).not.toBeInTheDocument()
    })

    it('renders ShippingPage with English carriers and delivery zones', () => {
      render(
        <LanguageProvider initialLanguage="en">
          <MemoryRouter>
            <ShippingPage />
          </MemoryRouter>
        </LanguageProvider>,
      )

      expect(
        screen.getByRole('heading', { level: 1, name: 'Shipping & Delivery' }),
      ).toBeInTheDocument()
      expect(screen.getAllByText(/Egypt Post/i).length).toBeGreaterThan(0)
      expect(screen.getByText(/Direct Couriers/i)).toBeInTheDocument()
      expect(screen.getByText(/27 governorates/i)).toBeInTheDocument()
      expect(screen.queryByText('الشحن والتوصيل')).not.toBeInTheDocument()
    })

    it('renders ReturnsPage with 14-day return period and conditions in English', () => {
      render(
        <LanguageProvider initialLanguage="en">
          <MemoryRouter>
            <ReturnsPage />
          </MemoryRouter>
        </LanguageProvider>,
      )

      expect(
        screen.getByRole('heading', { level: 1, name: 'Return & Exchange Policy' }),
      ).toBeInTheDocument()
      expect(screen.getByText(/14 days/i)).toBeInTheDocument()
      expect(screen.getByText(/Egyptian Consumer Protection Law/i)).toBeInTheDocument()
      expect(screen.queryByText('سياسة الاستبدال والاسترجاع')).not.toBeInTheDocument()
    })

    it('renders ContactPage with English channels, support hours, and tips', () => {
      render(
        <LanguageProvider initialLanguage="en">
          <MemoryRouter>
            <ContactPage />
          </MemoryRouter>
        </LanguageProvider>,
      )

      expect(screen.getByRole('heading', { level: 1, name: 'Contact Us' })).toBeInTheDocument()
      expect(screen.getByText('WhatsApp')).toBeInTheDocument()
      expect(screen.getByText('Email Support')).toBeInTheDocument()
      expect(screen.getByText('support@lolys.com')).toBeInTheDocument()
      expect(screen.getByText(/Working Hours & Customer Service/i)).toBeInTheDocument()
      expect(screen.queryByText('تواصل معنا')).not.toBeInTheDocument()
    })
  })

  it('Footer renders navigation links in Arabic when initialLanguage is ar', () => {
    render(
      <LanguageProvider initialLanguage="ar">
        <MemoryRouter>
          <Footer />
        </MemoryRouter>
      </LanguageProvider>,
    )

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
    render(
      <LanguageProvider initialLanguage="en">
        <MemoryRouter>
          <Footer />
        </MemoryRouter>
      </LanguageProvider>,
    )

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
})
