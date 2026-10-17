import { Link } from 'react-router-dom'
import { RibbonBow } from '../components/ui/ornaments'
import { useLanguage } from '../i18n/LanguageProvider'
import { PublishedPolicy } from '../features/settings/PublishedPolicy'

const content = {
  ar: {
    seoTitle: 'سياسة الاستبدال والاسترجاع',
    seoDesc: 'سياسة الاستبدال والاسترجاع في متجر لوليز وفقًا لقانون حماية المستهلك المصري',
    title: 'سياسة الاستبدال والاسترجاع',
    intro:
      'حرصًا منا على تقديم تجربة تسوق مريحة وموثوقة، تخضع سياسة الاسترجاع في متجر لوليز لأحكام قانون حماية المستهلك المصري رقم 181 لسنة 2018.',
    sec1Title: '1. المهلة الزمنية والأهلية',
    sec1P1:
      'يحق للعميل طلب استبدال أو استرجاع المنتج خلال 14 يومًا من تاريخ استلام الشحنة، طالما كان المنتج بحالته الأصلية تمامًا.',
    sec1P1Bold: '14 يومًا',
    sec1P2:
      'في حال وجود أي عيب صناعة أو تلف أثناء الشحن أو عدم مطابقة للمواصفات المعروضة، تمتد مهلة الاستبدال أو الاسترجاع إلى 30 يومًا مع تحمل المتجر لكافة مصاريف الشحن الإضافية.',
    sec1P2Bold: '30 يومًا',
    sec2Title: '2. شروط قبول الاسترجاع',
    sec2List: [
      'أن يكون المنتج في حالته الأصلية غير مستخدم ولم يتم ارتداؤه أو تشغيله أو غسله.',
      'وجود الغلاف الأصلي، والصناديق، والأكياس، والبطاقات التعريفية والملحقات كاملة دون أي نزع.',
      'إرفاق فاتورة الشراء أو رقم الطلب الإلكتروني للتأكد من بيانات العملية.',
    ],
    sec3Title: '3. المنتجات المستثناة من الاسترجاع',
    sec3P:
      'وفقًا للضوابط الصحية وحماية للمستهلكين، يُستثنى من الاسترجاع (ما لم يكن بها عيب صناعة مثبت عند الاستلام):',
    sec3List: [
      'الأقراط والحلقان المخصصة لثقب الأذن لدواعي النظافة والسلامة الصحية.',
      'القطع التي تم تصنيعها أو تخصيصها خصيصًا بناءً على طلب العميل (Customized items).',
    ],
    sec4Title: '4. خطوات تقديم طلب الاسترجاع',
    sec4Step1Pre: 'تواصل مع فريق خدمة العملاء عبر الواتساب أو صفحة ',
    sec4Step1Link: 'تواصل معنا',
    sec4Step1Post: '.',
    sec4Step2: 'قدّم رقم الطلب وصورة واضحة للمنتج والغلاف لإثبات حالته.',
    sec4Step3:
      'سيتم فحص الطلب والتنسيق مع مندوب الشحن لاستلام القطعة المعنية خلال 2 إلى 4 أيام عمل.',
    sec5Title: '5. استرداد الأموال',
    sec5P: 'يتم فحص المنتجات المرتجعة فور وصولها إلى مقر المتجر للتأكد من سلامتها. عند القبول:',
    sec5InstaPayLabel: 'طلبات إنستاباي:',
    sec5InstaPayDesc: ' يتم رد المبلغ إلى نفس الحساب البنكي المحوّل منه خلال 3 إلى 5 أيام عمل.',
    sec5CodLabel: 'طلبات الدفع عند الاستلام:',
    sec5CodDesc:
      ' يتم رد المبلغ عبر إنستاباي أو محفظة إلكترونية مسجلة باسم العميل بعد التنسيق المسبق.',
  },
  en: {
    seoTitle: 'Return & Exchange Policy',
    seoDesc:
      "Return and exchange terms at Lolys' Accessories & Home in compliance with Egyptian consumer law",
    title: 'Return & Exchange Policy',
    intro:
      "To ensure a comfortable and trusted shopping experience, Lolys' return policy complies with the provisions of Egyptian Consumer Protection Law No. 181 of 2018.",
    sec1Title: '1. Timeframe & Eligibility',
    sec1P1:
      'Customers are entitled to request a return or exchange within 14 days of receiving the shipment, provided the item remains in its original, unused condition.',
    sec1P1Bold: '14 days',
    sec1P2:
      'In the event of a manufacturing defect, damage during transit, or non-conformity with listed specifications, the return or exchange window is extended to 30 days, with Lolys covering all additional shipping expenses.',
    sec1P2Bold: '30 days',
    sec2Title: '2. Return Acceptance Conditions',
    sec2List: [
      'The item must be in its original, pristine condition, unworn, unused, and unwashed.',
      'All original packaging, boxes, dust bags, authenticity tags, and included accessories must be intact and attached.',
      'Proof of purchase or the online order number must be provided to verify the transaction.',
    ],
    sec3Title: '3. Non-Returnable Items',
    sec3P:
      'In accordance with health and hygiene regulations, the following items cannot be returned (unless a manufacturing defect is proven upon delivery):',
    sec3List: [
      'Earrings and pierced jewelry for hygiene and health safety reasons.',
      'Custom-made, personalized, or custom-engraved pieces.',
    ],
    sec4Title: '4. How to Submit a Return Request',
    sec4Step1Pre: 'Reach out to our customer care team via WhatsApp or our ',
    sec4Step1Link: 'Contact Us',
    sec4Step1Post: ' page.',
    sec4Step2: 'Provide your order number and clear photos of the item and its packaging.',
    sec4Step3:
      'Our team will inspect the request and arrange a pickup with our courier within 2 to 4 business days.',
    sec5Title: '5. Refunds',
    sec5P:
      'Returned items are inspected upon arrival at our facility to verify their condition. Upon approval:',
    sec5InstaPayLabel: 'InstaPay Orders:',
    sec5InstaPayDesc:
      ' The amount will be refunded to the same bank account within 3 to 5 business days.',
    sec5CodLabel: 'Cash on Delivery Orders:',
    sec5CodDesc:
      ' The amount will be refunded via InstaPay or an electronic wallet registered in the customer’s name after prior coordination.',
  },
}

export default function ReturnsPage() {
  const { lang } = useLanguage()
  const c = content[lang === 'en' ? 'en' : 'ar']

  return (
    <PublishedPolicy route="returns" title={c.seoTitle} description={c.seoDesc}>
      <article className="mx-auto max-w-3xl space-y-8 pb-12">
        <div className="rounded-card border border-border bg-surface p-6 sm:p-10 space-y-8">
          {/* Header */}
          <header className="space-y-3 border-b border-border pb-6">
            <div className="flex items-center gap-3">
              <RibbonBow className="size-8 text-brand" />
              <h1 className="text-h1 font-bold font-accent text-brand">{c.title}</h1>
            </div>
            <p className="text-caption text-text-muted">{c.intro}</p>
          </header>

          {/* Section 1: Period and Eligibility */}
          <section className="space-y-4">
            <h2 className="text-h3 font-semibold text-text">{c.sec1Title}</h2>
            <div className="space-y-3 text-body text-text-muted leading-relaxed">
              <p>{c.sec1P1}</p>
              <p>{c.sec1P2}</p>
            </div>
          </section>

          {/* Section 2: Return Conditions */}
          <section className="space-y-4 rounded-card border border-border bg-surface-2 p-5 sm:p-6">
            <h2 className="text-h3 font-semibold text-brand">{c.sec2Title}</h2>
            <ul className="list-disc list-inside space-y-2 text-body text-text-muted leading-relaxed">
              {c.sec2List.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </section>

          {/* Section 3: Non-returnable Items */}
          <section className="space-y-4">
            <h2 className="text-h3 font-semibold text-text">{c.sec3Title}</h2>
            <p className="text-body text-text-muted leading-relaxed">{c.sec3P}</p>
            <ul className="list-disc list-inside space-y-2 text-body text-text-muted leading-relaxed">
              {c.sec3List.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </section>

          {/* Section 4: Return Process */}
          <section className="space-y-4">
            <h2 className="text-h3 font-semibold text-text">{c.sec4Title}</h2>
            <div className="space-y-3 text-body text-text-muted leading-relaxed">
              <ol className="list-decimal list-inside space-y-2">
                <li>
                  {c.sec4Step1Pre}
                  <Link to="/contact" className="text-brand underline hover:opacity-80">
                    {c.sec4Step1Link}
                  </Link>
                  {c.sec4Step1Post}
                </li>
                <li>{c.sec4Step2}</li>
                <li>{c.sec4Step3}</li>
              </ol>
            </div>
          </section>

          {/* Section 5: Refunds */}
          <section className="space-y-4 border-t border-border pt-6">
            <h2 className="text-h3 font-semibold text-text">{c.sec5Title}</h2>
            <div className="space-y-3 text-body text-text-muted leading-relaxed">
              <p>{c.sec5P}</p>
              <ul className="list-disc list-inside space-y-2 text-small">
                <li>
                  <strong className="text-text">{c.sec5InstaPayLabel}</strong>
                  {c.sec5InstaPayDesc}
                </li>
                <li>
                  <strong className="text-text">{c.sec5CodLabel}</strong>
                  {c.sec5CodDesc}
                </li>
              </ul>
            </div>
          </section>
        </div>
      </article>
    </PublishedPolicy>
  )
}
