import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/i18n/LanguageProvider'
import { ProductImage } from '@/features/catalog/components/ProductImage'
import { ErrorMessage, toAppError, type AppError } from '@/lib/errors'
import { replaceProductImage } from './api'
import type { AdminProduct } from './types'

export function ProductPhotoButton({ product }: { product: AdminProduct }) {
  const { lang } = useLanguage()
  const input = useRef<HTMLInputElement>(null)
  const client = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<AppError | null>(null)
  const name = lang === 'ar' ? product.name_ar || product.name : product.name
  const label = lang === 'ar' ? `تغيير صورة ${name}` : `Change photo for ${name}`
  const save = async (file: File) => {
    setBusy(true)
    setError(null)
    try {
      await replaceProductImage(file, product.id)
      await client.invalidateQueries({ queryKey: ['admin', 'products'] })
      await client.invalidateQueries({ queryKey: ['admin', 'product', product.id] })
      await client.invalidateQueries({ queryKey: ['catalog'] })
    } catch (failure) {
      setError(toAppError(failure))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div>
      <button
        type="button"
        aria-label={label}
        title={label}
        disabled={busy}
        aria-busy={busy}
        onClick={() => input.current?.click()}
        className="block size-16 overflow-hidden rounded-image border border-border hover:border-brand disabled:opacity-50"
      >
        <ProductImage src={product.image_url} alt={name} className="size-full" />
      </button>
      <input
        ref={input}
        className="hidden"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label={label}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0]
          event.currentTarget.value = ''
          if (file) void save(file)
        }}
      />
      {error && <ErrorMessage error={error} />}
    </div>
  )
}
