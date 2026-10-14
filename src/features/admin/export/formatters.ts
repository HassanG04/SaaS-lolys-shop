import type { AdminProduct } from '../products/types'
import type { AdminOrder } from '../orders/types'
import type { CustomerStat } from '../customers/types'
import type { AuditLogEntry } from '../audit/types'
import { buildCsv } from './csv'

/**
 * Formats a list of products into an RFC 4180 CSV string with UTF-8 BOM.
 */
export function formatProductsCsv(products: AdminProduct[], lang: 'ar' | 'en' = 'ar'): string {
  const isAr = lang === 'ar'
  const headers = isAr
    ? [
        'المعرف',
        'اسم المنتج (عربي)',
        'اسم المنتج (إنجليزي)',
        'القسم',
        'السعر (ج.م)',
        'نسبة الخصم (%)',
        'السعر النهائي (ج.م)',
        'الكمية في المخزون',
        'عدد المبيعات',
        'الحالة',
        'مميز',
        'تاريخ الإضافة',
      ]
    : [
        'ID',
        'Name (Arabic)',
        'Name (English)',
        'Category',
        'Price (EGP)',
        'Discount Percent (%)',
        'Final Price (EGP)',
        'Stock Quantity',
        'Sold Count',
        'Status',
        'Featured',
        'Created At',
      ]

  const rows = products.map((p) => {
    const categoryName = isAr
      ? p.category?.name_ar || p.category?.name || ''
      : p.category?.name || p.category?.name_ar || ''
    const statusStr = p.is_active ? (isAr ? 'نشط' : 'Active') : isAr ? 'مؤرشف' : 'Archived'
    const featuredStr = p.is_featured ? (isAr ? 'نعم' : 'Yes') : isAr ? 'لا' : 'No'

    return [
      p.id,
      p.name_ar || '',
      p.name,
      categoryName,
      p.price,
      p.discount_percent ?? 0,
      p.final_price,
      p.stock_quantity,
      p.sold_count ?? 0,
      statusStr,
      featuredStr,
      p.created_at || '',
    ]
  })

  return buildCsv(headers, rows)
}

/**
 * Formats a list of customer orders into an RFC 4180 CSV string with UTF-8 BOM.
 */
export function formatOrdersCsv(orders: AdminOrder[], lang: 'ar' | 'en' = 'ar'): string {
  const isAr = lang === 'ar'
  const headers = isAr
    ? [
        'رقم الطلب',
        'تاريخ الطلب',
        'اسم العميل',
        'رقم الهاتف',
        'هاتف إضافي',
        'المحافظة',
        'المدينة',
        'الحي',
        'العنوان',
        'الدور',
        'الشقة',
        'علامة مميزة',
        'طريقة التوصيل',
        'طريقة الدفع',
        'حالة الطلب',
        'حالة الدفع',
        'قيمة المنتجات (ج.م)',
        'رسوم التوصيل (ج.م)',
        'الإجمالي (ج.م)',
        'رقم التتبع',
        'ملاحظات',
      ]
    : [
        'Order ID',
        'Order Date',
        'Customer Name',
        'Phone',
        'Alt Phone',
        'Governorate',
        'City',
        'District',
        'Address',
        'Floor',
        'Apartment',
        'Landmark',
        'Delivery Method',
        'Payment Method',
        'Order Status',
        'Payment Status',
        'Subtotal (EGP)',
        'Delivery Fee (EGP)',
        'Total (EGP)',
        'Tracking Number',
        'Notes',
      ]

  const rows = orders.map((o) => {
    const deliveryMethodStr =
      o.delivery_method === 'egypt_post'
        ? isAr
          ? 'البريد المصري'
          : 'Egypt Post'
        : o.delivery_method === 'representative'
          ? isAr
            ? 'مندوب خاص'
            : 'Courier Representative'
          : o.delivery_method

    const paymentMethodStr =
      o.payment_method === 'cod'
        ? isAr
          ? 'الدفع عند الاستلام'
          : 'Cash on Delivery'
        : o.payment_method === 'instapay_qr'
          ? isAr
            ? 'إنستاباي'
            : 'InstaPay'
          : o.payment_method

    return [
      o.id,
      o.created_at || '',
      o.ship_name,
      o.ship_phone,
      o.ship_alt_phone || '',
      o.ship_governorate,
      o.ship_city,
      o.ship_district || '',
      o.ship_address,
      o.ship_floor || '',
      o.ship_apartment || '',
      o.ship_landmark || '',
      deliveryMethodStr,
      paymentMethodStr,
      o.status,
      o.payment_status,
      o.subtotal,
      o.shipping_fee,
      o.total,
      o.tracking_number || '',
      o.notes || '',
    ]
  })

  return buildCsv(headers, rows)
}

/**
 * Formats customer stats into an RFC 4180 CSV string with UTF-8 BOM.
 */
export function formatCustomersCsv(customers: CustomerStat[], lang: 'ar' | 'en' = 'ar'): string {
  const isAr = lang === 'ar'
  const headers = isAr
    ? [
        'معرف العميل',
        'الاسم بالكامل',
        'رقم الهاتف',
        'الدور',
        'عدد الطلبات',
        'إجمالي المشتريات (ج.م)',
        'المنتج المفضل',
      ]
    : [
        'Customer ID',
        'Full Name',
        'Phone',
        'Role',
        'Orders Count',
        'Total Spent (EGP)',
        'Favorite Product',
      ]

  const rows = customers.map((c) => [
    c.user_id,
    c.full_name || '',
    c.phone || '',
    c.role === 'admin' ? (isAr ? 'مدير' : 'Admin') : isAr ? 'عميل' : 'Customer',
    c.orders_count,
    c.total_spent,
    c.favorite_product_name || '',
  ])

  return buildCsv(headers, rows)
}

/**
 * Summarizes the changes in an audit log entry for CSV export.
 */
export function formatAuditChangesSummary(entry: AuditLogEntry, isAr: boolean): string {
  if (entry.action === 'INSERT') {
    return isAr ? 'عنصر جديد' : 'New record created'
  }
  if (entry.action === 'DELETE') {
    return isAr ? 'تم حذف العنصر' : 'Record deleted'
  }

  const oldObj = (entry.old && typeof entry.old === 'object' ? entry.old : {}) as Record<
    string,
    unknown
  >
  const newObj = (entry.new && typeof entry.new === 'object' ? entry.new : {}) as Record<
    string,
    unknown
  >

  const changedKeys: string[] = []
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)])
  for (const k of allKeys) {
    if (JSON.stringify(oldObj[k]) !== JSON.stringify(newObj[k])) {
      changedKeys.push(k)
    }
  }

  if (changedKeys.length === 0) {
    return isAr ? 'لا توجد تغييرات حقلية' : 'No field changes'
  }

  return (isAr ? 'تعديل الحقول: ' : 'Modified fields: ') + changedKeys.join(', ')
}

/**
 * Formats audit log entries into an RFC 4180 CSV string with UTF-8 BOM.
 */
export function formatAuditLogsCsv(logs: AuditLogEntry[], lang: 'ar' | 'en' = 'ar'): string {
  const isAr = lang === 'ar'
  const headers = isAr
    ? [
        'معرف السجل',
        'التاريخ والوقت',
        'الكيان',
        'معرف الكيان',
        'نوع العملية',
        'المستخدم',
        'دور المستخدم',
        'ملخص التغييرات',
      ]
    : [
        'Log ID',
        'Timestamp',
        'Entity',
        'Entity ID',
        'Action',
        'Actor',
        'Actor Role',
        'Changes Summary',
      ]

  const rows = logs.map((l) => [
    l.id,
    l.at,
    l.entity,
    l.entity_id || '',
    l.action,
    l.actor || '',
    l.actor_role || '',
    formatAuditChangesSummary(l, isAr),
  ])

  return buildCsv(headers, rows)
}
