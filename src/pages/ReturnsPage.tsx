import { Link } from 'react-router-dom'
import { RibbonBow } from '../components/ui/ornaments'

export default function ReturnsPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-8 pb-12">
      <div className="rounded-card border border-border bg-surface p-6 sm:p-10 space-y-8">
        {/* Header */}
        <header className="space-y-3 border-b border-border pb-6">
          <div className="flex items-center gap-3">
            <RibbonBow className="size-8 text-brand" />
            <h1 className="text-h1 font-bold font-accent text-brand">سياسة الاستبدال والاسترجاع</h1>
          </div>
          <p className="text-caption text-text-muted">
            حرصًا منا على تقديم تجربة تسوق مريحة وموثوقة، تخضع سياسة الاسترجاع في متجر لوليز لأحكام
            قانون حماية المستهلك المصري رقم 181 لسنة 2018.
          </p>
        </header>

        {/* Section 1: Period and Eligibility */}
        <section className="space-y-4">
          <h2 className="text-h3 font-semibold text-text">1. المهلة الزمنية والأهلية</h2>
          <div className="space-y-3 text-body text-text-muted leading-relaxed">
            <p>
              يحق للعميل طلب استبدال أو استرجاع المنتج خلال{' '}
              <strong className="text-text">14 يومًا</strong> من تاريخ استلام الشحنة، طالما كان
              المنتج بحالته الأصلية تمامًا.
            </p>
            <p>
              في حال وجود أي عيب صناعة أو تلف أثناء الشحن أو عدم مطابقة للمواصفات المعروضة، تمتد
              مهلة الاستبدال أو الاسترجاع إلى <strong className="text-text">30 يومًا</strong> مع
              تحمل المتجر لكافة مصاريف الشحن الإضافية.
            </p>
          </div>
        </section>

        {/* Section 2: Return Conditions */}
        <section className="space-y-4 rounded-card border border-border bg-surface-2 p-5 sm:p-6">
          <h2 className="text-h3 font-semibold text-brand">2. شروط قبول الاسترجاع</h2>
          <ul className="list-disc list-inside space-y-2 text-body text-text-muted leading-relaxed">
            <li>أن يكون المنتج في حالته الأصلية غير مستخدم ولم يتم ارتداؤه أو تشغيله أو غسله.</li>
            <li>
              وجود الغلاف الأصلي، والصناديق، والأكياس، والبطاقات التعريفية والملحقات كاملة دون أي
              نزع.
            </li>
            <li>إرفاق فاتورة الشراء أو رقم الطلب الإلكتروني للتأكد من بيانات العملية.</li>
          </ul>
        </section>

        {/* Section 3: Non-returnable Items */}
        <section className="space-y-4">
          <h2 className="text-h3 font-semibold text-text">3. المنتجات المستثناة من الاسترجاع</h2>
          <p className="text-body text-text-muted leading-relaxed">
            وفقًا للضوابط الصحية وحماية للمستهلكين، يُستثنى من الاسترجاع (ما لم يكن بها عيب صناعة
            مثبت عند الاستلام):
          </p>
          <ul className="list-disc list-inside space-y-2 text-body text-text-muted leading-relaxed">
            <li>الأقراط والحلقان المخصصة لثقب الأذن لدواعي النظافة والسلامة الصحية.</li>
            <li>
              القطع التي تم تصنيعها أو تخصيصها خصيصًا بناءً على طلب العميل (Customized items).
            </li>
          </ul>
        </section>

        {/* Section 4: Return Process */}
        <section className="space-y-4">
          <h2 className="text-h3 font-semibold text-text">4. خطوات تقديم طلب الاسترجاع</h2>
          <div className="space-y-3 text-body text-text-muted leading-relaxed">
            <ol className="list-decimal list-inside space-y-2">
              <li>
                تواصل مع فريق خدمة العملاء عبر الواتساب أو صفحة{' '}
                <Link to="/contact" className="text-brand underline hover:opacity-80">
                  تواصل معنا
                </Link>
                .
              </li>
              <li>قدّم رقم الطلب وصورة واضحة للمنتج والغلاف لإثبات حالته.</li>
              <li>
                سيتم فحص الطلب والتنسيق مع مندوب الشحن لاستلام القطعة المعنية خلال 2 إلى 4 أيام عمل.
              </li>
            </ol>
          </div>
        </section>

        {/* Section 5: Refunds */}
        <section className="space-y-4 border-t border-border pt-6">
          <h2 className="text-h3 font-semibold text-text">5. استرداد الأموال</h2>
          <div className="space-y-3 text-body text-text-muted leading-relaxed">
            <p>
              يتم فحص المنتجات المرتجعة فور وصولها إلى مقر المتجر للتأكد من سلامتها. عند القبول:
            </p>
            <ul className="list-disc list-inside space-y-2 text-small">
              <li>
                <strong className="text-text">طلبات إنستاباي:</strong> يتم رد المبلغ إلى نفس الحساب
                البنكي المحوّل منه خلال 3 إلى 5 أيام عمل.
              </li>
              <li>
                <strong className="text-text">طلبات الدفع عند الاستلام:</strong> يتم رد المبلغ عبر
                إنستاباي أو محفظة إلكترونية مسجلة باسم العميل بعد التنسيق المسبق.
              </li>
            </ul>
          </div>
        </section>
      </div>
    </article>
  )
}
