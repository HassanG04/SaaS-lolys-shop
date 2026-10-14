import { RibbonBow } from '../components/ui/ornaments'
import { Ltr } from '../components/ui/Ltr'

export default function ContactPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-8 pb-12">
      <div className="rounded-card border border-border bg-surface p-6 sm:p-10 space-y-8">
        {/* Header */}
        <header className="space-y-3 border-b border-border pb-6 text-center sm:text-start">
          <div className="flex items-center justify-center sm:justify-start gap-3">
            <RibbonBow className="size-8 text-brand" />
            <h1 className="text-h1 font-bold font-accent text-brand">تواصل معنا</h1>
          </div>
          <p className="text-body text-text-muted leading-relaxed">
            يسعدنا دائمًا الاستماع إليك والإجابة عن كافة استفساراتك حول المنتجات، وحالة طلباتك، أو
            مساعدتك في أي طلب يتعلق بخدماتنا.
          </p>
        </header>

        {/* Contact Channels Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* WhatsApp Card */}
          <div className="rounded-card border border-border bg-surface-2 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-h3 font-bold text-brand">واتساب</span>
              <span className="rounded-chip bg-surface px-2 py-0.5 text-caption font-semibold text-success">
                الأسرع ردًا
              </span>
            </div>
            <p className="text-small text-text-muted">
              تواصل مباشرة مع فريق الدعم للمساعدة في الطلبات وتأكيد الدفع.
            </p>
            <div className="pt-2">
              <a
                href="https://wa.me/201011119999"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center justify-center rounded-pill bg-brand px-5 text-small font-semibold text-brand-contrast transition-opacity hover:opacity-90"
              >
                محادثة واتساب مباشرة
              </a>
            </div>
          </div>

          {/* Email Card */}
          <div className="rounded-card border border-border bg-surface-2 p-5 space-y-3">
            <span className="text-h3 font-bold text-brand">البريد الإلكتروني</span>
            <p className="text-small text-text-muted">
              للشكاوى الرسمية، وطلبات حماية وتجهيل البيانات الشخصية، والشراكات.
            </p>
            <div className="pt-2">
              <a
                href="mailto:support@lolys.com"
                className="inline-flex h-10 items-center justify-center rounded-pill border border-border bg-surface px-5 text-small font-semibold text-text hover:border-brand"
              >
                <Ltr>support@lolys.com</Ltr>
              </a>
            </div>
          </div>
        </div>

        {/* Service Hours */}
        <section className="rounded-card border border-border bg-surface-2 p-5 space-y-3">
          <h2 className="text-h3 font-semibold text-text">ساعات العمل وخدمة العملاء</h2>
          <div className="space-y-1 text-body text-text-muted">
            <p>
              <strong className="text-text">أيام العمل:</strong> من السبت إلى الخميس
            </p>
            <p>
              <strong className="text-text">أوقات الرد:</strong> من الساعة <Ltr>10:00</Ltr> صباحًا
              حتى <Ltr>10:00</Ltr> مساءً بتوقيت القاهرة
            </p>
            <p className="text-caption text-text-muted pt-1">
              * الرسائل الواردة خلال أيام الجمعة أو العطلات الرسمية يتم الرد عليها في أول يوم عمل
              تالٍ.
            </p>
          </div>
        </section>

        {/* Quick Guidance */}
        <section className="space-y-4 border-t border-border pt-6">
          <h2 className="text-h3 font-semibold text-text">إرشادات سريعة لدعمك بسرعة</h2>
          <div className="space-y-3 text-small text-text-muted leading-relaxed">
            <p>
              • <strong className="text-text">استفسارات الشحنات الجارية:</strong> يرجى تزويدنا برقم
              الطلب المكون من أرقام (مثال: <Ltr>#1042</Ltr>) حتى نتمكن من تدقيق حالته فوريًا.
            </p>
            <p>
              • <strong className="text-text">طلبات حماية وتجهيل البيانات (DSR):</strong> أرسل
              بريدًا إلكترونيًا إلى <Ltr>privacy@lolys.com</Ltr> متضمنًا رقم هاتفك المسجل وعنوان
              بريدك، وسيتم إتمام الطلب وموافاتك بالتأكيد خلال مهلة لا تتجاوز 6 أيام عمل.
            </p>
          </div>
        </section>
      </div>
    </article>
  )
}
