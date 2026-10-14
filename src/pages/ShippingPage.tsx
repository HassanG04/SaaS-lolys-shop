import { Link } from 'react-router-dom'
import { RibbonBow } from '../components/ui/ornaments'

export default function ShippingPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-8 pb-12">
      <div className="rounded-card border border-border bg-surface p-6 sm:p-10 space-y-8">
        {/* Header */}
        <header className="space-y-3 border-b border-border pb-6">
          <div className="flex items-center gap-3">
            <RibbonBow className="size-8 text-brand" />
            <h1 className="text-h1 font-bold font-accent text-brand">الشحن والتوصيل</h1>
          </div>
          <p className="text-caption text-text-muted">
            نوفر شحنًا آمنًا وسريعًا لجميع محافظات جمهورية مصر العربية لضمان وصول قطعك المفضلة
            بعناية وتغليف أنيق.
          </p>
        </header>

        {/* Section 1: Coverage and Carriers */}
        <section className="space-y-4">
          <h2 className="text-h3 font-semibold text-text">1. التغطية وشركات الشحن</h2>
          <div className="space-y-3 text-body text-text-muted leading-relaxed">
            <p>نصل إلى جميع مدن ومحافظات مصر (27 محافظة) بالتعاون مع شركاء الشحن المعتمدين:</p>
            <ul className="list-disc list-inside space-y-2 ps-2">
              <li>
                <strong className="text-text">البريد المصري (Egypt Post):</strong> تغطية شاملة لجميع
                المحافظات والمراكز والقرى مع تزويد العميل برقم تتبع رسمي لمتابعة حركة الطرد.
              </li>
              <li>
                <strong className="text-text">
                  مندوبو التوصيل المعتمدون (Courier Representatives):
                </strong>{' '}
                خدمة توصيل سريعة ومباشرة حتى باب المنزل في القاهرة الكبرى والإسكندرية والمحافظات
                الرئيسية مع تزويد العميل باسم ورقم هاتف المندوب عند خروج الشحنة للتسليم.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 2: Delivery Times */}
        <section className="space-y-4 rounded-card border border-border bg-surface-2 p-5 sm:p-6">
          <h2 className="text-h3 font-semibold text-brand">2. المدد الزمنية المتوقعة للتسليم</h2>
          <div className="space-y-3 text-body text-text-muted leading-relaxed">
            <p>تبدأ المدة من تاريخ تأكيد الطلب وتجهيزه:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="rounded-chip border border-border bg-surface p-4">
                <h3 className="font-semibold text-text mb-1">القاهرة، الجيزة والإسكندرية</h3>
                <p className="text-small text-brand font-medium">خلال 2 إلى 3 أيام عمل</p>
              </div>
              <div className="rounded-chip border border-border bg-surface p-4">
                <h3 className="font-semibold text-text mb-1">محافظات الدلتا والقناة والصعيد</h3>
                <p className="text-small text-brand font-medium">خلال 3 إلى 5 أيام عمل</p>
              </div>
            </div>
            <p className="text-caption text-text-muted pt-2">
              * أيام العمل الرسمية هي من السبت إلى الخميس (مع استثناء العطلات الرسمية والأعياد).
            </p>
          </div>
        </section>

        {/* Section 3: Shipping Fees */}
        <section className="space-y-4">
          <h2 className="text-h3 font-semibold text-text">3. رسوم الشحن</h2>
          <div className="space-y-3 text-body text-text-muted leading-relaxed">
            <p>
              يتم احتساب رسوم الشحن بدقة وشفافية أثناء خطوة إتمام الطلب بناءً على المحافظة وطريقة
              التوصيل المختارة (البريد المصري أو المندوب).
            </p>
            <p>
              تظهر لك قيمة الشحن والإجمالي النهائي قبل تأكيد الطلب مباشرة، دون أي رسوم مخفية أو
              إضافية غير معلنة.
            </p>
          </div>
        </section>

        {/* Section 4: Receipt and Inspection */}
        <section className="space-y-4 border-t border-border pt-6">
          <h2 className="text-h3 font-semibold text-text">4. استلام الشحنة والمعاينة</h2>
          <div className="space-y-3 text-body text-text-muted leading-relaxed">
            <p>
              يُرجى التأكد من سلامة التغليف الخارجي قبل الاستلام. إذا لاحظت أي تلف ظاهر في الطرد أو
              المنتج، يُرجى التواصل معنا فورًا عبر صفحة{' '}
              <Link to="/contact" className="text-brand underline hover:opacity-80">
                تواصل معنا
              </Link>{' '}
              لمعالجة الأمر في نفس اليوم.
            </p>
          </div>
        </section>
      </div>
    </article>
  )
}
