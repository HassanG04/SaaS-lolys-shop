import { useMemo, useState, type FormEvent } from 'react'
import { useLanguage } from '@/i18n/LanguageProvider'
import { formatEGP } from '@/lib/format'
import { PearlLoader } from '@/components/ui/PearlLoader'
import { ErrorPanel } from '@/components/ui/ErrorPanel'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/ToastProvider'
import type { DeliveryMethod, Governorate } from '@/features/delivery/types'
import { useAdminDeliveryData, useUpsertDeliveryFee, useDeleteDeliveryFee } from './hooks'
import type { EditFeeTarget } from './types'

export default function DeliveryFeesPage() {
  const { t, lang } = useLanguage()
  const toast = useToast()
  const { governorates, fees, gridRows, isLoading, error, refetch } = useAdminDeliveryData()

  const upsertMutation = useUpsertDeliveryFee()
  const deleteMutation = useDeleteDeliveryFee()

  const [searchQuery, setSearchQuery] = useState('')
  const [editTarget, setEditTarget] = useState<EditFeeTarget | null>(null)
  const [feeInput, setFeeInput] = useState('')
  const [feeError, setFeeError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{
    governorate: Governorate
    method: DeliveryMethod
  } | null>(null)

  // Filter grid rows by governorate search query
  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return gridRows
    return gridRows.filter(
      (row) =>
        row.governorate.name_ar.toLowerCase().includes(q) ||
        row.governorate.name_en.toLowerCase().includes(q),
    )
  }, [gridRows, searchQuery])

  // Count coverage statistics
  const stats = useMemo(() => {
    const egyptPostCount = fees.filter((f) => f.method === 'egypt_post').length
    const repCount = fees.filter((f) => f.method === 'representative').length
    const totalCount = fees.length
    return {
      egyptPostCount,
      repCount,
      totalCount,
      totalPossible: governorates.length * 2,
    }
  }, [fees, governorates.length])

  // Handle opening the Edit / Add dialog
  const handleOpenEdit = (
    governorate: Governorate,
    method: DeliveryMethod,
    currentFee: number | null,
  ) => {
    setEditTarget({ governorate, method, currentFee })
    setFeeInput(currentFee !== null ? String(currentFee) : '')
    setFeeError(null)
  }

  // Handle submitting the Edit / Add dialog
  const handleSaveFee = async (e: FormEvent) => {
    e.preventDefault()
    if (!editTarget) return

    const parsed = Number(feeInput)
    if (feeInput.trim() === '' || Number.isNaN(parsed)) {
      setFeeError(t.admin.feeInvalidError)
      return
    }

    if (parsed < 0) {
      setFeeError(t.admin.feeNegativeError)
      return
    }

    try {
      await upsertMutation.mutateAsync({
        governorateId: editTarget.governorate.id,
        method: editTarget.method,
        fee: parsed,
      })
      toast.success(t.admin.feeSavedSuccess)
      setEditTarget(null)
      setFeeInput('')
      setFeeError(null)
    } catch (err) {
      setFeeError(err instanceof Error ? err.message : t.admin.feeInvalidError)
    }
  }

  // Handle confirming deletion of a delivery fee
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return

    try {
      await deleteMutation.mutateAsync({
        governorateId: deleteTarget.governorate.id,
        method: deleteTarget.method,
      })
      toast.info(t.admin.feeRemovedSuccess)
      setDeleteTarget(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error removing fee')
    }
  }

  const getMethodName = (method: DeliveryMethod) => {
    return method === 'egypt_post' ? t.admin.egyptPost : t.admin.representative
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-6 sm:p-8 shadow-(--shadow-card)">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-h1 font-bold font-accent text-(--color-brand)">
              {t.admin.deliveryFeesTitle}
            </h1>
            <p className="mt-2 text-body text-(--color-text-muted)">{t.admin.deliveryFeesDesc}</p>
          </div>

          {/* Coverage Summary Stats */}
          <div className="flex flex-wrap gap-2 text-caption">
            <span className="inline-flex items-center gap-1.5 rounded-(--radius-pill) border border-(--color-border) bg-(--color-surface-2) px-3 py-1 font-medium text-(--color-text)">
              <span>{t.admin.coverageSummary}:</span>
              <span className="font-bold text-(--color-brand)">
                {stats.totalCount} / {stats.totalPossible}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-(--radius-pill) border border-(--color-border) bg-(--color-surface-2) px-3 py-1 text-(--color-text-muted)">
              <span>{t.admin.egyptPost}:</span>
              <span className="font-bold text-(--color-text)">
                {stats.egyptPostCount} / {governorates.length}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-(--radius-pill) border border-(--color-border) bg-(--color-surface-2) px-3 py-1 text-(--color-text-muted)">
              <span>{t.admin.representative}:</span>
              <span className="font-bold text-(--color-text)">
                {stats.repCount} / {governorates.length}
              </span>
            </span>
          </div>
        </div>

        {/* Filter bar */}
        <div className="mt-6 max-w-md">
          <label htmlFor="delivery-gov-search" className="sr-only">
            {t.admin.searchGovernorates}
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-(--color-text-muted)">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </span>
            <input
              id="delivery-gov-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.admin.searchGovernorates}
              className="h-10 w-full rounded-(--radius-pill) border border-(--color-border-input) bg-(--color-surface) pe-4 ps-9 text-small text-(--color-text) placeholder:text-(--color-text-muted) focus:border-(--color-brand) focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div
          role="status"
          aria-label="Loading delivery fees"
          className="flex h-64 w-full items-center justify-center text-(--color-brand)"
        >
          <PearlLoader loading />
        </div>
      ) : error ? (
        <ErrorPanel
          message={error.message}
          onRetry={() => void refetch()}
          retryLabel={t.ui.retry}
        />
      ) : filteredRows.length === 0 ? (
        <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-8 text-center text-(--color-text-muted)">
          {t.empty.search}
        </div>
      ) : (
        /* Delivery Grid Table */
        <div className="overflow-x-auto rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) shadow-(--shadow-card)">
          <table className="w-full text-start text-small" aria-label={t.admin.deliveryFeesTitle}>
            <thead className="border-b border-(--color-border) bg-(--color-surface-2) text-caption font-semibold text-(--color-text-muted)">
              <tr>
                <th scope="col" className="px-4 py-3.5 text-start font-semibold">
                  {t.admin.governorate}
                </th>
                <th scope="col" className="px-4 py-3.5 text-start font-semibold">
                  {t.admin.egyptPost}
                </th>
                <th scope="col" className="px-4 py-3.5 text-start font-semibold">
                  {t.admin.representative}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--color-border)">
              {filteredRows.map((row) => {
                const gov = row.governorate
                const postFee = row.fees.egypt_post
                const repFee = row.fees.representative

                return (
                  <tr
                    key={gov.id}
                    className="transition-colors hover:bg-(--color-surface-2)"
                    data-testid={`gov-row-${gov.id}`}
                  >
                    {/* Governorate Column */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-(--color-text)">{gov.name_ar}</span>
                        <span className="text-caption text-(--color-text-muted)">
                          ({gov.name_en})
                        </span>
                      </div>
                    </td>

                    {/* Egypt Post Method Column */}
                    <td className="px-4 py-3.5">
                      {postFee !== undefined ? (
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="font-bold text-(--color-text)">
                            {formatEGP(postFee, lang)}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(gov, 'egypt_post', postFee)}
                              aria-label={`${t.admin.editFee}: ${gov.name_ar} - ${t.admin.egyptPost}`}
                              className="rounded-(--radius-pill) border border-(--color-border-input) bg-(--color-surface) px-2.5 py-1 text-caption font-medium text-(--color-text) hover:border-(--color-brand) hover:text-(--color-brand) focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
                            >
                              {t.admin.editFee}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteTarget({ governorate: gov, method: 'egypt_post' })
                              }
                              aria-label={`${t.admin.removeFee}: ${gov.name_ar} - ${t.admin.egyptPost}`}
                              className="rounded-(--radius-pill) border border-(--color-border) bg-(--color-surface) px-2.5 py-1 text-caption font-medium text-(--color-danger) hover:bg-(--color-surface-tint) focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
                            >
                              {t.admin.removeFee}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-3">
                          <span
                            className="inline-flex items-center rounded-(--radius-chip) bg-(--color-surface-2) px-2.5 py-1 text-caption text-(--color-text-muted)"
                            aria-label={`${gov.name_ar} - ${t.admin.egyptPost}: ${t.admin.unavailable}`}
                          >
                            {t.admin.unavailable}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(gov, 'egypt_post', null)}
                            aria-label={`${t.admin.addFee}: ${gov.name_ar} - ${t.admin.egyptPost}`}
                            className="rounded-(--radius-pill) border border-(--color-border-input) bg-(--color-surface) px-2.5 py-1 text-caption font-medium text-(--color-brand) hover:border-(--color-brand) hover:bg-(--color-surface-2) focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
                          >
                            + {t.admin.addFee}
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Representative Method Column */}
                    <td className="px-4 py-3.5">
                      {repFee !== undefined ? (
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="font-bold text-(--color-text)">
                            {formatEGP(repFee, lang)}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(gov, 'representative', repFee)}
                              aria-label={`${t.admin.editFee}: ${gov.name_ar} - ${t.admin.representative}`}
                              className="rounded-(--radius-pill) border border-(--color-border-input) bg-(--color-surface) px-2.5 py-1 text-caption font-medium text-(--color-text) hover:border-(--color-brand) hover:text-(--color-brand) focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
                            >
                              {t.admin.editFee}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteTarget({ governorate: gov, method: 'representative' })
                              }
                              aria-label={`${t.admin.removeFee}: ${gov.name_ar} - ${t.admin.representative}`}
                              className="rounded-(--radius-pill) border border-(--color-border) bg-(--color-surface) px-2.5 py-1 text-caption font-medium text-(--color-danger) hover:bg-(--color-surface-tint) focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
                            >
                              {t.admin.removeFee}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-3">
                          <span
                            className="inline-flex items-center rounded-(--radius-chip) bg-(--color-surface-2) px-2.5 py-1 text-caption text-(--color-text-muted)"
                            aria-label={`${gov.name_ar} - ${t.admin.representative}: ${t.admin.unavailable}`}
                          >
                            {t.admin.unavailable}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(gov, 'representative', null)}
                            aria-label={`${t.admin.addFee}: ${gov.name_ar} - ${t.admin.representative}`}
                            className="rounded-(--radius-pill) border border-(--color-border-input) bg-(--color-surface) px-2.5 py-1 text-caption font-medium text-(--color-brand) hover:border-(--color-brand) hover:bg-(--color-surface-2) focus:outline-none focus:ring-2 focus:ring-(--color-focus)"
                          >
                            + {t.admin.addFee}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit / Add Fee Modal */}
      {editTarget && (
        <Dialog
          open={Boolean(editTarget)}
          title={editTarget.currentFee !== null ? t.admin.editFee : t.admin.addFee}
          description={`${editTarget.governorate.name_ar} — ${getMethodName(editTarget.method)}`}
          onClose={() => {
            setEditTarget(null)
            setFeeError(null)
          }}
        >
          <form onSubmit={handleSaveFee} noValidate className="space-y-4">
            <div>
              <Input
                id="fee-amount-input"
                label={t.admin.feeAmount}
                type="number"
                step="any"
                value={feeInput}
                onChange={(e) => {
                  setFeeInput(e.target.value)
                  if (feeError) setFeeError(null)
                }}
                required
              />
              {feeError && (
                <p role="alert" className="mt-1 text-caption text-(--color-danger)">
                  {feeError}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditTarget(null)
                  setFeeError(null)
                }}
              >
                {t.admin.cancel}
              </Button>
              <Button type="submit" variant="primary" disabled={upsertMutation.isPending}>
                {upsertMutation.isPending ? t.ui.loading : t.admin.saveFee}
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Remove Fee Confirmation Modal */}
      {deleteTarget && (
        <Dialog
          open={Boolean(deleteTarget)}
          title={t.admin.confirmRemoveFeeTitle}
          description={t.admin.confirmRemoveFeeDesc}
          onClose={() => setDeleteTarget(null)}
        >
          <div className="space-y-4">
            <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface-2) p-3 text-small">
              <span className="font-semibold text-(--color-text)">
                {deleteTarget.governorate.name_ar}
              </span>
              <span className="mx-2 text-(--color-text-muted)">•</span>
              <span className="text-(--color-brand)">{getMethodName(deleteTarget.method)}</span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setDeleteTarget(null)}>
                {t.admin.cancel}
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={deleteMutation.isPending}
                onClick={handleConfirmDelete}
              >
                {deleteMutation.isPending ? t.ui.loading : t.admin.confirmRemoveAction}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  )
}
