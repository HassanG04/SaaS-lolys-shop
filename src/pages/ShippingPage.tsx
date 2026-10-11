export default function ShippingPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-6 sm:p-10 space-y-6">
        <h1 className="text-h1 font-bold font-accent text-(--color-brand)">الشحن والتوصيل</h1>
        <div className="space-y-4 text-body text-(--color-text-muted) leading-relaxed">
          <p>
            نوفر خدمة الشحن والتوصيل لجميع محافظات جمهورية مصر العربية من خلال البريد المصري ومندوبي
            التوصيل المعتمدين.
          </p>
          <h2 className="text-h3 font-semibold text-(--color-text)">مدة التوصيل</h2>
          <p>تستغرق الطلبات عادة من 2 إلى 5 أيام عمل وفقًا للمحافظة ومنطقة السكن.</p>
          <h2 className="text-h3 font-semibold text-(--color-text)">رسوم الشحن</h2>
          <p>
            تحتسب رسوم الشحن تلقائيًا بناءً على المحافظة وطريقة التوصيل المختارة أثناء إتمام الطلب.
          </p>
        </div>
      </div>
    </article>
  )
}
