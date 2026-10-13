import { supabase } from '@/lib/supabase'
import { toAppError } from '@/lib/errors'
import type {
  AdminPaymentOrder,
  PaymentReviewFilter,
  ReviewPaymentPayload,
  PurgeProofsResult,
} from './types'

/**
 * Fetches admin payment orders with filters and search.
 * When filtering for `under_review`, results are sorted oldest first
 * (ascending) per FIFO review requirements.
 */
export async function getAdminPaymentOrders(
  filters?: PaymentReviewFilter,
): Promise<AdminPaymentOrder[]> {
  try {
    let query = supabase.from('orders').select('*').eq('payment_method', 'instapay_qr')

    const status = filters?.status ?? 'under_review'
    if (status !== 'all') {
      query = query.eq('payment_status', status)
    }

    // Orders under review must be served oldest-first (FIFO)
    const isOldestFirst = status === 'under_review'
    query = query.order('created_at', { ascending: isOldestFirst })

    const search = filters?.search?.trim()
    if (search) {
      const cleanSearch = search.replace(/^#/, '').trim()
      const isNum = /^\d+$/.test(cleanSearch)

      if (isNum) {
        query = query.or(
          `id.eq.${cleanSearch},ship_phone.ilike.%${cleanSearch}%,ship_alt_phone.ilike.%${cleanSearch}%,payment_reference.ilike.%${cleanSearch}%`,
        )
      } else {
        query = query.or(
          `ship_name.ilike.%${cleanSearch}%,ship_phone.ilike.%${cleanSearch}%,ship_alt_phone.ilike.%${cleanSearch}%,payment_reference.ilike.%${cleanSearch}%`,
        )
      }
    }

    const { data, error } = await query
    if (error) throw toAppError(error)

    return (data ?? []) as unknown as AdminPaymentOrder[]
  } catch (err) {
    throw toAppError(err)
  }
}

/**
 * Creates an ephemeral signed URL for an image in the private `payment-proofs` bucket.
 * Defaults to 60 seconds validity. The signed URL is short-lived and never persisted.
 */
export async function getSignedProofUrl(proofPath: string, expiresInSeconds = 60): Promise<string> {
  try {
    const { data, error } = await supabase.storage
      .from('payment-proofs')
      .createSignedUrl(proofPath, expiresInSeconds)

    if (error) {
      throw toAppError(error)
    }

    if (!data?.signedUrl) {
      throw toAppError(new Error('Failed to generate signed URL'))
    }

    return data.signedUrl
  } catch (err) {
    throw toAppError(err)
  }
}

/**
 * Approves or rejects an InstaPay payment via the database RPC `admin_review_payment`.
 * Requires admin MFA (AAL2).
 */
export async function adminReviewPayment(payload: ReviewPaymentPayload): Promise<void> {
  try {
    const { error } = await supabase.rpc('admin_review_payment', {
      p_order_id: payload.orderId,
      p_approve: payload.approve,
      p_note: payload.note ? payload.note.trim() : null,
    })

    if (error) {
      throw toAppError(error)
    }
  } catch (err) {
    throw toAppError(err)
  }
}

/**
 * Purges payment proofs for orders that were delivered longer ago than the retention period.
 * Default retention period is 90 days after delivery per security-model.md § 7.
 * Deletes objects from storage and nullifies `payment_proof_path` in `orders`.
 */
export async function purgeOldProofs(retentionDays = 90): Promise<PurgeProofsResult> {
  try {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString()

    const { data: candidates, error: fetchErr } = await supabase
      .from('orders')
      .select('id, payment_proof_path')
      .eq('status', 'delivered')
      .not('payment_proof_path', 'is', null)
      .lt('updated_at', cutoffDate)

    if (fetchErr) {
      throw toAppError(fetchErr)
    }

    const items = candidates ?? []
    if (items.length === 0) {
      return { purgedCount: 0, orderIds: [] }
    }

    const paths: string[] = []
    const orderIds: number[] = []

    for (const item of items) {
      if (item.payment_proof_path) {
        paths.push(item.payment_proof_path)
      }
      orderIds.push(item.id)
    }

    if (paths.length > 0) {
      const { error: storageErr } = await supabase.storage.from('payment-proofs').remove(paths)
      if (storageErr) {
        throw toAppError(storageErr)
      }
    }

    if (orderIds.length > 0) {
      const { error: updateErr } = await supabase
        .from('orders')
        .update({ payment_proof_path: null })
        .in('id', orderIds)

      if (updateErr) {
        throw toAppError(updateErr)
      }
    }

    return {
      purgedCount: paths.length,
      orderIds,
    }
  } catch (err) {
    throw toAppError(err)
  }
}
