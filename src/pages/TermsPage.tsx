export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-6 sm:p-10 space-y-6">
        <h1 className="text-h1 font-bold font-accent text-(--color-brand)">الشروط والأحكام</h1>
        <div className="space-y-4 text-body text-(--color-text-muted) leading-relaxed">
          <p>
            أهلاً بكم في متجر لوليز. باستخدامكم لموقعنا وإتمام عمليات الشراء، فإنكم توافقون على
            الشروط والأحكام التالية:
          </p>
          <h2 className="text-h3 font-semibold text-(--color-text)">1. الطلبات والأسعار</h2>
          <p>
            تخضع جميع الأسعار المعروضة على الموقع للعملة الرسمية (الجنيه المصري). نحتفظ بالحق في
            تعديل الأسعار وتحديث توفر المخزون في أي وقت دون إشعار مسبق.
          </p>
          <h2 className="text-h3 font-semibold text-(--color-text)">2. الدفع والتأكيد</h2>
          <p>
            يتم تأكيد الطلب فور استلام الدفع أو تأكيد بيانات التوصيل في حالة الدفع عند الاستلام.
            بالنسبة لطلبات إنستاباي، يجب رفع إثبات التحويل خلال المدة المحددة للطلب.
          </p>
        </div>
      </div>
    </article>
  )
}
