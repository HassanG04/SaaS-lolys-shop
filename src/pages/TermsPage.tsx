import { Link } from 'react-router-dom'
import { RibbonBow } from '../components/ui/ornaments'

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-8 pb-12">
      <div className="rounded-card border border-border bg-surface p-6 sm:p-10 space-y-8">
        {/* Header */}
        <header className="space-y-3 border-b border-border pb-6">
          <div className="flex items-center gap-3">
            <RibbonBow className="size-8 text-brand" />
            <h1 className="text-h1 font-bold font-accent text-brand">الشروط والأحكام</h1>
          </div>
          <p className="text-caption text-text-muted">
            أهلاً بكم في متجر لوليز للإكسسوارات والمنزل (Lolys&apos; Accessories &amp; Home).
            باستخدامك للموقع أو إتمام أي عملية شراء، فإنك تقر وتوافق على الالتزام بالشروط والأحكام
            التالية.
          </p>
        </header>

        {/* Section 1: Ordering and Contract */}
        <section className="space-y-4">
          <h2 className="text-h3 font-semibold text-text">1. أهلية الشراء والتعاقد</h2>
          <div className="space-y-3 text-body text-text-muted leading-relaxed">
            <p>
              يُشترط في المشتري أن يكون متمتعًا بالأهلية القانونية الكاملة لإبرام العقود، وأن يقدم
              بيانات اتصال وعنوان توصيل دقيقة وكاملة داخل جمهورية مصر العربية.
            </p>
            <p>
              تعتبر جميع الطلبات المقدمة عبر الموقع عروضًا للشراء، ويتم تأكيد التعاقد بعد مراجعة
              الطلب والموافقة عليه أو إتمام السداد بنجاح.
            </p>
          </div>
        </section>

        {/* Section 2: Pricing and Currency */}
        <section className="space-y-4">
          <h2 className="text-h3 font-semibold text-text">2. الأسعار والعملة والمخزون</h2>
          <div className="space-y-3 text-body text-text-muted leading-relaxed">
            <p>
              جميع الأسعار المعروضة على الموقع مقومة بـ{' '}
              <strong className="text-text">الجنيه المصري (EGP)</strong> وتشمل الضرائب المطبقة.
            </p>
            <p>
              تخضع المنتجات المعروضة لمدى توفر المخزون في لحظة معالجة الطلب. وفي حال نفاد كمية أي
              منتج أثناء إتمام الإجراءات، يتم إبلاغ العميل فورًا مع إمكانية تعديل الطلب أو استرداد
              أي مبالغ مدفوعة.
            </p>
          </div>
        </section>

        {/* Section 3: Payment Methods & Order Approval Flow */}
        <section className="space-y-4 rounded-card border border-border bg-surface-2 p-5 sm:p-6">
          <h2 className="text-h3 font-semibold text-brand">3. طرق الدفع وآلية مراجعة الطلبات</h2>
          <div className="space-y-4 text-body text-text-muted leading-relaxed">
            <div>
              <h3 className="font-semibold text-text mb-1">
                أ. الدفع عند الاستلام (Cash on Delivery - COD):
              </h3>
              <p>
                يقوم العميل بسداد إجمالي قيمة الطلب ورسوم الشحن نقدًا لمندوب التوصيل أو موظف البريد
                المصري عند استلام الشحنة.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-text mb-1">ب. الدفع عبر إنستاباي (InstaPay QR):</h3>
              <p>
                يخضع طلب إنستاباي للمراجعة والموافقة المسبقة من إدارة المتجر. فور الموافقة، تظهر
                للعميل بيانات التحويل (عنوان إنستاباي الرسمي ورمز الاستجابة السريعة QR الخاص
                بالمتجر) مع مهلة سداد محددة (24 ساعة افتراضيًا).
              </p>
              <p className="pt-2 text-small">
                يلتزم العميل برفع صورة واضحة لإثبات التحويل المصرفي متضمنة رقم العملية المرجعي قبل
                انقضاء المهلة لتفادي إلغاء الطلب آليًا واستعادة المنتجات للمخزون.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Shipping and Delivery */}
        <section className="space-y-4">
          <h2 className="text-h3 font-semibold text-text">4. الشحن والتوصيل</h2>
          <p className="text-body text-text-muted leading-relaxed">
            يتم التوصيل إلى العنوان المسجل أثناء إتمام الطلب من خلال البريد المصري أو مندوبي التوصيل
            المعتمدين. لمزيد من التفاصيل حول المدد ورسوم الشحن لكل محافظة، يُرجى مراجعة{' '}
            <Link to="/shipping" className="text-brand underline hover:opacity-80">
              صفحة الشحن والتوصيل
            </Link>
            .
          </p>
        </section>

        {/* Section 5: Returns and Cancellations */}
        <section className="space-y-4">
          <h2 className="text-h3 font-semibold text-text">5. الإلغاء والاسترجاع والاستبدال</h2>
          <div className="space-y-3 text-body text-text-muted leading-relaxed">
            <p>
              يحق للعميل إلغاء طلبه مجانًا طالما كان الطلب في حالة &quot;قيد المراجعة&quot;
              (Pending) قبل بدء تجهيزه أو تسليمه لشركة الشحن.
            </p>
            <p>
              تخضع عمليات الاسترجاع والاستبدال لأحكام قانون حماية المستهلك المصري، ويمكن طلبها خلال
              14 يومًا من استلام الشحنة وفقًا للشروط الموضحة في{' '}
              <Link to="/returns" className="text-brand underline hover:opacity-80">
                سياسة الاستبدال والاسترجاع
              </Link>
              .
            </p>
          </div>
        </section>

        {/* Section 6: Intellectual Property */}
        <section className="space-y-4 border-t border-border pt-6">
          <h2 className="text-h3 font-semibold text-text">6. الملكية الفكرية والعلامة التجارية</h2>
          <p className="text-body text-text-muted leading-relaxed">
            كافة العلامات التجارية، والشعارات، والصور، والنصوص، والتصاميم الخاصة بمتجر لوليز
            (Lolys&apos;) هي ملكية حصرية للمتجر ومحمية بموجب قوانين الملكية الفكرية، ولا يجوز نسخها
            أو استخدامها دون إذن كتابي مسبق.
          </p>
        </section>
      </div>
    </article>
  )
}
