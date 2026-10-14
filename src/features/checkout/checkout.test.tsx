import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  normalizeEgyptianPhone,
  isValidEgyptianPhone,
  validateShippingForm,
  buildPlaceOrderShippingPayload,
} from './validation'
import { placeOrderApi } from './api'
import { getSupabase } from '@/lib/supabase'
import type { ShippingAddressForm } from './types'
import { AppError } from '@/lib/errors'

describe('Checkout Validation and Utilities (T-4.02)', () => {
  describe('normalizeEgyptianPhone', () => {
    it('normalizes standard 11-digit Egyptian numbers', () => {
      expect(normalizeEgyptianPhone('01012345678')).toBe('01012345678')
      expect(normalizeEgyptianPhone('01198765432')).toBe('01198765432')
      expect(normalizeEgyptianPhone('01234567890')).toBe('01234567890')
      expect(normalizeEgyptianPhone('01555555555')).toBe('01555555555')
    })

    it('converts Arabic-Indic numerals to standard ASCII digits', () => {
      expect(normalizeEgyptianPhone('٠١٠١٢٣٤٥٦٧٨')).toBe('01012345678')
      expect(normalizeEgyptianPhone('٠١١٩٨٧٦٥٤٣٢')).toBe('01198765432')
      expect(normalizeEgyptianPhone('٠١٥١٢٣٤١٢٣٤')).toBe('01512341234')
    })

    it('strips international prefixes +20, 0020, and 20', () => {
      expect(normalizeEgyptianPhone('+201012345678')).toBe('01012345678')
      expect(normalizeEgyptianPhone('00201012345678')).toBe('01012345678')
      expect(normalizeEgyptianPhone('+201123456789')).toBe('01123456789')
      expect(normalizeEgyptianPhone('201234567890')).toBe('01234567890')
    })

    it('removes spaces, dashes, dots, and brackets', () => {
      expect(normalizeEgyptianPhone('010 1234 5678')).toBe('01012345678')
      expect(normalizeEgyptianPhone('011-987-654-32')).toBe('01198765432')
      expect(normalizeEgyptianPhone('(012) 3456.7890')).toBe('01234567890')
    })

    it('adds leading zero if 10 digits are given starting with 10, 11, 12, 15', () => {
      expect(normalizeEgyptianPhone('1012345678')).toBe('01012345678')
      expect(normalizeEgyptianPhone('1198765432')).toBe('01198765432')
    })
  })

  describe('isValidEgyptianPhone', () => {
    it('accepts valid 11-digit mobile operators', () => {
      expect(isValidEgyptianPhone('01012345678')).toBe(true) // Vodafone
      expect(isValidEgyptianPhone('01112345678')).toBe(true) // Etisalat
      expect(isValidEgyptianPhone('01212345678')).toBe(true) // Orange
      expect(isValidEgyptianPhone('01512345678')).toBe(true) // WE
      expect(isValidEgyptianPhone('+201012345678')).toBe(true)
      expect(isValidEgyptianPhone('٠١٠١٢٣٤٥٦٧٨')).toBe(true)
    })

    it('rejects invalid mobile numbers and landlines', () => {
      expect(isValidEgyptianPhone('01312345678')).toBe(false) // 013 is not mobile
      expect(isValidEgyptianPhone('0223456789')).toBe(false) // Landline
      expect(isValidEgyptianPhone('0101234567')).toBe(false) // Too short (10 digits)
      expect(isValidEgyptianPhone('010123456789')).toBe(false) // Too long (12 digits)
      expect(isValidEgyptianPhone('abcdefghijk')).toBe(false)
      expect(isValidEgyptianPhone('')).toBe(false)
    })
  })

  describe('validateShippingForm', () => {
    const validForm: ShippingAddressForm = {
      name: 'سارة أحمد',
      phone: '01012345678',
      alt_phone: '',
      governorate_id: 1,
      city: 'مدينة نصر',
      district: 'حي السفارات',
      address: 'شارع عباس العقاد عمارة 15',
      floor: '3',
      apartment: '12',
      landmark: 'بجوار بنك مصر',
      notes: 'الاتصال قبل الوصول',
    }

    it('validates a correct form without errors', () => {
      const res = validateShippingForm(validForm)
      expect(res.isValid).toBe(true)
      expect(res.errors).toEqual({})
    })

    it('flags missing name and phone', () => {
      const res = validateShippingForm({
        ...validForm,
        name: '',
        phone: '',
      })
      expect(res.isValid).toBe(false)
      expect(res.errors.name).toBeTruthy()
      expect(res.errors.phone).toBeTruthy()
    })

    it('flags invalid primary phone', () => {
      const res = validateShippingForm({
        ...validForm,
        phone: '12345',
      })
      expect(res.isValid).toBe(false)
      expect(res.errors.phone).toMatch(/رقم الموبايل غير صحيح/)
    })

    it('flags duplicate or invalid alt phone', () => {
      const invalidAlt = validateShippingForm({
        ...validForm,
        alt_phone: '0223456789',
      })
      expect(invalidAlt.isValid).toBe(false)
      expect(invalidAlt.errors.alt_phone).toMatch(/رقم الموبايل الإضافي غير صحيح/)

      const duplicateAlt = validateShippingForm({
        ...validForm,
        phone: '01012345678',
        alt_phone: '01012345678',
      })
      expect(duplicateAlt.isValid).toBe(false)
      expect(duplicateAlt.errors.alt_phone).toMatch(/مختلفًا عن رقم الموبايل الأساسي/)
    })

    it('flags missing governorate and address', () => {
      const res = validateShippingForm({
        ...validForm,
        governorate_id: '',
        address: '',
      })
      expect(res.isValid).toBe(false)
      expect(res.errors.governorate_id).toBeTruthy()
      expect(res.errors.address).toBeTruthy()
    })

    it('enforces field length bounds matching database constraints', () => {
      const res = validateShippingForm({
        ...validForm,
        name: 'a'.repeat(101),
        address: 'b'.repeat(151),
        city: 'c'.repeat(151),
        district: 'd'.repeat(151),
        floor: 'e'.repeat(51),
        apartment: 'f'.repeat(51),
        landmark: 'g'.repeat(151),
        notes: 'h'.repeat(501),
      })
      expect(res.isValid).toBe(false)
      expect(res.errors.name).toBeTruthy()
      expect(res.errors.address).toBeTruthy()
      expect(res.errors.city).toBeTruthy()
      expect(res.errors.district).toBeTruthy()
      expect(res.errors.floor).toBeTruthy()
      expect(res.errors.apartment).toBeTruthy()
      expect(res.errors.landmark).toBeTruthy()
      expect(res.errors.notes).toBeTruthy()
    })
  })

  describe('buildPlaceOrderShippingPayload', () => {
    it('normalizes phones and converts empty optional fields to null', () => {
      const form: ShippingAddressForm = {
        name: '  مريم خالد  ',
        phone: '+20 10 1234 5678',
        alt_phone: '٠١١٩٨٧٦٥٤٣٢',
        governorate_id: 2,
        city: '  ',
        district: 'الزمالك',
        address: ' 10 شارع البرازيل ',
        floor: '',
        apartment: '  ',
        landmark: '',
        notes: 'برجاء عدم رن الجرس',
      }

      const payload = buildPlaceOrderShippingPayload(form)
      expect(payload).toEqual({
        name: 'مريم خالد',
        phone: '01012345678',
        alt_phone: '01198765432',
        governorate_id: 2,
        city: null,
        district: 'الزمالك',
        address: '10 شارع البرازيل',
        floor: null,
        apartment: null,
        landmark: null,
        notes: 'برجاء عدم رن الجرس',
      })
    })
  })
})

describe('placeOrderApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('calls place_order RPC with valid arguments and returns orderId', async () => {
    const rpcSpy = vi.spyOn(getSupabase(), 'rpc').mockResolvedValue({
      data: 1045,
      error: null,
    } as unknown as ReturnType<ReturnType<typeof getSupabase>['rpc']>)

    const result = await placeOrderApi({
      items: [{ product_id: 1, quantity: 2 }],
      delivery_method: 'representative',
      payment_method: 'cod',
      ship: {
        name: 'أحمد سعيد',
        phone: '01012345678',
        governorate_id: 1,
        address: '15 شارع النصر',
      },
    })

    expect(rpcSpy).toHaveBeenCalledWith('place_order', {
      p_items: [{ product_id: 1, quantity: 2 }],
      p_delivery_method: 'representative',
      p_payment_method: 'cod',
      p_ship: {
        name: 'أحمد سعيد',
        phone: '01012345678',
        governorate_id: 1,
        address: '15 شارع النصر',
        save_address: true,
      },
    })
    expect(result).toBe(1045)
  })

  it('maps database error hints to AppError catalogue codes', async () => {
    vi.spyOn(getSupabase(), 'rpc').mockResolvedValue({
      data: null,
      error: {
        message: 'Not enough stock',
        code: '22023',
        hint: 'ORD-007',
        detail: 'left=2',
      },
    } as unknown as ReturnType<ReturnType<typeof getSupabase>['rpc']>)

    await expect(
      placeOrderApi({
        items: [{ product_id: 1, quantity: 5 }],
        delivery_method: 'representative',
        payment_method: 'cod',
        ship: {
          name: 'أحمد سعيد',
          phone: '01012345678',
          governorate_id: 1,
          address: '15 شارع النصر',
        },
      }),
    ).rejects.toThrow(AppError)
  })
})
