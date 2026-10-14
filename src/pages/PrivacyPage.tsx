import { Link } from 'react-router-dom'
import { RibbonBow } from '../components/ui/ornaments'

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-8 pb-12">
      <div className="rounded-card border border-border bg-surface p-6 sm:p-10 space-y-8">
        {/* Header */}
        <header className="space-y-3 border-b border-border pb-6">
          <div className="flex items-center gap-3">
            <RibbonBow className="size-8 text-brand" />
            <h1 className="text-h1 font-bold font-accent text-brand">سياسة الخصوصية</h1>
          </div>
          <p className="text-caption text-text-muted">
            آخر تحديث: أكتوبر 2026 — متوافقة مع قانون حماية البيانات الشخصية المصري رقم 151 لسنة
            2020
          </p>
        </header>

        {/* Section 1: Intro */}
        <section className="space-y-4">
          <h2 className="text-h3 font-semibold text-text">1. التزامنا تجاه خصوصيتك</h2>
          <p className="text-body text-text-muted leading-relaxed">
            في متجر لوليز للإكسسوارات والمنزل (Lolys&apos; Accessories &amp; Home)، نضع خصوصية وأمان
            بياناتك في صميم أولوياتنا. تهدف هذه السياسة إلى توضيح كيفية جمع واستخدام وحماية بياناتك
            الشخصية عند استخدامك لمتجرنا، وحقوقك القانونية الكاملة بموجب التشريعات المصرية ذات
            الصلة.
          </p>
        </section>

        {/* Section 2: Storage & Cookies Notice */}
        <section className="space-y-4 rounded-card border border-border bg-surface-2 p-5 sm:p-6">
          <h2 className="text-h3 font-semibold text-brand">
            2. إشعار التخزين المحلي وملفات تعريف الارتباط (Storage Notice)
          </h2>
          <div className="space-y-3 text-body text-text-muted leading-relaxed">
            <p className="font-medium text-text">
              نحن نؤمن بالتسوق النظيف والآمن دون أي تتبع إعلاني غير مرغوب فيه:
            </p>
            <ul className="list-disc list-inside space-y-2 ps-2">
              <li>
                <strong className="text-text">تفضيل المظهر (Theme):</strong> نحفظ خيارك للوضع الفاتح
                أو الداكن في التخزين المحلي لمتصفحك (<code className="text-caption">theme</code>).
              </li>
              <li>
                <strong className="text-text">سلة التسوق للزوار (Cart):</strong> نحفظ المنتجات التي
                تضيفها إلى سلتك في متصفحك (<code className="text-caption">cart:v1</code>) لضمان عدم
                فقدان اختياراتك عند تحديث الصفحة أو إغلاق المتصفح.
              </li>
              <li>
                <strong className="text-text">جلسة الدخول الآمنة (Session):</strong> في حال تسجيل
                دخولك، يتم حفظ رمز التحقق المشفر الخاص بالجلسة محليًا للحفاظ على أمان حسابك.
              </li>
            </ul>
            <div className="rounded-chip border border-border bg-surface p-4 text-small text-text">
              <p className="font-semibold text-success">
                ✓ متجر لوليز خالٍ تمامًا من ملفات تعريف الارتباط الإعلانية أو التتبعية الخارجية (No
                tracking cookies). نحن لا نستخدم أدوات تتبع جهات خارجية ولا نبيع بيانات تصفحك لأي
                طرف تجاري على الإطلاق.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Data We Collect */}
        <section className="space-y-4">
          <h2 className="text-h3 font-semibold text-text">3. البيانات التي نجمعها ولماذا</h2>
          <p className="text-body text-text-muted leading-relaxed">
            نجمع فقط الحد الأدنى من البيانات الضرورية للغاية لمعالجة طلباتك وتسليمها بأمان:
          </p>
          <ul className="list-disc list-inside space-y-2 ps-2 text-body text-text-muted leading-relaxed">
            <li>
              <strong className="text-text">بيانات الاتصال والتسجيل:</strong> الاسم الكامل، رقم
              الهاتف المحمول المصري، وعنوان البريد الإلكتروني (لتأكيد الطلبات وإرسال التحديثات).
            </li>
            <li>
              <strong className="text-text">عنوان التوصيل الدقيق:</strong> المحافظة، المدينة، الحي،
              اسم الشارع ورقم المبنى، والدور والشقة (لتسليم مشترياتك عبر البريد المصري أو مندوبي
              الشحن المعتمدين).
            </li>
            <li>
              <strong className="text-text">إثباتات الدفع الإلكتروني (إنستاباي):</strong> لقطة شاشة
              للتحويل البنكي ورقم المرجع، وتُرفع في مساحة تخزين مشفرة وخاصة لا يصل إليها سوى المشرف
              المعتمد للتحقق من السداد.
            </li>
          </ul>
        </section>

        {/* Section 4: Data Retention Schedule */}
        <section className="space-y-4">
          <h2 className="text-h3 font-semibold text-text">
            4. جدول الاحتفاظ بالبيانات (Data Retention Schedule)
          </h2>
          <p className="text-body text-text-muted leading-relaxed">
            تطبيقًا لمبدأ تقليل حفظ البيانات والامتثال للضوابط القانونية:
          </p>
          <div className="overflow-x-auto rounded-card border border-border">
            <table className="w-full text-start text-small text-text-muted">
              <thead className="border-b border-border bg-surface-2 text-text font-semibold">
                <tr>
                  <th scope="col" className="p-3 text-start">
                    نوع البيانات
                  </th>
                  <th scope="col" className="p-3 text-start">
                    فترة الاحتفاظ
                  </th>
                  <th scope="col" className="p-3 text-start">
                    الغرض والمسار
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="p-3 font-medium text-text">إثباتات تحويل إنستاباي</td>
                  <td className="p-3 text-brand font-semibold">90 يومًا بعد التسليم</td>
                  <td className="p-3">حذف آلي نهائي بعد انقضاء مهلة الاسترجاع والاستبدال</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-text">سجل العمليات والتدقيق الأمني</td>
                  <td className="p-3">سنتان (2 years)</td>
                  <td className="p-3">سجل غير قابل للتعديل لحماية أمان المنصة ورصد أي اختراق</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-text">السجلات المالية والمحاسبية</td>
                  <td className="p-3">5 سنوات</td>
                  <td className="p-3">
                    وفقًا لأحكام القانون التجاري والضريبي المصري مع تجهيل هوية العميل عند الطلب
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 5: Your Statutory Rights */}
        <section className="space-y-4">
          <h2 className="text-h3 font-semibold text-text">
            5. حقوقك القانونية بموجب قانون حماية البيانات (قانون 151 لسنة 2020)
          </h2>
          <p className="text-body text-text-muted leading-relaxed">
            يضمن لك القانون المصري ممارسة الحقوق التالية في أي وقت وبشكل مجاني:
          </p>
          <ul className="list-disc list-inside space-y-2 ps-2 text-body text-text-muted leading-relaxed">
            <li>
              <strong className="text-text">
                حق الاطلاع والحصول على البيانات (Access &amp; Export):
              </strong>{' '}
              يمكنك طلب نسخة إلكترونية كاملة ومقروءة من كافة بياناتك وسجل طلباتك المسجلة لدينا.
            </li>
            <li>
              <strong className="text-text">حق التصحيح والتعديل (Rectification):</strong> يمكنك
              تحديث بياناتك وعناوينك في أي وقت مباشرة من صفحة{' '}
              <Link to="/account" className="text-brand underline hover:opacity-80">
                تفاصيل الحساب
              </Link>
              .
            </li>
            <li>
              <strong className="text-text">حق المحو والتجهيل (Right to Erasure):</strong> يمكنك طلب
              حذف وتجهيل بياناتك الشخصية نهائيًا من خوادمنا عند إغلاق حسابك بعد اكتمال تسليم كافة
              طلباتك الجارية.
            </li>
          </ul>
        </section>

        {/* Section 6: How to Contact */}
        <section className="space-y-4 border-t border-border pt-6">
          <h2 className="text-h3 font-semibold text-text">6. تقديم الطلبات والاستفسارات</h2>
          <p className="text-body text-text-muted leading-relaxed">
            لممارسة أي من حقوقك أو تقديم استفسار يخص خصوصية بياناتك، يُرجى مراسلتنا عبر:
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <Link
              to="/contact"
              className="inline-flex h-11 items-center justify-center rounded-pill bg-brand px-6 text-small font-semibold text-brand-contrast transition-opacity hover:opacity-90"
            >
              صفحة التواصل والدعم
            </Link>
            <a
              href="mailto:privacy@lolys.com"
              className="inline-flex h-11 items-center justify-center rounded-pill border border-border bg-surface-2 px-6 text-small font-semibold text-text hover:border-brand"
            >
              privacy@lolys.com
            </a>
          </div>
        </section>
      </div>
    </article>
  )
}
