import { Link } from 'react-router-dom'
import { RibbonBow } from '../components/ui/ornaments'
import { useLanguage } from '../i18n/LanguageProvider'
import { PublishedPolicy } from '../features/settings/PublishedPolicy'

const content = {
  ar: {
    seoTitle: 'الشروط والأحكام',
    seoDesc: 'الشروط والأحكام وضوابط التعاقد والشراء في متجر لوليز للإكسسوارات والمنزل',
    title: 'الشروط والأحكام',
    intro:
      "أهلاً بكم في متجر لوليز للإكسسوارات والمنزل (Lolys' Accessories & Home). باستخدامك للموقع أو إتمام أي عملية شراء، فإنك تقر وتوافق على الالتزام بالشروط والأحكام التالية.",
    sec1Title: '1. أهلية الشراء والتعاقد',
    sec1P1:
      'يُشترط في المشتري أن يكون متمتعًا بالأهلية القانونية الكاملة لإبرام العقود، وأن يقدم بيانات اتصال وعنوان توصيل دقيقة وكاملة داخل جمهورية مصر العربية.',
    sec1P2:
      'تعتبر جميع الطلبات المقدمة عبر الموقع عروضًا للشراء، ويتم تأكيد التعاقد بعد مراجعة الطلب والموافقة عليه أو إتمام السداد بنجاح.',
    sec2Title: '2. الأسعار والعملة والمخزون',
    sec2P1Prefix: 'جميع الأسعار المعروضة على الموقع مقومة بـ ',
    sec2P1Bold: 'الجنيه المصري (EGP)',
    sec2P1Suffix: ' وتشمل الضرائب المطبقة.',
    sec2P2:
      'تخضع المنتجات المعروضة لمدى توفر المخزون في لحظة معالجة الطلب. وفي حال نفاد كمية أي منتج أثناء إتمام الإجراءات، يتم إبلاغ العميل فورًا مع إمكانية تعديل الطلب أو استرداد أي مبالغ مدفوعة.',
    sec3Title: '3. طرق الدفع وآلية مراجعة الطلبات',
    sec3Sub1Title: 'أ. الدفع عند الاستلام (Cash on Delivery - COD):',
    sec3Sub1P:
      'يقوم العميل بسداد إجمالي قيمة الطلب ورسوم الشحن نقدًا لمندوب التوصيل أو موظف البريد المصري عند استلام الشحنة.',
    sec3Sub2Title: 'ب. الدفع عبر إنستاباي (InstaPay QR):',
    sec3Sub2P1:
      'يخضع طلب إنستاباي للمراجعة والموافقة المسبقة من إدارة المتجر. فور الموافقة، تظهر للعميل بيانات التحويل (عنوان إنستاباي الرسمي ورمز الاستجابة السريعة QR الخاص بالمتجر) مع مهلة سداد محددة (24 ساعة افتراضيًا).',
    sec3Sub2P2:
      'يلتزم العميل برفع صورة واضحة لإثبات التحويل المصرفي متضمنة رقم العملية المرجعي قبل انقضاء المهلة لتفادي إلغاء الطلب آليًا واستعادة المنتجات للمخزون.',
    sec4Title: '4. الشحن والتوصيل',
    sec4Pre:
      'يتم التوصيل إلى العنوان المسجل أثناء إتمام الطلب من خلال البريد المصري أو مندوبي التوصيل المعتمدين. لمزيد من التفاصيل حول المدد ورسوم الشحن لكل محافظة، يُرجى مراجعة ',
    sec4Link: 'صفحة الشحن والتوصيل',
    sec4Post: '.',
    sec5Title: '5. الإلغاء والاسترجاع والاستبدال',
    sec5P1:
      'يحق للعميل إلغاء طلبه مجانًا طالما كان الطلب في حالة "قيد المراجعة" (Pending) قبل بدء تجهيزه أو تسليمه لشركة الشحن.',
    sec5P2Pre:
      'تخضع عمليات الاسترجاع والاستبدال لأحكام قانون حماية المستهلك المصري، ويمكن طلبها خلال 14 يومًا من استلام الشحنة وفقًا للشروط الموضحة في ',
    sec5P2Link: 'سياسة الاستبدال والاسترجاع',
    sec5P2Post: '.',
    sec6Title: '6. الملكية الفكرية والعلامة التجارية',
    sec6P:
      "كافة العلامات التجارية، والشعارات، والصور، والنصوص، والتصاميم الخاصة بمتجر لوليز (Lolys') هي ملكية حصرية للمتجر ومحمية بموجب قوانين الملكية الفكرية، ولا يجوز نسخها أو استخدامها دون إذن كتابي مسبق.",
  },
  en: {
    seoTitle: 'Terms & Conditions',
    seoDesc:
      "Terms and conditions, sale contract rules, and ordering guidelines at Lolys' Accessories & Home",
    title: 'Terms & Conditions',
    intro:
      "Welcome to Lolys' Accessories & Home. By accessing the store or completing any purchase, you acknowledge and agree to comply with the following terms and conditions.",
    sec1Title: '1. Purchasing Eligibility & Contracting',
    sec1P1:
      'Customers must possess full legal capacity to enter into binding agreements and provide accurate contact and delivery information within the Arab Republic of Egypt.',
    sec1P2:
      'All orders placed through the website constitute purchase offers. The contract is finalized upon administrative review and approval or successful payment completion.',
    sec2Title: '2. Pricing, Currency & Inventory',
    sec2P1Prefix: 'All prices displayed on the store are quoted in ',
    sec2P1Bold: 'Egyptian Pounds (EGP)',
    sec2P1Suffix: ' and include applicable taxes.',
    sec2P2:
      'Listed products are subject to stock availability at the time of processing. Should an item become unavailable, the customer is notified immediately with options to modify the order or receive a refund.',
    sec3Title: '3. Payment Methods & Order Approval Workflow',
    sec3Sub1Title: 'A. Cash on Delivery (COD):',
    sec3Sub1P:
      'The customer settles the full order amount and shipping fee in cash to the courier representative or Egypt Post agent upon delivery.',
    sec3Sub2Title: 'B. InstaPay (QR Payment):',
    sec3Sub2P1:
      'Orders paid via InstaPay are subject to prior review and approval by store management. Once approved, payment credentials (official handle and QR code) are displayed with a defined payment deadline (24 hours by default).',
    sec3Sub2P2:
      'Customers must upload a clear screenshot of the bank transfer including the transaction reference before the deadline expires to prevent automatic cancellation and return of items to stock.',
    sec4Title: '4. Shipping & Delivery',
    sec4Pre:
      'Deliveries are dispatched to the address registered during checkout via Egypt Post or certified delivery couriers. For detailed delivery windows and fees by governorate, please visit our ',
    sec4Link: 'Shipping & Delivery',
    sec4Post: ' page.',
    sec5Title: '5. Cancellations, Returns & Exchanges',
    sec5P1:
      'Customers are entitled to cancel an order free of charge while its status remains "Pending" prior to preparation or handover to the shipping carrier.',
    sec5P2Pre:
      'Returns and exchanges comply with the Egyptian Consumer Protection Law and may be requested within 14 days of delivery according to the conditions stated in our ',
    sec5P2Link: 'Return & Exchange Policy',
    sec5P2Post: '.',
    sec6Title: '6. Intellectual Property & Trademarks',
    sec6P:
      "All trademarks, logos, images, descriptions, and designs associated with Lolys' Accessories & Home are exclusive store property protected under intellectual property laws and may not be reproduced without prior written permission.",
  },
}

export default function TermsPage() {
  const { lang } = useLanguage()
  const c = content[lang === 'en' ? 'en' : 'ar']

  return (
    <PublishedPolicy route="terms" title={c.seoTitle} description={c.seoDesc}>
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

          {/* Section 1: Ordering and Contract */}
          <section className="space-y-4">
            <h2 className="text-h3 font-semibold text-text">{c.sec1Title}</h2>
            <div className="space-y-3 text-body text-text-muted leading-relaxed">
              <p>{c.sec1P1}</p>
              <p>{c.sec1P2}</p>
            </div>
          </section>

          {/* Section 2: Pricing and Currency */}
          <section className="space-y-4">
            <h2 className="text-h3 font-semibold text-text">{c.sec2Title}</h2>
            <div className="space-y-3 text-body text-text-muted leading-relaxed">
              <p>
                {c.sec2P1Prefix}
                <strong className="text-text">{c.sec2P1Bold}</strong>
                {c.sec2P1Suffix}
              </p>
              <p>{c.sec2P2}</p>
            </div>
          </section>

          {/* Section 3: Payment Methods & Order Approval Flow */}
          <section className="space-y-4 rounded-card border border-border bg-surface-2 p-5 sm:p-6">
            <h2 className="text-h3 font-semibold text-brand">{c.sec3Title}</h2>
            <div className="space-y-4 text-body text-text-muted leading-relaxed">
              <div>
                <h3 className="font-semibold text-text mb-1">{c.sec3Sub1Title}</h3>
                <p>{c.sec3Sub1P}</p>
              </div>
              <div>
                <h3 className="font-semibold text-text mb-1">{c.sec3Sub2Title}</h3>
                <p>{c.sec3Sub2P1}</p>
                <p className="pt-2 text-small">{c.sec3Sub2P2}</p>
              </div>
            </div>
          </section>

          {/* Section 4: Shipping and Delivery */}
          <section className="space-y-4">
            <h2 className="text-h3 font-semibold text-text">{c.sec4Title}</h2>
            <p className="text-body text-text-muted leading-relaxed">
              {c.sec4Pre}
              <Link to="/shipping" className="text-brand underline hover:opacity-80">
                {c.sec4Link}
              </Link>
              {c.sec4Post}
            </p>
          </section>

          {/* Section 5: Returns and Cancellations */}
          <section className="space-y-4">
            <h2 className="text-h3 font-semibold text-text">{c.sec5Title}</h2>
            <div className="space-y-3 text-body text-text-muted leading-relaxed">
              <p>{c.sec5P1}</p>
              <p>
                {c.sec5P2Pre}
                <Link to="/returns" className="text-brand underline hover:opacity-80">
                  {c.sec5P2Link}
                </Link>
                {c.sec5P2Post}
              </p>
            </div>
          </section>

          {/* Section 6: Intellectual Property */}
          <section className="space-y-4 border-t border-border pt-6">
            <h2 className="text-h3 font-semibold text-text">{c.sec6Title}</h2>
            <p className="text-body text-text-muted leading-relaxed">{c.sec6P}</p>
          </section>
        </div>
      </article>
    </PublishedPolicy>
  )
}
