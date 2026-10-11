export default function ReturnsPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-6 sm:p-10 space-y-6">
        <h1 className="text-h1 font-bold font-accent text-(--color-brand)">
          سياسة الاستبدال والاسترجاع
        </h1>
        <div className="space-y-4 text-body text-(--color-text-muted) leading-relaxed">
          <p>
            رضاكم هو أولويتنا. يمكنكم طلب استبدال أو استرجاع المنتجات خلال 14 يومًا من تاريخ
            الاستلام، بشرط أن تكون المنتجات بحالتها الأصلية وغير مستخدمة ومع تغليفها الأصلي.
          </p>
          <h2 className="text-h3 font-semibold text-(--color-text)">إجراءات الاسترجاع</h2>
          <p>
            تواصلوا مع خدمة العملاء عبر رقم الواتساب أو البريد الإلكتروني مع رقم الطلب وصور للمنتج
            للبدء في إجراءات الاسترجاع.
          </p>
        </div>
      </div>
    </article>
  )
}
