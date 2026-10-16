interface EnvErrorScreenProps {
  errors: string[]
  formattedMessage?: string | null
}

const cCls = 'font-mono text-brand px-1 rounded-chip bg-surface-2'

export function EnvErrorScreen({ errors, formattedMessage }: EnvErrorScreenProps) {
  return (
    <main
      role="alert"
      className="min-h-screen bg-bg text-text p-6 flex items-center justify-center"
      dir="rtl"
    >
      <div className="w-full max-w-2xl bg-surface border border-danger rounded-card p-8">
        <div className="flex items-center gap-3 text-danger mb-4">
          <span className="text-h2" aria-hidden="true">
            ⚠️
          </span>
          <h1 className="text-h2 font-bold font-accent">
            خطأ في إعدادات البيئة (Environment Configuration)
          </h1>
        </div>
        <p className="mb-4 text-body leading-relaxed">
          تعذر بدء تشغيل التطبيق لأن بعض متغيرات البيئة المطلوبة غير محددة أو غير صالحة.
          <br />
          <span className="text-text-muted text-small" dir="ltr">
            (The application failed to initialize because required environment variables are missing
            or invalid.)
          </span>
        </p>
        <div className="bg-surface-2 p-4 rounded-chip border border-border mb-6">
          <h2 className="text-small font-bold text-danger mb-2">
            الأخطاء المكتشفة (Validation Issues):
          </h2>
          <ul
            className="list-disc list-inside space-y-1 text-small text-danger font-mono"
            dir="ltr"
          >
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
        <div className="bg-surface-tint p-4 rounded-chip border border-border text-small space-y-2">
          <h2 className="font-bold text-brand">طريقة الإصلاح (Resolution Steps):</h2>
          <ol className="list-decimal list-inside space-y-1 text-text-muted" dir="rtl">
            <li>
              انسخ ملف النموذج <code className={cCls}>.env.example</code> إلى{' '}
              <code className={cCls}>.env</code>
            </li>
            <li>
              للتطوير المحلي، شغّل الأمر{' '}
              <code className={cCls} dir="ltr">
                npx supabase status
              </code>{' '}
              للحصول على عنوان URL والمفتاح العام (anon key).
            </li>
            <li>
              أعد تشغيل خادم التطوير بعد تحديث القيم:{' '}
              <code className={cCls} dir="ltr">
                npm run dev
              </code>
            </li>
          </ol>
        </div>
        {formattedMessage && (
          <details className="mt-4 text-small text-text-muted">
            <summary className="cursor-pointer hover:text-text">
              عرض رسالة الخطأ النصية (Raw output)
            </summary>
            <pre
              className="mt-2 p-3 bg-surface-2 rounded-chip text-caption overflow-x-auto whitespace-pre-wrap font-mono"
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
