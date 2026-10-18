import { supabase } from '@/lib/supabase'
import { toAppError, AppError } from '@/lib/errors'
import { generateProofStoragePath } from './fileValidation'
import type {
  OrderPaymentDetails,
  SubmitProofPayload,
  SupportedProofExt,
  SupportedProofMime,
} from './types'

/**
 * Fetches order payment details by order ID.
 */
export async function getOrderPaymentDetailsApi(orderId: number): Promise<OrderPaymentDetails> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(
        `
        id,
        user_id,
        status,
        payment_status,
        payment_method,
        payment_deadline,
        payment_reference,
        payment_proof_path,
        payment_submitted_at,
        payment_review_note,
        total,
        created_at
      `,
      )
      .eq('id', orderId)
      .maybeSingle()

    if (error) {
      throw toAppError(error)
    }

    if (!data) {
      throw new AppError('ORD-009')
    }

    return data as unknown as OrderPaymentDetails
  } catch (err) {
    throw toAppError(err)
  }
}

/**
 * Uploads a validated and re-encoded payment proof image to the private `payment-proofs` bucket.
 * Guarantees that the storage path is formatted as `{userId}/{orderId}/{uuid}.{ext}` without user file names.
 */
export async function uploadPaymentProofApi(
  userId: string,
  orderId: number,
  fileBlob: Blob,
  mimeType: SupportedProofMime,
  extension: SupportedProofExt,
): Promise<string> {
  try {
    const path = generateProofStoragePath(userId, orderId, extension)

    const { error } = await supabase.storage.from('payment-proofs').upload(path, fileBlob, {
      contentType: mimeType,
      upsert: false,
    })

    if (error) {
      throw toAppError(error, 'UPL-003')
    }

    return path
  } catch (err) {
    throw toAppError(err, 'UPL-003')
  }
}

/**
 * Submits the payment proof and transfer reference via the database RPC `submit_payment_proof`.
 */
export async function submitPaymentProofApi(payload: SubmitProofPayload): Promise<void> {
  const trimmedRef = payload.reference.trim()
  if (!trimmedRef) {
    throw new AppError('PAY-003')
  }

  try {
    const { error } = await supabase.rpc('submit_payment_proof', {
      p_order_id: payload.orderId,
      p_reference: trimmedRef,
      p_proof_path: payload.proofPath,
    })

    if (error) {
      throw toAppError(error)
    }
  } catch (err) {
    throw toAppError(err)
  }
}

export interface PaymentInstructions {
  qr_path: string | null
  handle: string | null
  instapay_handle?: string | null
  amount: number
  deadline: string
}

/**
 * Retrieves payment instructions (QR path, handle, amount, deadline) for approved orders.
 * Raises PAY-007 before approval.
 */
export async function getPaymentInstructionsApi(orderId: number): Promise<PaymentInstructions> {
  try {
    const { data, error } = await supabase.rpc('get_payment_instructions', {
      p_order_id: orderId,
    })

    if (error) {
      throw toAppError(error)
    }

    const raw = data as Record<string, unknown>
    const resolvedHandle =
      (raw?.handle as string) || (raw?.instapay_handle as string) || 'alaa.ahm9624@instapay'

    return {
      qr_path: (raw?.qr_path as string) || null,
      handle: resolvedHandle,
      instapay_handle: resolvedHandle,
      amount: Number(raw?.amount ?? 0),
      deadline: String(raw?.deadline ?? ''),
    }
  } catch (err) {
    throw toAppError(err)
  }
}
