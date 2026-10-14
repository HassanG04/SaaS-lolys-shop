import { resetDb, ensureDeliveryFees, createTestUser } from './helpers/db'

export default async function globalSetup(): Promise<void> {
  console.log('[E2E Global Setup] Resetting database and seeding reference data...')
  resetDb()

  console.log('[E2E Global Setup] Ensuring delivery fees for Cairo representative...')
  ensureDeliveryFees()

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
