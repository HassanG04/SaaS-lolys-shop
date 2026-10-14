import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session, User } from '@supabase/supabase-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '@/lib/supabase'
import { LanguageProvider } from '@/i18n/LanguageProvider'
import { AuthProvider } from '@/features/auth/AuthProvider'
import * as authApi from '@/features/auth/api'
import { clearStepUpMemory, setStepUpConfirmedMemory } from '@/features/auth/useStepUp'
import {
  UTF8_BOM,
  sanitizeCsvCell,
  escapeCsvCell,
  buildCsv,
  getExportFilename,
  downloadCsv,
} from './csv'
import {
  formatProductsCsv,
  formatOrdersCsv,
  formatCustomersCsv,
  formatAuditLogsCsv,
  formatAuditChangesSummary,
} from './formatters'
import { ExportCsvButton } from './ExportCsvButton'
import type { AdminProduct } from '../products/types'
import type { AdminOrder } from '../orders/types'
import type { CustomerStat } from '../customers/types'
import type { AuditLogEntry } from '../audit/types'

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <AuthProvider>{children}</AuthProvider>
    </LanguageProvider>
  )
}

describe('CSV Export Feature (T-5.11, SEC-14)', () => {
  describe('Core CSV utilities (csv.ts)', () => {
    it('prepends UTF-8 BOM (\uFEFF) to the CSV output for Excel Arabic compatibility', () => {
      const csv = buildCsv(['العنوان'], [['قيمة تجريبية']])
      expect(csv.startsWith(UTF8_BOM)).toBe(true)
      expect(csv.charCodeAt(0)).toBe(0xfeff)
      expect(csv).toContain('العنوان')
      expect(csv).toContain('قيمة تجريبية')
    })

    describe('Formula injection neutralization (SEC-14)', () => {
      it('neutralizes cells starting with = by prefixing with a single quote', () => {
        expect(sanitizeCsvCell('=cmd')).toBe("'=cmd")
        expect(sanitizeCsvCell("=cmd|' /C calc'!A0")).toBe("'=cmd|' /C calc'!A0")
        expect(sanitizeCsvCell('=SUM(A1:B10)')).toBe("'=SUM(A1:B10)")
      })

      it('neutralizes cells starting with + by prefixing with a single quote', () => {
        expect(sanitizeCsvCell('+12345')).toBe("'+12345")
        expect(sanitizeCsvCell("+cmd|' /C calc'!A0")).toBe("'+cmd|' /C calc'!A0")
      })

      it('neutralizes cells starting with - by prefixing with a single quote', () => {
        expect(sanitizeCsvCell('-2+3+cmd')).toBe("'-2+3+cmd")
        expect(sanitizeCsvCell('-SUM(A1:A5)')).toBe("'-SUM(A1:A5)")
      })

      it('neutralizes cells starting with @ by prefixing with a single quote', () => {
        expect(sanitizeCsvCell('@SUM(A1:A5)')).toBe("'@SUM(A1:A5)")
        expect(sanitizeCsvCell('@attacker')).toBe("'@attacker")
      })

      it('neutralizes cells starting with tab (\\t) by prefixing with a single quote', () => {
        expect(sanitizeCsvCell('\t=cmd')).toBe("'\t=cmd")
      })

      it('neutralizes cells starting with carriage return (\\r) by prefixing with a single quote', () => {
        expect(sanitizeCsvCell('\r=cmd')).toBe("'\r=cmd")
      })

      it('neutralizes cells starting with leading whitespace followed by formula characters', () => {
        expect(sanitizeCsvCell('   =cmd')).toBe("'   =cmd")
        expect(sanitizeCsvCell('  +calc')).toBe("'  +calc")
      })

      it('does NOT alter safe non-formula values', () => {
        expect(sanitizeCsvCell('سلسال لؤلؤ')).toBe('سلسال لؤلؤ')
        expect(sanitizeCsvCell('Pearl Necklace')).toBe('Pearl Necklace')
        expect(sanitizeCsvCell(150)).toBe('150')
        expect(sanitizeCsvCell(0)).toBe('0')
        expect(sanitizeCsvCell(true)).toBe('true')
        expect(sanitizeCsvCell(false)).toBe('false')
        expect(sanitizeCsvCell(null)).toBe('')
        expect(sanitizeCsvCell(undefined)).toBe('')
      })
    })

    describe('Quoting and escaping (RFC 4180)', () => {
      it('wraps cells containing commas in double quotes', () => {
        expect(escapeCsvCell('Cairo, Egypt')).toBe('"Cairo, Egypt"')
        expect(escapeCsvCell('أقراط, أساور')).toBe('"أقراط, أساور"')
      })

      it('escapes internal double quotes by doubling them and wraps in double quotes', () => {
        expect(escapeCsvCell('He said "Hello"')).toBe('"He said ""Hello"""')
      })

      it('wraps cells containing newlines or carriage returns in double quotes', () => {
        expect(escapeCsvCell('Line 1\nLine 2')).toBe('"Line 1\nLine 2"')
        expect(escapeCsvCell('Line 1\r\nLine 2')).toBe('"Line 1\r\nLine 2"')
      })

      it('correctly handles neutralized formula injection with commas or quotes', () => {
        // e.g. =cmd,"payload" -> sanitized to '=cmd,"payload" -> escaped to "'=cmd,""payload"""
        const cell = '=cmd,"payload"'
        const escaped = escapeCsvCell(cell)
        expect(escaped).toBe('"\'=cmd,""payload"""')
      })
    })

    describe('Filename generation (getExportFilename)', () => {
      it('includes the current date (YYYY-MM-DD) in the filename', () => {
        const testDate = new Date('2026-10-14T12:00:00Z')
        expect(getExportFilename('products', testDate)).toBe('products-2026-10-14.csv')
        expect(getExportFilename('orders', testDate)).toBe('orders-2026-10-14.csv')
        expect(getExportFilename('customers', testDate)).toBe('customers-2026-10-14.csv')
        expect(getExportFilename('audit-log', testDate)).toBe('audit-log-2026-10-14.csv')
      })
    })

    describe('Browser download (downloadCsv)', () => {
      it('creates an anchor, triggers download, and cleans up object URL', () => {
        const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url')
        const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
        const clickMock = vi.fn()

        const originalCreateElement = document.createElement.bind(document)
        vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
          const el = originalCreateElement(tagName)
          if (tagName === 'a') {
            el.click = clickMock
          }
          return el
        })

        downloadCsv('content', 'test-file.csv')

        expect(createObjectURLSpy).toHaveBeenCalled()
        expect(clickMock).toHaveBeenCalled()
        expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url')

        createObjectURLSpy.mockRestore()
        revokeObjectURLSpy.mockRestore()
        vi.restoreAllMocks()
      })
    })
  })

  describe('Entity formatters (formatters.ts)', () => {
    describe('formatProductsCsv', () => {
      const mockProducts: AdminProduct[] = [
        {
          id: 1,
          category_id: 10,
          name: 'Pearl Necklace',
          name_ar: 'سلسال لؤلؤ روز',
          description: 'Handmade necklace',
          description_ar: 'سلسال يدوي فاخر',
          price: 250,
          discount_percent: 20,
          final_price: 200,
          stock_quantity: 15,
          in_stock: true,
          sold_count: 50,
          is_active: true,
          is_featured: true,
          image_url: 'products/necklace.webp',
          extra_images: [],
          created_at: '2026-09-01T10:00:00Z',
          updated_at: '2026-09-01T10:00:00Z',
          category: { id: 10, name: 'Necklaces', name_ar: 'سلاسل', slug: 'necklaces' },
        },
        {
          id: 2,
          category_id: 20,
          // SEC-14: malicious formula injection product name
          name: "=cmd|' /C calc'!A0",
          name_ar: '=cmd_arabic',
          description: null,
          description_ar: null,
          price: 100,
          discount_percent: 0,
          final_price: 100,
          stock_quantity: 0,
          in_stock: false,
          sold_count: 0,
          is_active: false,
          is_featured: false,
          image_url: 'products/cmd.webp',
          extra_images: [],
          created_at: '2026-09-02T10:00:00Z',
          updated_at: '2026-09-02T10:00:00Z',
          category: null,
        },
      ]

      it('formats products with Arabic headers and neutralizes =cmd product names (SEC-14)', () => {
        const csv = formatProductsCsv(mockProducts, 'ar')
        expect(csv.startsWith(UTF8_BOM)).toBe(true)

        // Headers
        expect(csv).toContain('المعرف,اسم المنتج (عربي),اسم المنتج (إنجليزي),القسم,السعر (ج.م)')

        // Safe product
        expect(csv).toContain('سلسال لؤلؤ روز')
        expect(csv).toContain('Pearl Necklace')
        expect(csv).toContain('سلاسل')
        expect(csv).toContain('250,20,200,15,50,نشط,نعم')

        // Malicious product with =cmd (SEC-14)
        expect(csv).toContain("'=cmd_arabic")
        expect(csv).toContain("'=cmd|' /C calc'!A0")
        expect(csv).toContain('مؤرشف,لا')
      })

      it('formats products with English headers when lang is en', () => {
        const csv = formatProductsCsv(mockProducts, 'en')
        expect(csv.startsWith(UTF8_BOM)).toBe(true)
        expect(csv).toContain('ID,Name (Arabic),Name (English),Category,Price (EGP)')
        expect(csv).toContain('Necklaces')
        expect(csv).toContain('Active,Yes')
        expect(csv).toContain('Archived,No')
      })
    })

    describe('formatOrdersCsv', () => {
      const mockOrders: AdminOrder[] = [
        {
          id: 101,
          user_id: 'cust-1',
          created_at: '2026-10-10T14:30:00Z',
          updated_at: '2026-10-10T14:30:00Z',
          status: 'confirmed',
          payment_status: 'paid',
          delivery_method: 'egypt_post',
          payment_method: 'instapay_qr',
          subtotal: 450,
          shipping_fee: 50,
          total: 500,
          ship_name: 'سارة أحمد',
          ship_phone: '01012345678',
          ship_alt_phone: '01198765432',
          ship_governorate: 'القاهرة',
          ship_city: 'مدينة نصر',
          ship_district: 'الحي السابع',
          ship_address: 'شارع عباس العقاد 15',
          ship_floor: '3',
          ship_apartment: '12',
          ship_landmark: 'بجوار الحديقة الدولية',
          tracking_number: 'EG123456789',
          notes: 'يرجى الاتصال قبل الوصول',
          rep_name: null,
          rep_phone: null,
          payment_reference: 'INSTA-9988',
          payment_proof_path: null,
          payment_deadline: null,
          payment_submitted_at: null,
          paid_at: null,
          payment_review_note: null,
          order_items: [],
        },
        {
          id: 102,
          user_id: 'cust-2',
          created_at: '2026-10-11T12:00:00Z',
          updated_at: '2026-10-11T12:00:00Z',
          status: 'pending',
          payment_status: 'awaiting_approval',
          delivery_method: 'representative',
          payment_method: 'cod',
          subtotal: 300,
          shipping_fee: 40,
          total: 340,
          // SEC-14: customer name with formula injection
          ship_name: '=cmd|calc',
          ship_phone: '+201099998888',
          ship_alt_phone: null,
          ship_governorate: 'الجيزة',
          ship_city: 'الدقي',
          ship_district: null,
          ship_address: 'شارع مصدق',
          ship_floor: null,
          ship_apartment: null,
          ship_landmark: null,
          tracking_number: null,
          notes: '-SUM(A1:A5)',
          rep_name: null,
          rep_phone: null,
          payment_reference: null,
          payment_proof_path: null,
          payment_deadline: null,
          payment_submitted_at: null,
          paid_at: null,
          payment_review_note: null,
          order_items: [],
        },
      ]

      it('formats orders with Arabic headers and neutralizes formula injection', () => {
        const csv = formatOrdersCsv(mockOrders, 'ar')
        expect(csv.startsWith(UTF8_BOM)).toBe(true)

        expect(csv).toContain('رقم الطلب,تاريخ الطلب,اسم العميل,رقم الهاتف')
        expect(csv).toContain('سارة أحمد')
        expect(csv).toContain('البريد المصري')
        expect(csv).toContain('إنستاباي')
        expect(csv).toContain('EG123456789')

        // SEC-14 checks: ship_name '=cmd|calc', ship_phone '+201099998888', notes '-SUM(A1:A5)'
        expect(csv).toContain("'=cmd|calc")
        expect(csv).toContain("'+201099998888")
        expect(csv).toContain("'-SUM(A1:A5)")
        expect(csv).toContain('مندوب خاص')
        expect(csv).toContain('الدفع عند الاستلام')
      })

      it('formats orders with English headers when lang is en', () => {
        const csv = formatOrdersCsv(mockOrders, 'en')
        expect(csv.startsWith(UTF8_BOM)).toBe(true)
        expect(csv).toContain('Order ID,Order Date,Customer Name,Phone')
        expect(csv).toContain('Egypt Post')
        expect(csv).toContain('InstaPay')
        expect(csv).toContain('Courier Representative')
        expect(csv).toContain('Cash on Delivery')
      })
    })

    describe('formatCustomersCsv', () => {
      const mockCustomers: CustomerStat[] = [
        {
          user_id: 'usr-1',
          full_name: 'منى محمود',
          phone: '01234567890',
          role: 'customer',
          orders_count: 5,
          total_spent: 1750,
          favorite_product_id: 1,
          favorite_product_name: 'سلسال لؤلؤ روز',
        },
        {
          user_id: 'usr-2',
          // SEC-14: formula injection in customer name
          full_name: '@admin_test',
          phone: '+201122334455',
          role: 'admin',
          orders_count: 12,
          total_spent: 5000,
          favorite_product_id: 2,
          favorite_product_name: 'سوار ذهبي',
        },
      ]

      it('formats customers with Arabic headers and neutralizes formula injection', () => {
        const csv = formatCustomersCsv(mockCustomers, 'ar')
        expect(csv.startsWith(UTF8_BOM)).toBe(true)

        expect(csv).toContain('معرف العميل,الاسم بالكامل,رقم الهاتف,الدور,عدد الطلبات')
        expect(csv).toContain('منى محمود')
        expect(csv).toContain('عميل')
        expect(csv).toContain('1750')

        // SEC-14: @ and +
        expect(csv).toContain("'@admin_test")
        expect(csv).toContain("'+201122334455")
        expect(csv).toContain('مدير')
      })

      it('formats customers with English headers when lang is en', () => {
        const csv = formatCustomersCsv(mockCustomers, 'en')
        expect(csv.startsWith(UTF8_BOM)).toBe(true)
        expect(csv).toContain('Customer ID,Full Name,Phone,Role,Orders Count')
        expect(csv).toContain('Customer')
        expect(csv).toContain('Admin')
      })
    })

    describe('formatAuditLogsCsv', () => {
      const mockLogs: AuditLogEntry[] = [
        {
          id: 1,
          at: '2026-10-14T02:00:00Z',
          actor: 'admin-1',
          actor_role: 'admin',
          action: 'INSERT',
          entity: 'products',
          entity_id: '15',
          old: null,
          new: { id: 15, name: 'New Ring' },
        },
        {
          id: 2,
          at: '2026-10-14T02:30:00Z',
          actor: 'admin-1',
          actor_role: 'admin',
          action: 'UPDATE',
          entity: 'products',
          entity_id: '15',
          old: { id: 15, stock_quantity: 10, price: 100 },
          new: { id: 15, stock_quantity: 20, price: 120 },
        },
        {
          id: 3,
          at: '2026-10-14T03:00:00Z',
          actor: 'admin-1',
          actor_role: 'admin',
          action: 'DELETE',
          entity: 'categories',
          entity_id: '99',
          old: { id: 99, name: 'Old Category' },
          new: null,
        },
      ]

      it('formats audit logs with change summaries and UTF-8 BOM', () => {
        const csv = formatAuditLogsCsv(mockLogs, 'ar')
        expect(csv.startsWith(UTF8_BOM)).toBe(true)

        expect(csv).toContain('معرف السجل,التاريخ والوقت,الكيان,معرف الكيان,نوع العملية')
        expect(csv).toContain('عنصر جديد')
        expect(csv).toContain('تعديل الحقول: stock_quantity, price')
        expect(csv).toContain('تم حذف العنصر')
      })

      it('formats audit logs with English headers when lang is en', () => {
        const csv = formatAuditLogsCsv(mockLogs, 'en')
        expect(csv.startsWith(UTF8_BOM)).toBe(true)
        expect(csv).toContain('Log ID,Timestamp,Entity,Entity ID,Action')
        expect(csv).toContain('New record created')
        expect(csv).toContain('Modified fields: stock_quantity, price')
        expect(csv).toContain('Record deleted')
      })

      it('formatAuditChangesSummary handles no field changes', () => {
        const sameEntry: AuditLogEntry = {
          id: 4,
          at: '2026-10-14T03:15:00Z',
          actor: 'admin-1',
          actor_role: 'admin',
          action: 'UPDATE',
          entity: 'shop_settings',
          entity_id: '1',
          old: { key: 'val' },
          new: { key: 'val' },
        }
        expect(formatAuditChangesSummary(sameEntry, true)).toBe('لا توجد تغييرات حقلية')
        expect(formatAuditChangesSummary(sameEntry, false)).toBe('No field changes')
      })
    })
  })

  describe('ExportCsvButton component & Step-Up confirmation (SEC-14)', () => {
    const mockUser: User = {
      id: 'admin-test-uid',
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

    beforeEach(() => {
      clearStepUpMemory()

      HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
        this.setAttribute('open', '')
      })
      HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
        this.removeAttribute('open')
      })

      vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })
      vi.spyOn(supabase.auth, 'onAuthStateChange').mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn(), id: '1', callback: vi.fn() } },
      } as unknown as ReturnType<typeof supabase.auth.onAuthStateChange>)

      vi.spyOn(authApi, 'fetchProfileApi').mockResolvedValue({
        id: 'admin-test-uid',
        role: 'admin',
        full_name: 'Admin',
        phone: null,
        governorate_id: null,
      })
      vi.spyOn(authApi, 'fetchAalApi').mockResolvedValue('aal2')

      vi.spyOn(authApi, 'fetchFactorsApi').mockResolvedValue([
        {
          id: 'factor-totp-1',
          friendly_name: 'Authenticator',
          factor_type: 'totp',
          status: 'verified',
        },
      ])
    })

    afterEach(() => {
      clearStepUpMemory()
      vi.restoreAllMocks()
    })

    it('renders the export button with label and download icon', () => {
      render(
        <TestWrapper>
          <ExportCsvButton onExport={vi.fn()} label="تصدير تجريبي" />
        </TestWrapper>,
      )

      expect(screen.getByRole('button', { name: /تصدير تجريبي/ })).toBeInTheDocument()
    })

    it('requires Step-Up confirmation when memory verification is not active', async () => {
      const user = userEvent.setup()
      const exportFn = vi.fn()

      const challengeSpy = vi.spyOn(authApi, 'challengeAndVerifyApi').mockResolvedValue({
        success: true,
      })

      render(
        <TestWrapper>
          <ExportCsvButton onExport={exportFn} label="تصدير الطلبات" />
        </TestWrapper>,
      )

      const btn = screen.getByRole('button', { name: /تصدير الطلبات/ })
      await user.click(btn)

      // Step-Up dialog should open prompting for TOTP code
      expect(await screen.findByText('تأكيد الهوية (إجراء حسّاس)')).toBeInTheDocument()
      expect(screen.getByLabelText('رمز التحقق (6 أرقام)')).toBeInTheDocument()
      expect(exportFn).not.toHaveBeenCalled()

      // Enter 6-digit TOTP code
      const input = screen.getByLabelText('رمز التحقق (6 أرقام)')
      await user.type(input, '654321')

      const confirmBtn = screen.getByRole('button', { name: 'تأكيد ومتابعة' })
      await user.click(confirmBtn)

      // challengeAndVerifyApi should be called
      await waitFor(() => {
        expect(challengeSpy).toHaveBeenCalledWith('factor-totp-1', '654321')
      })

      // onExport should now execute after successful Step-Up
      await waitFor(() => {
        expect(exportFn).toHaveBeenCalledTimes(1)
      })
    })

    it('executes immediately without opening Step-Up dialog if step-up is already active', async () => {
      const user = userEvent.setup()
      const exportFn = vi.fn()

      // Set active in-memory confirmation (5-minute window)
      setStepUpConfirmedMemory()

      render(
        <TestWrapper>
          <ExportCsvButton onExport={exportFn} label="تصدير المنتجات" />
        </TestWrapper>,
      )

      const btn = screen.getByRole('button', { name: /تصدير المنتجات/ })
      await user.click(btn)

      // Executes immediately without dialog
      expect(exportFn).toHaveBeenCalledTimes(1)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('does not trigger onExport when button is disabled', async () => {
      const user = userEvent.setup()
      const exportFn = vi.fn()

      render(
        <TestWrapper>
          <ExportCsvButton onExport={exportFn} label="تصدير معطل" disabled />
        </TestWrapper>,
      )

      const btn = screen.getByRole('button', { name: /تصدير معطل/ })
      expect(btn).toBeDisabled()
      await user.click(btn)

      expect(exportFn).not.toHaveBeenCalled()
    })
  })
})
