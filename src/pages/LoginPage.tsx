import { Link } from 'react-router-dom'

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-h2 font-bold font-accent text-(--color-brand)">تسجيل الدخول</h1>
          <p className="text-small text-(--color-text-muted)">
            أدخل بريدك الإلكتروني لتسجيل الدخول إلى حسابك ومتابعة طلباتك.
          </p>
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email-input" className="text-small font-semibold text-(--color-text)">
              البريد الإلكتروني
            </label>
            <input
              id="email-input"
              type="email"
              placeholder="name@example.com"
              className="w-full h-11 rounded-(--radius-pill) border border-(--color-border-input) bg-(--color-bg) px-4 text-small text-(--color-text) focus:border-(--color-brand) focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="password-input"
              className="text-small font-semibold text-(--color-text)"
            >
              كلمة المرور
            </label>
            <input
              id="password-input"
              type="password"
              placeholder="••••••••"
              className="w-full h-11 rounded-(--radius-pill) border border-(--color-border-input) bg-(--color-bg) px-4 text-small text-(--color-text) focus:border-(--color-brand) focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
            />
          </div>

          <button
            type="submit"
            className="w-full h-11 rounded-(--radius-pill) bg-(--color-brand) text-small font-semibold text-(--color-brand-contrast) transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
          >
            دخول
          </button>
        </form>

        <div className="text-center text-small text-(--color-text-muted)">
          ليس لديك حساب؟{' '}
          <Link
            to="/login?mode=register"
            className="font-semibold text-(--color-brand) hover:underline"
          >
            إنشاء حساب جديد
          </Link>
        </div>
      </div>
    </div>
  )
}
