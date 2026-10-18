import { Link } from 'react-router-dom'
import { RibbonBow } from '../components/ui/ornaments'
import { useLanguage } from '../i18n/LanguageProvider'
import { PublishedPolicy, PublishedPolicyTitle } from '../features/settings/PublishedPolicy'

const content = {
  ar: {
    seoTitle: 'سياسة الخصوصية',
    seoDesc:
      'سياسة الخصوصية وحماية البيانات الشخصية وإشعار التخزين المحلي في متجر لوليز وفقًا لقانون 151 لسنة 2020',
    title: 'سياسة الخصوصية',
    subtitle:
      'آخر تحديث: أكتوبر 2026 — متوافقة مع قانون حماية البيانات الشخصية المصري رقم 151 لسنة 2020',
    sec1Title: '1. التزامنا تجاه خصوصيتك',
    sec1P:
      "في متجر لوليز للإكسسوارات والمنزل (Lolys' Accessories & Home)، نضع خصوصية وأمان بياناتك في صميم أولوياتنا. تهدف هذه السياسة إلى توضيح كيفية جمع واستخدام وحماية بياناتك الشخصية عند استخدامك لمتجرنا، وحقوقك القانونية الكاملة بموجب التشريعات المصرية ذات الصلة.",
    sec2Title: '2. إشعار التخزين المحلي وملفات تعريف الارتباط (Storage Notice)',
    sec2Intro: 'نحن نؤمن بالتسوق النظيف والآمن دون أي تتبع إعلاني غير مرغوب فيه:',
    sec2ThemeLabel: 'تفضيل المظهر (Theme):',
    sec2ThemeDesc: ' نحفظ خيارك للوضع الفاتح أو الداكن في التخزين المحلي لمتصفحك (',
    sec2ThemeCode: 'theme',
    sec2ThemeDescSuffix: ').',
    sec2CartLabel: 'سلة التسوق للزوار (Cart):',
    sec2CartDesc: ' نحفظ المنتجات التي تضيفها إلى سلتك في متصفحك (',
    sec2CartCode: 'cart:v1',
    sec2CartDescSuffix: ') لضمان عدم فقدان اختياراتك عند تحديث الصفحة أو إغلاق المتصفح.',
    sec2SessionLabel: 'جلسة الدخول الآمنة (Session):',
    sec2SessionDesc:
      ' في حال تسجيل دخولك، يتم حفظ رمز التحقق المشفر الخاص بالجلسة محليًا للحفاظ على أمان حسابك.',
    sec2BadgeText:
      '✓ متجر لوليز خالٍ تمامًا من ملفات تعريف الارتباط الإعلانية أو التتبعية الخارجية (No tracking cookies). نحن لا نستخدم أدوات تتبع جهات خارجية ولا نبيع بيانات تصفحك لأي طرف تجاري على الإطلاق.',
    sec3Title: '3. البيانات التي نجمعها ولماذا',
    sec3Intro: 'نجمع فقط الحد الأدنى من البيانات الضرورية للغاية لمعالجة طلباتك وتسليمها بأمان:',
    sec3ContactLabel: 'بيانات الاتصال والتسجيل:',
    sec3ContactDesc:
      ' الاسم الكامل، رقم الهاتف المحمول المصري، وعنوان البريد الإلكتروني (لتأكيد الطلبات وإرسال التحديثات).',
    sec3AddressLabel: 'عنوان التوصيل الدقيق:',
    sec3AddressDesc:
      ' المحافظة، المدينة، الحي، اسم الشارع ورقم المبنى، والدور والشقة (لتسليم مشترياتك عبر البريد المصري أو مندوبي الشحن المعتمدين).',
    sec3ProofLabel: 'إثباتات الدفع الإلكتروني (إنستاباي):',
    sec3ProofDesc:
      ' لقطة شاشة للتحويل البنكي ورقم المرجع، وتُرفع في مساحة تخزين مشفرة وخاصة لا يصل إليها سوى المشرف المعتمد للتحقق من السداد.',
    sec4Title: '4. جدول الاحتفاظ بالبيانات (Data Retention Schedule)',
    sec4Intro: 'تطبيقًا لمبدأ تقليل حفظ البيانات والامتثال للضوابط القانونية:',
    sec4Col1: 'نوع البيانات',
    sec4Col2: 'فترة الاحتفاظ',
    sec4Col3: 'الغرض والمسار',
    sec4Row1Type: 'إثباتات تحويل إنستاباي',
    sec4Row1Period: '90 يومًا بعد التسليم',
    sec4Row1Purpose: 'حذف آلي نهائي بعد انقضاء مهلة الاسترجاع والاستبدال',
    sec4Row2Type: 'سجل العمليات والتدقيق الأمني',
    sec4Row2Period: 'سنتان (2 years)',
    sec4Row2Purpose: 'سجل غير قابل للتعديل لحماية أمان المنصة ورصد أي اختراق',
    sec4Row3Type: 'السجلات المالية والمحاسبية',
    sec4Row3Period: '5 سنوات',
    sec4Row3Purpose: 'وفقًا لأحكام القانون التجاري والضريبي المصري مع تجهيل هوية العميل عند الطلب',
    sec4Row4Type: 'إشعارات العميل داخل التطبيق',
    sec4Row4Period: '90 يومًا',
    sec4Row4Purpose: 'حذف آلي دوري وتطهير فوري عند إغلاق أو حذف الحساب',
    sec4Row5Type: 'اقتراحات وآراء العملاء',
    sec4Row5Period: '12 شهرًا',
    sec4Row5Purpose: 'فك الارتباط وتجهيل الهوية تلقائيًا بعد 12 شهرًا أو عند حذف الحساب',
    sec5Title: '5. حقوقك القانونية بموجب قانون حماية البيانات (قانون 151 لسنة 2020)',
    sec5Intro: 'يضمن لك القانون المصري ممارسة الحقوق التالية في أي وقت وبشكل مجاني:',
    sec5Right1Label: 'حق الاطلاع والحصول على البيانات (Access & Export):',
    sec5Right1Desc:
      ' يمكنك طلب نسخة إلكترونية كاملة ومقروءة من كافة بياناتك وسجل طلباتك المسجلة لدينا.',
    sec5Right2Label: 'حق التصحيح والتعديل (Rectification):',
    sec5Right2Pre: ' يمكنك تحديث بياناتك وعناوينك في أي وقت مباشرة من صفحة ',
    sec5Right2Link: 'تفاصيل الحساب',
    sec5Right2Post: '.',
    sec5Right3Label: 'حق المحو والتجهيل (Right to Erasure):',
    sec5Right3Desc:
      ' يمكنك طلب حذف وتجهيل بياناتك الشخصية نهائيًا من خوادمنا عند إغلاق حسابك بعد اكتمال تسليم كافة طلباتك الجارية.',
    sec6Title: '6. تقديم الطلبات والاستفسارات',
    sec6Intro: 'لممارسة أي من حقوقك أو تقديم استفسار يخص خصوصية بياناتك، يُرجى مراسلتنا عبر:',
    sec6ContactBtn: 'صفحة التواصل والدعم',
  },
  en: {
    seoTitle: 'Privacy Policy',
    seoDesc:
      "Privacy policy, local storage notice, and statutory data rights at Lolys' Accessories & Home under Law 151/2020",
    title: 'Privacy Policy',
    subtitle:
      'Last updated: October 2026 — In compliance with the Egyptian Personal Data Protection Law No. 151 of 2020',
    sec1Title: '1. Our Commitment to Your Privacy',
    sec1P:
      "At Lolys' Accessories & Home, safeguarding your privacy and data security is our top priority. This policy explains how we collect, process, and protect your personal information when using our store, alongside your statutory rights under applicable Egyptian data protection laws.",
    sec2Title: '2. Local Storage Notice & Cookies',
    sec2Intro: 'We are committed to a clean, tracking-free shopping experience:',
    sec2ThemeLabel: 'Theme Preference (Theme):',
    sec2ThemeDesc:
      ' We store your preference for light or dark mode in your browser’s local storage (',
    sec2ThemeCode: 'theme',
    sec2ThemeDescSuffix: ').',
    sec2CartLabel: 'Guest Cart (Cart):',
    sec2CartDesc: ' We store your bag items locally in your browser (',
    sec2CartCode: 'cart:v1',
    sec2CartDescSuffix: ') so your selections are preserved across visits.',
    sec2SessionLabel: 'Secure Session (Session):',
    sec2SessionDesc:
      ' When signed in, an encrypted authentication token is kept securely to maintain your login session.',
    sec2BadgeText:
      '✓ Lolys’ store is completely free of third-party advertising cookies and commercial tracking scripts (No tracking cookies). We never use third-party behavioral trackers or sell personal browsing information.',
    sec3Title: '3. Data We Collect & Why',
    sec3Intro:
      'We collect only the strictly necessary minimum required to fulfill and deliver your purchases safely:',
    sec3ContactLabel: 'Contact & Account Details:',
    sec3ContactDesc:
      ' Full name, Egyptian mobile phone number, and email address (for order confirmation and delivery status updates).',
    sec3AddressLabel: 'Precise Delivery Address:',
    sec3AddressDesc:
      ' Governorate, city, district, street name, building number, floor, and apartment (to dispatch shipments via Egypt Post or certified couriers).',
    sec3ProofLabel: 'Payment Verification Proofs (InstaPay):',
    sec3ProofDesc:
      ' Bank transfer screenshot and transaction reference, uploaded to a private encrypted bucket accessible strictly by verified administrators.',
    sec4Title: '4. Data Retention Schedule',
    sec4Intro: 'Pursuant to data minimization and legal compliance requirements:',
    sec4Col1: 'Data Category',
    sec4Col2: 'Retention Window',
    sec4Col3: 'Purpose & Disposition',
    sec4Row1Type: 'InstaPay Transfer Proofs',
    sec4Row1Period: '90 days after delivery',
    sec4Row1Purpose: 'Permanent automatic purge once return/exchange eligibility expires',
    sec4Row2Type: 'System Audit & Security Logs',
    sec4Row2Period: '2 years',
    sec4Row2Purpose:
      'Immutable record for platform security, fraud prevention, and audit compliance',
    sec4Row3Type: 'Commercial & Financial Invoices',
    sec4Row3Period: '5 years',
    sec4Row3Purpose:
      'Required by Egyptian commercial and tax legislation, with personal identifiers anonymized upon request',
    sec4Row4Type: 'In-App Customer Notifications',
    sec4Row4Period: '90 days',
    sec4Row4Purpose: 'Automatic periodic purge and immediate removal upon account closure',
    sec4Row5Type: 'Customer Suggestions & Feedback',
    sec4Row5Period: '12 months',
    sec4Row5Purpose:
      'Anonymized and disassociated from user identity after 12 months or upon account closure',
    sec5Title: '5. Your Statutory Rights (Law No. 151 of 2020)',
    sec5Intro:
      'Egyptian law guarantees your right to exercise the following at any time free of charge:',
    sec5Right1Label: 'Right of Access & Portability (Access & Export):',
    sec5Right1Desc:
      ' You may request a complete, machine-readable digital export of all your stored profile data and order history.',
    sec5Right2Label: 'Right to Rectification (Rectification):',
    sec5Right2Pre:
      ' You may update your profile information and delivery addresses at any time in ',
    sec5Right2Link: 'Account Details',
    sec5Right2Post: '.',
    sec5Right3Label: 'Right to Erasure & Anonymization (Right to Erasure):',
    sec5Right3Desc:
      ' You may request the permanent deletion and anonymization of your personal data upon closing your account after all active orders have concluded.',
    sec6Title: '6. Inquiries & Exercising Your Rights',
    sec6Intro:
      'To exercise any statutory right or submit a privacy inquiry, please contact us via:',
    sec6ContactBtn: 'Contact & Support Page',
  },
}

export default function PrivacyPage() {
  const { lang } = useLanguage()
  const c = content[lang === 'en' ? 'en' : 'ar']

  return (
    <PublishedPolicy route="privacy" title={c.seoTitle} description={c.seoDesc}>
      <article className="mx-auto max-w-3xl space-y-8 pb-12">
        <div className="rounded-card border border-border bg-surface p-6 sm:p-10 space-y-8">
          {/* Header */}
          <header className="space-y-3 border-b border-border pb-6">
            <div className="flex items-center gap-3">
              <RibbonBow className="size-8 text-brand" />
              <h1 className="text-h1 font-bold font-accent text-brand">
                <PublishedPolicyTitle fallback={c.title} />
              </h1>
            </div>
            <p className="text-caption text-text-muted">{c.subtitle}</p>
          </header>

          {/* Section 1: Intro */}
          <section className="space-y-4">
            <h2 className="text-h3 font-semibold text-text">{c.sec1Title}</h2>
            <p className="text-body text-text-muted leading-relaxed">{c.sec1P}</p>
          </section>

          {/* Section 2: Storage & Cookies Notice */}
          <section className="space-y-4 rounded-card border border-border bg-surface-2 p-5 sm:p-6">
            <h2 className="text-h3 font-semibold text-brand">{c.sec2Title}</h2>
            <div className="space-y-3 text-body text-text-muted leading-relaxed">
              <p className="font-medium text-text">{c.sec2Intro}</p>
              <ul className="list-disc list-inside space-y-2 ps-2">
                <li>
                  <strong className="text-text">{c.sec2ThemeLabel}</strong>
                  {c.sec2ThemeDesc}
                  <code className="text-caption">{c.sec2ThemeCode}</code>
                  {c.sec2ThemeDescSuffix}
                </li>
                <li>
                  <strong className="text-text">{c.sec2CartLabel}</strong>
                  {c.sec2CartDesc}
                  <code className="text-caption">{c.sec2CartCode}</code>
                  {c.sec2CartDescSuffix}
                </li>
                <li>
                  <strong className="text-text">{c.sec2SessionLabel}</strong>
                  {c.sec2SessionDesc}
                </li>
              </ul>
              <div className="rounded-chip border border-border bg-surface p-4 text-small text-text">
                <p className="font-semibold text-success">{c.sec2BadgeText}</p>
              </div>
            </div>
          </section>

          {/* Section 3: Data We Collect */}
          <section className="space-y-4">
            <h2 className="text-h3 font-semibold text-text">{c.sec3Title}</h2>
            <p className="text-body text-text-muted leading-relaxed">{c.sec3Intro}</p>
            <ul className="list-disc list-inside space-y-2 ps-2 text-body text-text-muted leading-relaxed">
              <li>
                <strong className="text-text">{c.sec3ContactLabel}</strong>
                {c.sec3ContactDesc}
              </li>
              <li>
                <strong className="text-text">{c.sec3AddressLabel}</strong>
                {c.sec3AddressDesc}
              </li>
              <li>
                <strong className="text-text">{c.sec3ProofLabel}</strong>
                {c.sec3ProofDesc}
              </li>
            </ul>
          </section>

          {/* Section 4: Data Retention Schedule */}
          <section className="space-y-4">
            <h2 className="text-h3 font-semibold text-text">{c.sec4Title}</h2>
            <p className="text-body text-text-muted leading-relaxed">{c.sec4Intro}</p>
            <div className="overflow-x-auto rounded-card border border-border">
              <table className="w-full text-start text-small text-text-muted">
                <thead className="border-b border-border bg-surface-2 text-text font-semibold">
                  <tr>
                    <th scope="col" className="p-3 text-start">
                      {c.sec4Col1}
                    </th>
                    <th scope="col" className="p-3 text-start">
                      {c.sec4Col2}
                    </th>
                    <th scope="col" className="p-3 text-start">
                      {c.sec4Col3}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="p-3 font-medium text-text">{c.sec4Row1Type}</td>
                    <td className="p-3 text-brand font-semibold">{c.sec4Row1Period}</td>
                    <td className="p-3">{c.sec4Row1Purpose}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-text">{c.sec4Row2Type}</td>
                    <td className="p-3">{c.sec4Row2Period}</td>
                    <td className="p-3">{c.sec4Row2Purpose}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-text">{c.sec4Row3Type}</td>
                    <td className="p-3">{c.sec4Row3Period}</td>
                    <td className="p-3">{c.sec4Row3Purpose}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-text">{c.sec4Row4Type}</td>
                    <td className="p-3 text-brand font-semibold">{c.sec4Row4Period}</td>
                    <td className="p-3">{c.sec4Row4Purpose}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-text">{c.sec4Row5Type}</td>
                    <td className="p-3">{c.sec4Row5Period}</td>
                    <td className="p-3">{c.sec4Row5Purpose}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 5: Your Statutory Rights */}
          <section className="space-y-4">
            <h2 className="text-h3 font-semibold text-text">{c.sec5Title}</h2>
            <p className="text-body text-text-muted leading-relaxed">{c.sec5Intro}</p>
            <ul className="list-disc list-inside space-y-2 ps-2 text-body text-text-muted leading-relaxed">
              <li>
                <strong className="text-text">{c.sec5Right1Label}</strong>
                {c.sec5Right1Desc}
              </li>
              <li>
                <strong className="text-text">{c.sec5Right2Label}</strong>
                {c.sec5Right2Pre}
                <Link to="/account" className="text-brand underline hover:opacity-80">
                  {c.sec5Right2Link}
                </Link>
                {c.sec5Right2Post}
              </li>
              <li>
                <strong className="text-text">{c.sec5Right3Label}</strong>
                {c.sec5Right3Desc}
              </li>
            </ul>
          </section>

          {/* Section 6: How to Contact */}
          <section className="space-y-4 border-t border-border pt-6">
            <h2 className="text-h3 font-semibold text-text">{c.sec6Title}</h2>
            <p className="text-body text-text-muted leading-relaxed">{c.sec6Intro}</p>
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link
                to="/contact"
                className="inline-flex h-11 items-center justify-center rounded-pill bg-brand px-6 text-small font-semibold text-brand-contrast transition-opacity hover:opacity-90"
              >
                {c.sec6ContactBtn}
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
    </PublishedPolicy>
  )
}
