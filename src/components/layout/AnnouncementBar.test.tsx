import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LanguageProvider } from '@/i18n/LanguageProvider'
import AnnouncementBar from './AnnouncementBar'
import * as settingsHooks from '@/features/settings/hooks'

function renderBar(language: 'ar' | 'en' = 'ar') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <LanguageProvider initialLanguage={language}>
          <AnnouncementBar />
        </LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AnnouncementBar (Soft Maintenance / Notices)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when QueryClientProvider is missing', () => {
    render(
      <MemoryRouter>
        <LanguageProvider initialLanguage="ar">
          <AnnouncementBar />
        </LanguageProvider>
      </MemoryRouter>,
    )
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
  })

  it('renders nothing when no announcement is configured', () => {
    vi.spyOn(settingsHooks, 'usePublicSettings').mockReturnValue({
      data: { announcement_ar: '', storefront_content: {} },
    } as unknown as ReturnType<typeof settingsHooks.usePublicSettings>)

    renderBar()
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
  })

  it('renders announcement from settings.announcement_ar', () => {
    vi.spyOn(settingsHooks, 'usePublicSettings').mockReturnValue({
      data: {
        announcement_ar: 'تنبيه: نجري صيانة ليلية من 2 إلى 3 صباحًا',
        storefront_content: {},
      },
    } as unknown as ReturnType<typeof settingsHooks.usePublicSettings>)

    renderBar('ar')
    const bar = screen.getByRole('region', { name: 'إعلان المتجر' })
    expect(bar).toBeInTheDocument()
    expect(bar).toHaveTextContent('تنبيه: نجري صيانة ليلية من 2 إلى 3 صباحًا')
  })

  it('renders bilingual announcement from storefront_content and switches with language', () => {
    vi.spyOn(settingsHooks, 'usePublicSettings').mockReturnValue({
      data: {
        announcement_ar: 'إعلان قديم',
        storefront_content: {
          announcement_ar: 'خصومات موسمية تصل إلى 30%',
          announcement_en: 'Seasonal discounts up to 30%',
        },
      },
    } as unknown as ReturnType<typeof settingsHooks.usePublicSettings>)

    const { rerender } = renderBar('ar')
    expect(screen.getByText('خصومات موسمية تصل إلى 30%')).toBeInTheDocument()

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    rerender(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <LanguageProvider key="en" initialLanguage="en">
            <AnnouncementBar />
          </LanguageProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(screen.getByText('Seasonal discounts up to 30%')).toBeInTheDocument()
    expect(screen.queryByText('خصومات موسمية تصل إلى 30%')).not.toBeInTheDocument()
  })
})
