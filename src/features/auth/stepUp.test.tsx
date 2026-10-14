import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session, User } from '@supabase/supabase-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '../../lib/supabase'
import { LanguageProvider } from '../../i18n/LanguageProvider'
import * as api from './api'
import { getAuthMessage } from './authErrors'
import { AuthProvider } from './AuthProvider'
import { StepUpDialog } from './StepUpDialog'
import { clearStepUpMemory, isStepUpActive, setStepUpConfirmedMemory, useStepUp } from './useStepUp'

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <AuthProvider>{children}</AuthProvider>
    </LanguageProvider>
  )
}

describe('Step-up confirmation (T-2.09)', () => {
  const mockUser: User = {
    id: 'admin-step-123',
    email: 'admin@lolys.com',
    app_metadata: {},
    user_metadata: { full_name: 'Admin' },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  }

  const mockSession: Session = {
    access_token: 'fake-jwt',
    refresh_token: 'fake-refresh',
    expires_in: 3600,
    token_type: 'bearer',
    user: mockUser,
  }

  function mockAdminWithFactor() {
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: { session: mockSession },
      error: null,
    })
    vi.spyOn(supabase.auth, 'onAuthStateChange').mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn(), id: '1', callback: vi.fn() } },
    } as unknown as ReturnType<typeof supabase.auth.onAuthStateChange>)

    vi.spyOn(api, 'fetchProfileApi').mockResolvedValue({
      id: 'admin-step-123',
      role: 'admin',
      full_name: 'Admin',
      phone: null,
      governorate_id: null,
    })
    vi.spyOn(api, 'fetchAalApi').mockResolvedValue('aal2')
    vi.spyOn(api, 'fetchFactorsApi').mockResolvedValue([
      {
        id: 'factor-totp-1',
        factor_type: 'totp',
        status: 'verified',
        friendly_name: 'Admin TOTP',
      },
    ])
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    clearStepUpMemory()

    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute('open', '')
    })
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.removeAttribute('open')
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
    clearStepUpMemory()
  })

  it('isStepUpActive expires after 5 minutes and is strictly in-memory', () => {
    vi.useFakeTimers()

    expect(isStepUpActive()).toBe(false)
    setStepUpConfirmedMemory()
    expect(isStepUpActive()).toBe(true)

    // Storage check: must NEVER write confirmation to localStorage or sessionStorage
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)

    // Advance 4 minutes and 59 seconds: still valid
    act(() => {
      vi.advanceTimersByTime(4 * 60 * 1000 + 59 * 1000)
    })
    expect(isStepUpActive()).toBe(true)

    // Advance 2 more seconds (total 5m 01s): expired
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(isStepUpActive()).toBe(false)

    // Storage remains completely untouched
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
  })

  it('useStepUp hook opens dialog and executes action upon verification', async () => {
    const user = userEvent.setup()
    mockAdminWithFactor()

    const challengeSpy = vi.spyOn(api, 'challengeAndVerifyApi').mockResolvedValue({
      success: true,
    })

    const actionMock = vi.fn()

    function SensitiveActionComponent() {
      const { withStepUp, dialogOpen, closeStepUp } = useStepUp()
      return (
        <div>
          <button type="button" onClick={() => withStepUp(actionMock)}>
            إجراء حسّاس: تصدير CSV
          </button>
          <StepUpDialog open={dialogOpen} onClose={closeStepUp} />
        </div>
      )
    }

    render(
      <TestWrapper>
        <SensitiveActionComponent />
      </TestWrapper>,
    )

    // Initially, action hasn't run
    expect(actionMock).not.toHaveBeenCalled()

    // Trigger sensitive action
    const exportBtn = screen.getByRole('button', { name: 'إجراء حسّاس: تصدير CSV' })
    await user.click(exportBtn)

    // Dialog opens with ADM-003 prompt
    expect(await screen.findByText(getAuthMessage('ADM-003'))).toBeInTheDocument()
    expect(screen.getByText('ADM-003')).toBeInTheDocument()

    // Enter 6-digit TOTP code
    const input = screen.getByLabelText('رمز التحقق (6 أرقام)')
    await user.type(input, '123456')

    const confirmBtn = screen.getByRole('button', { name: 'تأكيد ومتابعة' })
    await user.click(confirmBtn)

    // challenge & verify API was invoked with the verified factor
    expect(challengeSpy).toHaveBeenCalledWith('factor-totp-1', '123456')

    // Sensitive action was executed!
    expect(actionMock).toHaveBeenCalled()

    // Still never written to persistent storage
    expect(localStorage.getItem('step-up')).toBeNull()
    expect(sessionStorage.length).toBe(0)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) || ''
      expect(key).not.toMatch(/step|mfa|factor|confirm/i)
    }
  })

  it('StepUpDialog displays AUTH-006 when code verification fails', async () => {
    const user = userEvent.setup()
    mockAdminWithFactor()

    vi.spyOn(api, 'challengeAndVerifyApi').mockResolvedValue({
      success: false,
      code: 'AUTH-006',
      message: getAuthMessage('AUTH-006'),
    })

    const onClose = vi.fn()

    render(
      <TestWrapper>
        <StepUpDialog open={true} onClose={onClose} />
      </TestWrapper>,
    )

    expect(screen.getByText(getAuthMessage('ADM-003'))).toBeInTheDocument()

    const input = screen.getByLabelText('رمز التحقق (6 أرقام)')
    await user.type(input, '000000')

    const confirmBtn = screen.getByRole('button', { name: 'تأكيد ومتابعة' })
    await user.click(confirmBtn)

    expect(await screen.findByText(getAuthMessage('AUTH-006'))).toBeInTheDocument()
    expect(screen.getByText('AUTH-006')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('withStepUp immediately runs action without dialog when already confirmed within 5 minutes', async () => {
    const user = userEvent.setup()
    mockAdminWithFactor()

    setStepUpConfirmedMemory()

    const actionMock = vi.fn()

    function AlreadyConfirmedComponent() {
      const { withStepUp, dialogOpen, closeStepUp } = useStepUp()
      return (
        <div>
          <button type="button" onClick={() => withStepUp(actionMock)}>
            إجراء فوري
          </button>
          <StepUpDialog open={dialogOpen} onClose={closeStepUp} />
        </div>
      )
    }

    render(
      <TestWrapper>
        <AlreadyConfirmedComponent />
      </TestWrapper>,
    )

    const btn = screen.getByRole('button', { name: 'إجراء فوري' })
    await user.click(btn)

    // Action ran immediately without opening dialog
    expect(actionMock).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
