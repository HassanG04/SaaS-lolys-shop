import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { LanguageProvider } from '@/i18n/LanguageProvider'
import { ToastProvider } from '@/components/ui/ToastProvider'
import { supabase } from '@/lib/supabase'
import { type AuditLogEntry, isSensitiveAuditEntry } from './types'
import { getAuditLogs, getRecentSensitiveAudit } from './api'
import { AuditDetailModal } from './AuditDetailModal'
import { RecentSensitiveChangesPanel } from './RecentSensitiveChangesPanel'
import AuditPage from './AuditPage'

vi.mock('@/lib/supabase', () => {
  const client = {
    from: vi.fn(),
    rpc: vi.fn(),
  }
  return { supabase: client }
})

const mockEntries: AuditLogEntry[] = [
  {
    id: 101,
    at: '2026-03-01T12:00:00Z',
    actor: 'admin-uuid-1',
    actor_role: 'admin',
    action: 'UPDATE',
    entity: 'shop_settings',
    entity_id: 'sale_percent',
    old: { value: 10 },
    new: { value: 20 },
  },
  {
    id: 102,
    at: '2026-03-01T13:30:00Z',
    actor: 'admin-uuid-1',
    actor_role: 'admin',
    action: 'PAYMENT_REVIEW',
    entity: 'orders',
    entity_id: 'ord-888',
    old: { payment_status: 'reviewing' },
    new: { payment_status: 'paid' },
  },
  {
    id: 103,
    at: '2026-03-02T09:15:00Z',
    actor: 'admin-uuid-2',
    actor_role: 'admin',
    action: 'INSERT',
    entity: 'products',
    entity_id: 'prod-45',
    old: null,
    new: { title: 'Pearl Necklace', price: 450 },
  },
  {
    id: 104,
    at: '2026-03-02T10:00:00Z',
    actor: 'admin-uuid-1',
    actor_role: 'admin',
    action: 'DELETE',
    entity: 'categories',
    entity_id: 'cat-9',
    old: { name: 'Old Rings' },
    new: null,
  },
]

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
}

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={makeClient()}>
      <LanguageProvider>
        <ToastProvider>
          <MemoryRouter>{children}</MemoryRouter>
        </ToastProvider>
      </LanguageProvider>
    </QueryClientProvider>
  )
}

describe('Audit Log Types & Helpers (T-5.10)', () => {
  it('identifies sensitive audit entries correctly', () => {
    expect(isSensitiveAuditEntry(mockEntries[0])).toBe(true) // shop_settings
    expect(isSensitiveAuditEntry(mockEntries[1])).toBe(true) // PAYMENT_REVIEW
    expect(
      isSensitiveAuditEntry({
        ...mockEntries[2],
        entity: 'profiles',
      }),
    ).toBe(true) // profiles
    expect(
      isSensitiveAuditEntry({
        ...mockEntries[2],
        entity: 'delivery_fees',
      }),
    ).toBe(true) // delivery_fees
    expect(isSensitiveAuditEntry(mockEntries[2])).toBe(false) // products INSERT
    expect(isSensitiveAuditEntry(mockEntries[3])).toBe(false) // categories DELETE
  })
})

describe('Audit Log API (T-5.10)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getAuditLogs builds query with default pagination and sorting', async () => {
    const mockRange = vi.fn().mockResolvedValue({
      data: mockEntries,
      count: 4,
      error: null,
    })
    const mockOrder = vi.fn().mockReturnValue({ range: mockRange })
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder })
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as unknown as ReturnType<
      typeof supabase.from
    >)

    const res = await getAuditLogs(undefined, 1, 20)

    expect(supabase.from).toHaveBeenCalledWith('audit_log')
    expect(mockSelect).toHaveBeenCalledWith('*', { count: 'exact' })
    expect(mockOrder).toHaveBeenCalledWith('at', { ascending: false })
    expect(mockRange).toHaveBeenCalledWith(0, 19)
    expect(res.entries).toEqual(mockEntries)
    expect(res.total).toBe(4)
    expect(res.page).toBe(1)
    expect(res.totalPages).toBe(1)
  })

  it('getAuditLogs applies filters for entity, action, dates, and search', async () => {
    const mockRange = vi.fn().mockResolvedValue({
      data: [mockEntries[0]],
      count: 1,
      error: null,
    })
    const mockOrder = vi.fn().mockReturnValue({ range: mockRange })
    const mockOr = vi.fn().mockReturnValue({ order: mockOrder })
    const mockLte = vi.fn().mockReturnValue({ or: mockOr })
    const mockGte = vi.fn().mockReturnValue({ lte: mockLte })
    const mockEqAction = vi.fn().mockReturnValue({ gte: mockGte })
    const mockEqEntity = vi.fn().mockReturnValue({ eq: mockEqAction })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEqEntity })
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as unknown as ReturnType<
      typeof supabase.from
    >)

    const res = await getAuditLogs(
      {
        entity: 'shop_settings',
        action: 'UPDATE',
        from: '2026-03-01',
        to: '2026-03-02',
        search: 'sale_percent',
      },
      2,
      10,
    )

    expect(mockEqEntity).toHaveBeenCalledWith('entity', 'shop_settings')
    expect(mockEqAction).toHaveBeenCalledWith('action', 'UPDATE')
    expect(mockGte).toHaveBeenCalledWith('at', '2026-03-01')
    expect(mockLte).toHaveBeenCalledWith('at', '2026-03-02T23:59:59.999Z')
    expect(mockOr).toHaveBeenCalledWith(
      'entity_id.ilike.%sale_percent%,actor_role.ilike.%sale_percent%',
    )
    expect(mockRange).toHaveBeenCalledWith(10, 19)
    expect(res.page).toBe(2)
  })

  it('getAuditLogs handles numeric search with id filter', async () => {
    const mockRange = vi.fn().mockResolvedValue({
      data: [mockEntries[0]],
      count: 1,
      error: null,
    })
    const mockOrder = vi.fn().mockReturnValue({ range: mockRange })
    const mockOr = vi.fn().mockReturnValue({ order: mockOrder })
    const mockSelect = vi.fn().mockReturnValue({ or: mockOr })
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as unknown as ReturnType<
      typeof supabase.from
    >)

    await getAuditLogs({ search: '101' }, 1, 20)

    expect(mockOr).toHaveBeenCalledWith('id.eq.101,entity_id.ilike.%101%,actor_role.ilike.%101%')
  })

  it('getAuditLogs throws AppError on supabase error', async () => {
    const mockRange = vi.fn().mockResolvedValue({
      data: null,
      count: null,
      error: { code: 'PGRST116', message: 'Database error' },
    })
    const mockOrder = vi.fn().mockReturnValue({ range: mockRange })
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder })
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as unknown as ReturnType<
      typeof supabase.from
    >)

    await expect(getAuditLogs()).rejects.toThrow()
  })

  it('getRecentSensitiveAudit queries sensitive entities and limit', async () => {
    const mockLimit = vi.fn().mockResolvedValue({
      data: [mockEntries[0], mockEntries[1]],
      error: null,
    })
    const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit })
    const mockOr = vi.fn().mockReturnValue({ order: mockOrder })
    const mockSelect = vi.fn().mockReturnValue({ or: mockOr })
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as unknown as ReturnType<
      typeof supabase.from
    >)

    const result = await getRecentSensitiveAudit(5)

    expect(supabase.from).toHaveBeenCalledWith('audit_log')
    expect(mockOr).toHaveBeenCalledWith(
      'entity.in.(shop_settings,delivery_fees,profiles),action.eq.PAYMENT_REVIEW',
    )
    expect(mockOrder).toHaveBeenCalledWith('at', { ascending: false })
    expect(mockLimit).toHaveBeenCalledWith(5)
    expect(result).toHaveLength(2)
  })
})

describe('AuditDetailModal Component (T-5.10)', () => {
  it('does not render when closed or entry is null', () => {
    const { container: c1 } = render(
      <Wrapper>
        <AuditDetailModal entry={null} open={true} onClose={vi.fn()} />
      </Wrapper>,
    )
    expect(c1.firstChild).toBeNull()

    const { container: c2 } = render(
      <Wrapper>
        <AuditDetailModal entry={mockEntries[0]} open={false} onClose={vi.fn()} />
      </Wrapper>,
    )
    expect(c2.firstChild).toBeNull()
  })

  it('renders modal details, before and after comparison, and highlights modified fields', () => {
    render(
      <Wrapper>
        <AuditDetailModal entry={mockEntries[0]} open={true} onClose={vi.fn()} />
      </Wrapper>,
    )

    // Modal title & ID
    expect(screen.getByText(/101/)).toBeInTheDocument()
    // Changed property
    expect(screen.getByText('value')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
  })

  it('toggles between key comparison view and raw JSON view', async () => {
    const user = userEvent.setup()
    render(
      <Wrapper>
        <AuditDetailModal entry={mockEntries[0]} open={true} onClose={vi.fn()} />
      </Wrapper>,
    )

    const rawJsonBtn = screen.getByRole('button', {
      name: /عرض كود JSON الخام|View Raw JSON/i,
    })
    await user.click(rawJsonBtn)

    // Raw JSON view active
    expect(screen.getByText(/الحالة السابقة \(Old\):|Previous State \(Old\):/i)).toBeInTheDocument()
    expect(screen.getByText(/الحالة الجديدة \(New\):|New State \(New\):/i)).toBeInTheDocument()

    // Toggle back
    const keyCompBtn = screen.getByRole('button', {
      name: /عرض المقارنة المنظمة|Show Key Comparison/i,
    })
    await user.click(keyCompBtn)
    expect(screen.getByText('value')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Wrapper>
        <AuditDetailModal entry={mockEntries[0]} open={true} onClose={onClose} />
      </Wrapper>,
    )

    const closeButtons = screen.getAllByRole('button', { name: /إغلاق|Close/i })
    await user.click(closeButtons[closeButtons.length - 1])
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('RecentSensitiveChangesPanel Component (T-5.10)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders empty state when no sensitive records exist', async () => {
    const mockLimit = vi.fn().mockResolvedValue({ data: [], error: null })
    const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit })
    const mockOr = vi.fn().mockReturnValue({ order: mockOrder })
    const mockSelect = vi.fn().mockReturnValue({ or: mockOr })
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as unknown as ReturnType<
      typeof supabase.from
    >)

    render(
      <Wrapper>
        <RecentSensitiveChangesPanel />
      </Wrapper>,
    )

    await waitFor(() => {
      expect(
        screen.getByText(/لا توجد عمليات حساسة مسجلة مؤخرًا|No recent sensitive actions/i),
      ).toBeInTheDocument()
    })
  })

  it('renders sensitive entries and triggers onSelectEntry callback', async () => {
    const user = userEvent.setup()
    const mockLimit = vi.fn().mockResolvedValue({
      data: [mockEntries[0]],
      error: null,
    })
    const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit })
    const mockOr = vi.fn().mockReturnValue({ order: mockOrder })
    const mockSelect = vi.fn().mockReturnValue({ or: mockOr })
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as unknown as ReturnType<
      typeof supabase.from
    >)

    const onSelect = vi.fn()
    render(
      <Wrapper>
        <RecentSensitiveChangesPanel onSelectEntry={onSelect} />
      </Wrapper>,
    )

    await waitFor(() => {
      expect(screen.getByText('#sale_percent')).toBeInTheDocument()
    })

    const compareBtn = screen.getByRole('button', { name: /عرض المقارنة|Compare/i })
    await user.click(compareBtn)
    expect(onSelect).toHaveBeenCalledWith(mockEntries[0])
  })
})

describe('AuditPage Component (T-5.10)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function mockAuditSetup(entries: AuditLogEntry[] = mockEntries, total = mockEntries.length) {
    const mockRange = vi.fn().mockResolvedValue({
      data: entries,
      count: total,
      error: null,
    })
    const mockOrder = vi.fn().mockReturnValue({ range: mockRange })
    const mockSelect = vi.fn().mockReturnValue({
      order: mockOrder,
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
    })

    const mockLimit = vi.fn().mockResolvedValue({
      data: entries.length > 0 ? [entries[0]] : [],
      error: null,
    })
    const mockOrderSens = vi.fn().mockReturnValue({ limit: mockLimit })
    const mockOrSens = vi.fn().mockReturnValue({ order: mockOrderSens })
    const mockSelectSens = vi.fn().mockReturnValue({ or: mockOrSens })

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'audit_log') {
        return {
          select: vi.fn((sel: string, opts?: { count?: string }) => {
            if (opts?.count === 'exact') {
              return mockSelect(sel, opts)
            }
            return mockSelectSens(sel)
          }),
        } as unknown as ReturnType<typeof supabase.from>
      }
      return {} as unknown as ReturnType<typeof supabase.from>
    })
  }

  it('renders page header, filters, and audit table entries', async () => {
    mockAuditSetup()

    render(
      <Wrapper>
        <AuditPage />
      </Wrapper>,
    )

    // Header
    expect(
      screen.getByRole('heading', { level: 1, name: /سجل العمليات الإدارية|Audit Log/i }),
    ).toBeInTheDocument()

    // Table rows
    await waitFor(() => {
      expect(screen.getByText('101')).toBeInTheDocument()
      expect(screen.getByText('102')).toBeInTheDocument()
      expect(screen.getByText('103')).toBeInTheDocument()
      expect(screen.getByText('104')).toBeInTheDocument()
    })
  })

  it('filters by entity selection', async () => {
    mockAuditSetup()

    render(
      <Wrapper>
        <AuditPage />
      </Wrapper>,
    )

    await waitFor(() => {
      expect(screen.getByText('101')).toBeInTheDocument()
    })

    const entitySelect = screen.getByLabelText(/الكيان|Entity/i)
    fireEvent.change(entitySelect, { target: { value: 'products' } })
    expect(entitySelect).toHaveValue('products')
  })

  it('filters by action selection', async () => {
    mockAuditSetup()

    render(
      <Wrapper>
        <AuditPage />
      </Wrapper>,
    )

    await waitFor(() => {
      expect(screen.getByText('101')).toBeInTheDocument()
    })

    const actionSelect = screen.getByLabelText(/نوع العملية|Action/i)
    fireEvent.change(actionSelect, { target: { value: 'INSERT' } })
    expect(actionSelect).toHaveValue('INSERT')
  })

  it('resets filters when clicking reset button', async () => {
    const user = userEvent.setup()
    mockAuditSetup()

    render(
      <Wrapper>
        <AuditPage />
      </Wrapper>,
    )

    await waitFor(() => {
      expect(screen.getByText('101')).toBeInTheDocument()
    })

    const entitySelect = screen.getByLabelText(/الكيان|Entity/i)
    fireEvent.change(entitySelect, { target: { value: 'shop_settings' } })
    expect(entitySelect).toHaveValue('shop_settings')

    const resetBtn = screen.getByRole('button', { name: /إعادة التعيين|Reset/i })
    await user.click(resetBtn)

    expect(entitySelect).toHaveValue('all')
  })

  it('opens details modal when clicking view button in table', async () => {
    const user = userEvent.setup()
    mockAuditSetup()

    render(
      <Wrapper>
        <AuditPage />
      </Wrapper>,
    )

    await waitFor(() => {
      expect(screen.getByText('101')).toBeInTheDocument()
    })

    const viewButtons = screen.getAllByRole('button', { name: /عرض|View/i })
    await user.click(viewButtons[0])

    await waitFor(() => {
      expect(
        screen.getByText(
          /سجل غير قابل للتعديل يوثق الحالة السابقة والجديدة للتغيير|Immutable audit log record comparing previous and current states/i,
        ),
      ).toBeInTheDocument()
    })
  })

  it('renders empty state when no records found', async () => {
    mockAuditSetup([], 0)

    render(
      <Wrapper>
        <AuditPage />
      </Wrapper>,
    )

    await waitFor(() => {
      expect(
        screen.getByText(
          /لا توجد عمليات تطابق معايير البحث والتصفية|No audit records match your filters/i,
        ),
      ).toBeInTheDocument()
    })
  })
})
