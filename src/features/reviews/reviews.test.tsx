import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  normalizeArabicText,
  containsProfanity,
  cleanProfanity,
  findProfanities,
} from './profanity'
import { StarRating } from './components/StarRating'
import { ReviewForm } from './components/ReviewForm'
import { LanguageProvider } from '@/i18n/LanguageProvider'
import { ToastProvider } from '@/components/ui/ToastProvider'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <ToastProvider>{ui}</ToastProvider>
      </LanguageProvider>
    </QueryClientProvider>,
  )
}

describe('Profanity Detector & Normalizer', () => {
  it('normalizes Arabic diacritics and character variants', () => {
    // Tashkeel removal and Alef normalization
    expect(normalizeArabicText('شَرْمُوطٌ')).toBe('شرموط')
    expect(normalizeArabicText('أَحْمَدْ')).toBe('احمد')
    expect(normalizeArabicText('إِسْرَاء')).toBe('اسراء')
    expect(normalizeArabicText('مُصْطَفَى')).toBe('مصطفي')
  })

  it('collapses repeated characters used for evasion', () => {
    expect(normalizeArabicText('كككككس')).toBe('كس')
    expect(normalizeArabicText('fuuuuuck')).toBe('fuck')
  })

  it('detects English curse words correctly', () => {
    expect(containsProfanity('This product is fuck')).toBe(true)
    expect(containsProfanity('what a piece of shit')).toBe(true)
    expect(containsProfanity('Great product and fast delivery')).toBe(false)
  })

  it('detects Arabic curse words correctly', () => {
    expect(containsProfanity('منتج زبالة يا شرموط')).toBe(true)
    expect(containsProfanity('يا ابن الكلب')).toBe(true)
    expect(containsProfanity('سلسلة رائعة وتغليف ممتاز')).toBe(false)
  })

  it('cleans curse words by replacing them with asterisks', () => {
    const raw = 'this is a fuck test'
    const cleaned = cleanProfanity(raw)
    expect(cleaned).toContain('***')
    expect(cleaned).not.toContain('fuck')
  })

  it('returns list of detected profanities for UI alerts', () => {
    const detected = findProfanities('bad shit and fuck')
    expect(detected).toContain('shit')
    expect(detected).toContain('fuck')
  })
})

describe('StarRating Component', () => {
  it('renders 5 stars with proper accessible labels', () => {
    render(<StarRating value={4} readOnly />)
    const ratingGroup = screen.getByRole('img', { name: /4 من 5 نجوم/i })
    expect(ratingGroup).toBeInTheDocument()
  })

  it('allows clicking stars in interactive mode', () => {
    const handleChange = vi.fn()
    render(<StarRating value={3} onChange={handleChange} />)
    const star5 = screen.getByRole('radio', { name: /5 نجوم/i })
    fireEvent.click(star5)
    expect(handleChange).toHaveBeenCalledWith(5)
  })
})

describe('ReviewForm Profanity Protection', () => {
  it('displays live protection alert when curse words are typed', () => {
    renderWithProviders(<ReviewForm productId={1} />)

    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'This is a piece of shit' } })

    // Profanity warning alert should be rendered
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(
      screen.getByText(/نظام الحماية: تم اكتشاف كلمات غير لائقة في النص!/i),
    ).toBeInTheDocument()

    // Submit button should be disabled
    const submitBtn = screen.getByRole('button', { name: /نشر التقييم/i })
    expect(submitBtn).toBeDisabled()
  })

  it('cleans curse words when clean button is clicked', () => {
    renderWithProviders(<ReviewForm productId={1} />)

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: 'bad shit' } })

    const cleanBtn = screen.getByRole('button', {
      name: /استبدال الكلمات غير اللائقة بـ \(\*\*\*\)/i,
    })
    fireEvent.click(cleanBtn)

    expect(textarea.value).toBe('bad ***')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
