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

describe('Legal & Policy Pages (T-7.11)', () => {
  it('renders PrivacyPage with Arabic headings, storage notice, and retention schedule', () => {
    render(
      <MemoryRouter>
        <PrivacyPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'سياسة الخصوصية' })).toBeInTheDocument()
    expect(screen.getByText(/إشعار التخزين المحلي/i)).toBeInTheDocument()
    expect(screen.getByText(/cart:v1/i)).toBeInTheDocument()
    expect(screen.getByText(/قانون حماية البيانات الشخصية المصري/i)).toBeInTheDocument()
    expect(screen.getByText(/90 يومًا بعد التسليم/i)).toBeInTheDocument()
  })

  it('renders TermsPage with Arabic headings and terms of sale', () => {
    render(
      <MemoryRouter>
        <TermsPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'الشروط والأحكام' })).toBeInTheDocument()
    expect(screen.getByText(/أهلية الشراء والتعاقد/i)).toBeInTheDocument()
    expect(screen.getByText(/الجنيه المصري/i)).toBeInTheDocument()
    expect(screen.getAllByText(/إنستاباي/i).length).toBeGreaterThan(0)
  })

  it('renders ShippingPage with carriers and delivery information', () => {
    render(
      <MemoryRouter>
        <ShippingPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'الشحن والتوصيل' })).toBeInTheDocument()
    expect(screen.getAllByText(/البريد المصري/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/مندوبو التوصيل المعتمدون/i)).toBeInTheDocument()
    expect(screen.getByText(/27 محافظة/i)).toBeInTheDocument()
  })

  it('renders ReturnsPage with 14-day return period and conditions', () => {
    render(
      <MemoryRouter>
        <ReturnsPage />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { level: 1, name: 'سياسة الاستبدال والاسترجاع' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/14 يومًا/i)).toBeInTheDocument()
    expect(screen.getByText(/قانون حماية المستهلك المصري/i)).toBeInTheDocument()
  })

  it('renders ContactPage with support channels and hours', () => {
    render(
      <MemoryRouter>
        <ContactPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'تواصل معنا' })).toBeInTheDocument()
    expect(screen.getByText('واتساب')).toBeInTheDocument()
    expect(screen.getByText('البريد الإلكتروني')).toBeInTheDocument()
    expect(screen.getByText('support@lolys.com')).toBeInTheDocument()
    expect(screen.getByText(/ساعات العمل وخدمة العملاء/i)).toBeInTheDocument()
  })

  it('Footer renders navigation links to all five legal pages', () => {
    render(
      <LanguageProvider>
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
})
