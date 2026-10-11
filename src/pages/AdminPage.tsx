import { Link } from 'react-router-dom'

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-h1 font-bold font-accent text-(--color-brand)">لوحة تحكم الإدارة</h1>
          <p className="mt-2 text-body text-(--color-text-muted)">
            إدارة المنتجات، الطلبات، المدفوعات، وإعدادات المتجر.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/"
            className="inline-flex h-11 items-center justify-center rounded-(--radius-pill) border border-(--color-border-input) bg-(--color-surface-2) px-4 text-small font-semibold text-(--color-text) hover:border-(--color-brand) focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
          >
            العودة للمتجر
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { title: 'المنتجات والأقسام', desc: 'إدارة وتعديل المنتجات والمخزون' },
          { title: 'الطلبات والمبيعات', desc: 'متابعة الطلبات وتحديث حالات الشحن' },
          { title: 'المدفوعات وإنستاباي', desc: 'مراجعة إثباتات الدفع وتأكيد العمليات' },
          { title: 'إعدادات المتجر', desc: 'تخصيص الواجهة ورسوم التوصيل' },
          { title: 'سجل العمليات (Audit Log)', desc: 'سجل التغييرات الإدارية' },
          { title: 'التحليلات والتوقعات', desc: 'مؤشرات الأداء وتوقعات المبيعات' },
        ].map((item, idx) => (
          <div
            key={idx}
            className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-6 space-y-2"
          >
            <h2 className="text-body font-bold text-(--color-text)">{item.title}</h2>
            <p className="text-small text-(--color-text-muted)">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
