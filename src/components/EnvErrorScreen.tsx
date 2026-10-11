interface EnvErrorScreenProps {
  errors: string[]
  formattedMessage?: string | null
}

export function EnvErrorScreen({ errors, formattedMessage }: EnvErrorScreenProps) {
  return (
    <main
      role="alert"
      className="min-h-screen bg-(--color-bg) text-(--color-text) p-6 font-sans flex items-center justify-center"
      dir="rtl"
    >
      <div className="w-full max-w-2xl bg-(--color-surface) border border-(--color-danger) rounded-(--radius-card) p-8">
        <div className="flex items-center gap-3 text-(--color-danger) mb-4">
          <span className="text-h2" aria-hidden="true">
            ⚠️
          </span>
          <h1 className="text-h2 font-bold font-accent">
            خطأ في إعدادات البيئة (Environment Configuration)
          </h1>
        </div>

        <p className="text-(--color-text) mb-4 text-body leading-relaxed">
          تعذر بدء تشغيل التطبيق لأن بعض متغيرات البيئة المطلوبة غير محددة أو غير صالحة.
          <br />
          <span className="text-(--color-text-muted) text-small" dir="ltr">
            (The application failed to initialize because required environment variables are missing
            or invalid.)
          </span>
        </p>

        <div className="bg-(--color-surface-2) p-4 rounded-(--radius-chip) border border-(--color-border) mb-6">
          <h2 className="text-small font-bold text-(--color-danger) mb-2">
            الأخطاء المكتشفة (Validation Issues):
          </h2>
          <ul
            className="list-disc list-inside space-y-1 text-small text-(--color-danger)"
            dir="ltr"
          >
            {errors.map((err, i) => (
              <li key={i} className="font-mono">
                {err}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-(--color-surface-tint) p-4 rounded-(--radius-chip) border border-(--color-border) text-small space-y-2">
          <h2 className="font-bold text-(--color-brand)">طريقة الإصلاح (Resolution Steps):</h2>
          <ol className="list-decimal list-inside space-y-1 text-(--color-text-muted)" dir="rtl">
            <li>
              انسخ ملف النموذج{' '}
              <code className="font-mono text-(--color-brand) px-1 rounded-(--radius-chip) bg-(--color-surface-2)">
                .env.example
              </code>{' '}
              إلى{' '}
              <code className="font-mono text-(--color-brand) px-1 rounded-(--radius-chip) bg-(--color-surface-2)">
                .env
              </code>
            </li>
            <li>
              للتطوير المحلي، شغّل الأمر{' '}
              <code
                className="font-mono text-(--color-brand) px-1 rounded-(--radius-chip) bg-(--color-surface-2)"
                dir="ltr"
              >
                npx supabase status
              </code>{' '}
              للحصول على عنوان URL والمفتاح العام (anon key).
            </li>
            <li>
              أعد تشغيل خادم التطوير بعد تحديث القيم:{' '}
              <code
                className="font-mono text-(--color-brand) px-1 rounded-(--radius-chip) bg-(--color-surface-2)"
                dir="ltr"
              >
                npm run dev
              </code>
            </li>
          </ol>
        </div>

        {formattedMessage && (
          <details className="mt-4 text-small text-(--color-text-muted)">
            <summary className="cursor-pointer hover:text-(--color-text)">
              عرض رسالة الخطأ النصية (Raw output)
            </summary>
            <pre
              className="mt-2 p-3 bg-(--color-surface-2) rounded-(--radius-chip) text-caption overflow-x-auto whitespace-pre-wrap font-mono"
              dir="ltr"
            >
              {formattedMessage}
            </pre>
          </details>
        )}
      </div>
    </main>
  )
}
