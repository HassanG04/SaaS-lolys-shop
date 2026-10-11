export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-6 sm:p-10 space-y-6">
        <h1 className="text-h1 font-bold font-accent text-(--color-brand)">سياسة الخصوصية</h1>
        <div className="space-y-4 text-body text-(--color-text-muted) leading-relaxed">
          <p>نحن في متجر لوليز نلتزم بحماية خصوصية عملائنا وأمان بياناتهم الشخصية.</p>
          <h2 className="text-h3 font-semibold text-(--color-text)">البيانات التي نجمعها</h2>
          <p>
            نجمع البيانات الضرورية فقط لمعالجة وتوصيل طلباتكم، بما في ذلك الاسم، رقم الهاتف،
            العنوان، والبريد الإلكتروني. لا نشارك بياناتكم مع أي أطراف ثالثة باستثناء شركات التوصيل
            المعتمدة لتسليم شحناتكم.
          </p>
        </div>
      </div>
    </article>
  )
}
