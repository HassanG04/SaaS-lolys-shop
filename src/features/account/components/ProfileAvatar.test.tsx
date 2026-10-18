import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LanguageProvider } from '@/i18n/LanguageProvider'
import { ToastProvider } from '@/components/ui/ToastProvider'
import { ProfileAvatar } from './ProfileAvatar'
import * as api from '../api'

vi.mock('../api')
vi.mock('@/lib/images', () => ({
  publicImageUrl: vi.fn(
    (path: string) => `https://test.supabase.co/storage/v1/object/public/avatars/${path}`,
  ),
}))

function renderComponent(props: {
  userId?: string
  avatarUrl?: string | null
  fullName?: string | null
  email?: string | null
  onAvatarChange?: () => void
  lang?: 'ar' | 'en'
}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <LanguageProvider initialLanguage={props.lang || 'ar'}>
        <ToastProvider>
          <ProfileAvatar
            userId={props.userId || 'u-123'}
            avatarUrl={props.avatarUrl}
            fullName={props.fullName || 'سارة أحمد'}
            email={props.email || 'sara@example.com'}
            onAvatarChange={props.onAvatarChange}
          />
        </ToastProvider>
      </LanguageProvider>
    </QueryClientProvider>,
  )
}

describe('ProfileAvatar Component (T-2.11)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders initials when no avatarUrl is provided', () => {
    renderComponent({ avatarUrl: null, fullName: 'سارة أحمد' })
    // getInitials produces uppercase first two characters
    expect(screen.getByText('سأ')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    // No remove button when no avatar
    expect(screen.queryByText('حذف الصورة')).not.toBeInTheDocument()
  })

  it('renders image when avatarUrl is provided', () => {
    renderComponent({ avatarUrl: 'u-123/avatar.webp', fullName: 'سارة أحمد' })
    const img = screen.getByRole('img')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute(
      'src',
      'https://test.supabase.co/storage/v1/object/public/avatars/u-123/avatar.webp',
    )
    expect(screen.getByText('حذف الصورة')).toBeInTheDocument()
  })

  it('renders English copy when language is set to English', () => {
    renderComponent({
      avatarUrl: 'u-123/avatar.webp',
      fullName: 'Sara Ahmed',
      lang: 'en',
    })
    expect(screen.getByText('Change Photo')).toBeInTheDocument()
    expect(screen.getByText('Remove Photo')).toBeInTheDocument()
    expect(screen.getByText(/Max size 2 MB/)).toBeInTheDocument()
  })

  it('handles photo selection and triggers upload', async () => {
    const onAvatarChange = vi.fn()
    vi.spyOn(api, 'uploadAvatarApi').mockResolvedValue('u-123/new.webp')

    renderComponent({ avatarUrl: null, onAvatarChange })

    const file = new File(['valid-jpeg-bytes'], 'avatar.jpg', {
      type: 'image/jpeg',
    })
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).toBeInTheDocument()

    await userEvent.upload(fileInput, file)

    await waitFor(() => {
      expect(api.uploadAvatarApi).toHaveBeenCalledWith('u-123', file, null)
      expect(onAvatarChange).toHaveBeenCalled()
    })
  })

  it('handles remove photo click and triggers removeAvatarApi', async () => {
    const onAvatarChange = vi.fn()
    vi.spyOn(api, 'removeAvatarApi').mockResolvedValue(undefined)

    renderComponent({
      avatarUrl: 'u-123/existing.webp',
      onAvatarChange,
    })

    const removeBtn = screen.getByText('حذف الصورة')
    await userEvent.click(removeBtn)

    await waitFor(() => {
      expect(api.removeAvatarApi).toHaveBeenCalledWith('u-123', 'u-123/existing.webp')
      expect(onAvatarChange).toHaveBeenCalled()
    })
  })
})
