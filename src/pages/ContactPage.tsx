import { RibbonBow } from '../components/ui/ornaments'
import { Ltr } from '../components/ui/Ltr'
import { useLanguage } from '../i18n/LanguageProvider'
import { PublishedPolicy, PublishedPolicyTitle } from '../features/settings/PublishedPolicy'

const content = {
  ar: {
    seoTitle: 'تواصل معنا',
    seoDesc:
      'تواصل مع فريق خدمة عملاء متجر لوليز للإكسسوارات والمنزل عبر الواتساب والبريد الإلكتروني',
    title: 'تواصل معنا',
    intro:
      'يسعدنا دائمًا الاستماع إليك والإجابة عن كافة استفساراتك حول المنتجات، وحالة طلباتك، أو مساعدتك في أي طلب يتعلق بخدماتنا.',
    waTitle: 'واتساب',
    waBadge: 'الأسرع ردًا',
    waDesc: 'تواصل مباشرة مع فريق الدعم للمساعدة في الطلبات وتأكيد الدفع.',
    waBtn: 'محادثة واتساب مباشرة',
    emailTitle: 'البريد الإلكتروني',
    emailDesc: 'للشكاوى الرسمية، وطلبات حماية وتجهيل البيانات الشخصية، والشراكات.',
    hoursTitle: 'ساعات العمل وخدمة العملاء',
    hoursDaysLabel: 'أيام العمل:',
    hoursDaysVal: 'من السبت إلى الخميس',
    hoursTimeLabel: 'أوقات الرد:',
    hoursTimeValPrefix: 'من الساعة ',
    hoursTimeValFrom: '10:00',
    hoursTimeValMid: ' صباحًا حتى ',
    hoursTimeValTo: '10:00',
    hoursTimeValSuffix: ' مساءً بتوقيت القاهرة',
    hoursNote:
      '* الرسائل الواردة خلال أيام الجمعة أو العطلات الرسمية يتم الرد عليها في أول يوم عمل تالٍ.',
    guidanceTitle: 'إرشادات سريعة لدعمك بسرعة',
    guidanceTip1Label: 'استفسارات الشحنات الجارية:',
    guidanceTip1Text:
      ' يرجى تزويدنا برقم الطلب المكون من أرقام (مثال: #1042) حتى نتمكن من تدقيق حالته فوريًا.',
    guidanceTip2Label: 'طلبات حماية وتجهيل البيانات (DSR):',
    guidanceTip2Pre: ' أرسل بريدًا إلكترونيًا إلى ',
    guidanceTip2Post:
      ' متضمنًا رقم هاتفك المسجل وعنوان بريدك، وسيتم إتمام الطلب وموافاتك بالتأكيد خلال مهلة لا تتجاوز 6 أيام عمل.',
  },
  en: {
    seoTitle: 'Contact Us',
    seoDesc:
      "Get in touch with Lolys' Accessories & Home customer support team via WhatsApp and email",
    title: 'Contact Us',
    intro:
      'We are always delighted to hear from you and answer questions regarding our pieces, order status, or help with any customer inquiries.',
    waTitle: 'WhatsApp',
    waBadge: 'Fastest Response',
    waDesc: 'Chat directly with our support team for order inquiries and payment confirmation.',
    waBtn: 'Direct WhatsApp Chat',
    emailTitle: 'Email Support',
    emailDesc: 'For formal inquiries, personal data privacy requests, and business partnerships.',
    hoursTitle: 'Working Hours & Customer Service',
    hoursDaysLabel: 'Working Days:',
    hoursDaysVal: 'Saturday to Thursday',
    hoursTimeLabel: 'Response Hours:',
    hoursTimeValPrefix: 'From ',
    hoursTimeValFrom: '10:00',
    hoursTimeValMid: ' AM to ',
    hoursTimeValTo: '10:00',
    hoursTimeValSuffix: ' PM (Cairo Time)',
    hoursNote:
      '* Inquiries received on Fridays or public holidays are responded to on the following working day.',
    guidanceTitle: 'Quick Tips for Faster Assistance',
    guidanceTip1Label: 'Current Order Inquiries:',
    guidanceTip1Text:
      ' Please have your order number ready (e.g., #1042) so we can inspect status right away.',
    guidanceTip2Label: 'Data Subject Requests (DSR):',
    guidanceTip2Pre: ' Send an email to ',
    guidanceTip2Post:
      ' with your registered phone number and email address; requests are processed and confirmed within 6 business days.',
  },
}

export default function ContactPage() {
  const { lang } = useLanguage()
  const c = content[lang === 'en' ? 'en' : 'ar']

  return (
    <PublishedPolicy route="contact" title={c.seoTitle} description={c.seoDesc}>
      <article className="mx-auto max-w-3xl space-y-8 pb-12">
        <div className="rounded-card border border-border bg-surface p-6 sm:p-10 space-y-8">
          {/* Header */}
          <header className="space-y-3 border-b border-border pb-6 text-center sm:text-start">
            <div className="flex items-center justify-center sm:justify-start gap-3">
              <RibbonBow className="size-8 text-brand" />
              <h1 className="text-h1 font-bold font-accent text-brand">
                <PublishedPolicyTitle fallback={c.title} />
              </h1>
            </div>
            <p className="text-body text-text-muted leading-relaxed">{c.intro}</p>
          </header>

          {/* Contact Channels Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* WhatsApp Card */}
            <div className="rounded-card border border-border bg-surface-2 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-h3 font-bold text-brand">{c.waTitle}</span>
                <span className="rounded-chip bg-surface px-2 py-0.5 text-caption font-semibold text-success">
                  {c.waBadge}
                </span>
              </div>
              <p className="text-small text-text-muted">{c.waDesc}</p>
              <div className="pt-2">
                <a
                  href="https://wa.me/201011119999"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center justify-center rounded-pill bg-brand px-5 text-small font-semibold text-brand-contrast transition-opacity hover:opacity-90"
                >
                  {c.waBtn}
                </a>
              </div>
            </div>

            {/* Email Card */}
            <div className="rounded-card border border-border bg-surface-2 p-5 space-y-3">
              <span className="text-h3 font-bold text-brand">{c.emailTitle}</span>
              <p className="text-small text-text-muted">{c.emailDesc}</p>
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
            <h2 className="text-h3 font-semibold text-text">{c.hoursTitle}</h2>
            <div className="space-y-1 text-body text-text-muted">
              <p>
                <strong className="text-text">{c.hoursDaysLabel}</strong> {c.hoursDaysVal}
              </p>
              <p>
                <strong className="text-text">{c.hoursTimeLabel}</strong> {c.hoursTimeValPrefix}
                <Ltr>{c.hoursTimeValFrom}</Ltr>
                {c.hoursTimeValMid}
                <Ltr>{c.hoursTimeValTo}</Ltr>
                {c.hoursTimeValSuffix}
              </p>
              <p className="text-caption text-text-muted pt-1">{c.hoursNote}</p>
            </div>
          </section>

          {/* Quick Guidance */}
          <section className="space-y-4 border-t border-border pt-6">
            <h2 className="text-h3 font-semibold text-text">{c.guidanceTitle}</h2>
            <div className="space-y-3 text-small text-text-muted leading-relaxed">
              <p>
                • <strong className="text-text">{c.guidanceTip1Label}</strong>
                {c.guidanceTip1Text}
              </p>
              <p>
                • <strong className="text-text">{c.guidanceTip2Label}</strong>
                {c.guidanceTip2Pre}
                <Ltr>privacy@lolys.com</Ltr>
                {c.guidanceTip2Post}
              </p>
            </div>
          </section>
        </div>
      </article>
    </PublishedPolicy>
  )
}
