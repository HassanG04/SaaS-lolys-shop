import { Link } from 'react-router-dom'
import { RibbonBow } from '../components/ui/ornaments'
import { useLanguage } from '../i18n/LanguageProvider'
import { PublishedPolicy } from '../features/settings/PublishedPolicy'

const content = {
  ar: {
    seoTitle: 'الشحن والتوصيل',
    seoDesc: 'خيارات ومدد ورسوم الشحن والتوصيل لجميع محافظات مصر في متجر لوليز',
    title: 'الشحن والتوصيل',
    intro:
      'نوفر شحنًا آمنًا وسريعًا لجميع محافظات جمهورية مصر العربية لضمان وصول قطعك المفضلة بعناية وتغليف أنيق.',
    sec1Title: '1. التغطية وشركات الشحن',
    sec1P: 'نصل إلى جميع مدن ومحافظات مصر (27 محافظة) بالتعاون مع شركاء الشحن المعتمدين:',
    sec1PostLabel: 'البريد المصري (Egypt Post):',
    sec1PostDesc:
      ' تغطية شاملة لجميع المحافظات والمراكز والقرى مع تزويد العميل برقم تتبع رسمي لمتابعة حركة الطرد.',
    sec1CourierLabel: 'مندوبو التوصيل المعتمدون (Courier Representatives):',
    sec1CourierDesc:
      ' خدمة توصيل سريعة ومباشرة حتى باب المنزل في القاهرة الكبرى والإسكندرية والمحافظات الرئيسية مع تزويد العميل باسم ورقم هاتف المندوب عند خروج الشحنة للتسليم.',
    sec2Title: '2. المدد الزمنية المتوقعة للتسليم',
    sec2P: 'تبدأ المدة من تاريخ تأكيد الطلب وتجهيزه:',
    sec2Card1Title: 'القاهرة، الجيزة والإسكندرية',
    sec2Card1Desc: 'خلال 2 إلى 3 أيام عمل',
    sec2Card2Title: 'محافظات الدلتا والقناة والصعيد',
    sec2Card2Desc: 'خلال 3 إلى 5 أيام عمل',
    sec2Note: '* أيام العمل الرسمية هي من السبت إلى الخميس (مع استثناء العطلات الرسمية والأعياد).',
    sec3Title: '3. رسوم الشحن',
    sec3P1:
      'يتم احتساب رسوم الشحن بدقة وشفافية أثناء خطوة إتمام الطلب بناءً على المحافظة وطريقة التوصيل المختارة (البريد المصري أو المندوب).',
    sec3P2:
      'تظهر لك قيمة الشحن والإجمالي النهائي قبل تأكيد الطلب مباشرة، دون أي رسوم مخفية أو إضافية غير معلنة.',
    sec4Title: '4. استلام الشحنة والمعاينة',
    sec4Pre:
      'يُرجى التأكد من سلامة التغليف الخارجي قبل الاستلام. إذا لاحظت أي تلف ظاهر في الطرد أو المنتج، يُرجى التواصل معنا فورًا عبر صفحة ',
    sec4Link: 'تواصل معنا',
    sec4Post: ' لمعالجة الأمر في نفس اليوم.',
  },
  en: {
    seoTitle: 'Shipping & Delivery',
    seoDesc:
      "Shipping coverage, delivery times, and rates across Egypt for Lolys' Accessories & Home",
    title: 'Shipping & Delivery',
    intro:
      'We offer reliable and fast shipping across all governorates of Egypt, ensuring your favorite pieces arrive safely with elegant packaging.',
    sec1Title: '1. Coverage & Delivery Partners',
    sec1P:
      'We deliver to all cities and governorates across Egypt (27 governorates) in partnership with certified carriers:',
    sec1PostLabel: 'Egypt Post:',
    sec1PostDesc:
      ' Comprehensive coverage across all governorates, centers, and towns, complete with an official tracking number for order tracking.',
    sec1CourierLabel: 'Direct Couriers:',
    sec1CourierDesc:
      ' Direct door-to-door delivery in Greater Cairo, Alexandria, and major regional centers, complete with the courier representative’s name and phone number upon dispatch.',
    sec2Title: '2. Estimated Delivery Timeframes',
    sec2P: 'Delivery time begins once your order has been confirmed and packed:',
    sec2Card1Title: 'Cairo, Giza & Alexandria',
    sec2Card1Desc: 'Within 2 to 3 business days',
    sec2Card2Title: 'Delta, Canal & Upper Egypt',
    sec2Card2Desc: 'Within 3 to 5 business days',
    sec2Note:
      '* Official working days are Saturday through Thursday (excluding official public holidays).',
    sec3Title: '3. Shipping Rates',
    sec3P1:
      'Shipping fees are calculated accurately and transparently at checkout based on your destination governorate and selected delivery method (Egypt Post or courier).',
    sec3P2:
      'The exact shipping cost and final total are displayed prior to confirming your order, with zero hidden or surprise fees.',
    sec4Title: '4. Parcel Receipt & Inspection',
    sec4Pre:
      'Please inspect the exterior parcel condition before receiving your delivery. If you notice any visible damage to the packaging or product, please contact us immediately via our ',
    sec4Link: 'Contact Us',
    sec4Post: ' page for same-day resolution.',
  },
}

export default function ShippingPage() {
  const { lang } = useLanguage()
  const c = content[lang === 'en' ? 'en' : 'ar']

  return (
    <PublishedPolicy route="shipping" title={c.seoTitle} description={c.seoDesc}>
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

          {/* Section 1: Coverage and Carriers */}
          <section className="space-y-4">
            <h2 className="text-h3 font-semibold text-text">{c.sec1Title}</h2>
            <div className="space-y-3 text-body text-text-muted leading-relaxed">
              <p>{c.sec1P}</p>
              <ul className="list-disc list-inside space-y-2 ps-2">
                <li>
                  <strong className="text-text">{c.sec1PostLabel}</strong>
                  {c.sec1PostDesc}
                </li>
                <li>
                  <strong className="text-text">{c.sec1CourierLabel}</strong>
                  {c.sec1CourierDesc}
                </li>
              </ul>
            </div>
          </section>

          {/* Section 2: Delivery Times */}
          <section className="space-y-4 rounded-card border border-border bg-surface-2 p-5 sm:p-6">
            <h2 className="text-h3 font-semibold text-brand">{c.sec2Title}</h2>
            <div className="space-y-3 text-body text-text-muted leading-relaxed">
              <p>{c.sec2P}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="rounded-chip border border-border bg-surface p-4">
                  <h3 className="font-semibold text-text mb-1">{c.sec2Card1Title}</h3>
                  <p className="text-small text-brand font-medium">{c.sec2Card1Desc}</p>
                </div>
                <div className="rounded-chip border border-border bg-surface p-4">
                  <h3 className="font-semibold text-text mb-1">{c.sec2Card2Title}</h3>
                  <p className="text-small text-brand font-medium">{c.sec2Card2Desc}</p>
                </div>
              </div>
              <p className="text-caption text-text-muted pt-2">{c.sec2Note}</p>
            </div>
          </section>

          {/* Section 3: Shipping Fees */}
          <section className="space-y-4">
            <h2 className="text-h3 font-semibold text-text">{c.sec3Title}</h2>
            <div className="space-y-3 text-body text-text-muted leading-relaxed">
              <p>{c.sec3P1}</p>
              <p>{c.sec3P2}</p>
            </div>
          </section>

          {/* Section 4: Receipt and Inspection */}
          <section className="space-y-4 border-t border-border pt-6">
            <h2 className="text-h3 font-semibold text-text">{c.sec4Title}</h2>
            <div className="space-y-3 text-body text-text-muted leading-relaxed">
              <p>
                {c.sec4Pre}
                <Link to="/contact" className="text-brand underline hover:opacity-80">
                  {c.sec4Link}
                </Link>
                {c.sec4Post}
              </p>
            </div>
          </section>
        </div>
      </article>
    </PublishedPolicy>
  )
}
