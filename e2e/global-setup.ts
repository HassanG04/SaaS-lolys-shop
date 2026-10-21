import { resetDb, ensureDeliveryFees, createTestUser, queryDb } from './helpers/db'

export default async function globalSetup(): Promise<void> {
  console.log('[E2E Global Setup] Resetting database and seeding reference data...')
  resetDb()

  console.log('[E2E Global Setup] Ensuring delivery fees for Cairo representative...')
  ensureDeliveryFees()

  // A local fixture, not a verified merchant link. No transfer is initiated by these tests.
  queryDb(`
    UPDATE public.shop_settings
       SET value = '"https://ipn.eg/S/alaa.ahm9624/1a2b3c4d"'::jsonb
     WHERE key = 'instapay_link';
  `)

  console.log('[E2E Global Setup] Creating customer test user...')
  await createTestUser({
    email: 'customer@example.com',
    password: 'Password123!',
    fullName: 'سارة أحمد',
    phone: '01012345678',
  })

  console.log('[E2E Global Setup] Creating admin test user...')
  await createTestUser({
    email: 'admin@example.com',
    password: 'Password123!',
    fullName: 'مسؤول المتجر',
    phone: '01098765432',
    isAdmin: true,
  })

  console.log('[E2E Global Setup] Setup complete.')
}
