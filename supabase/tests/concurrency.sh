#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# concurrency.sh: Scenario S7 concurrency check
# Two buyers racing for the last units: session A holds the lock while sleeping;
# session B waits on the lock, then fails with out-of-stock. No overselling.
# ==============================================================================

echo "=== Lolys Concurrency Test (Scenario S7) ==="

# 1. Determine connection method (host psql vs docker exec)
DB_URL="${DATABASE_URL:-}"
USE_DOCKER=false
CONTAINER=""

if command -v psql >/dev/null 2>&1; then
  if [ -z "$DB_URL" ]; then
    DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
  fi
  echo "Using host psql with URL: $DB_URL"
  run_sql() {
    psql "$DB_URL" -v ON_ERROR_STOP=1 "$@"
  }
  run_sql_capture() {
    psql "$DB_URL" -v ON_ERROR_STOP=1 "$@"
  }
else
  # Use docker exec when psql is not in host PATH
  CONTAINER=$(docker ps --filter "name=supabase_db" --format "{{.ID}}" | head -n 1)
  if [ -z "$CONTAINER" ]; then
    echo "Error: Neither host psql nor supabase_db container found." >&2
    exit 1
  fi
  USE_DOCKER=true
  echo "Using docker exec psql on container: $CONTAINER"
  run_sql() {
    docker exec -i "$CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 "$@"
  }
  run_sql_capture() {
    docker exec -i "$CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 "$@"
  }
fi

# 2. Setup test data: delivery fee, test users, test product with stock = 2
echo "Setting up test product and test users..."

run_sql << 'EOF'
-- Ensure delivery fee exists
INSERT INTO public.delivery_fees (governorate_id, method, fee)
VALUES (1, 'representative', 35.00)
ON CONFLICT (governorate_id, method) DO NOTHING;

-- Ensure category exists
INSERT INTO public.categories (name, slug)
VALUES ('Concurrency Tests', 'concurrency-tests')
ON CONFLICT (slug) DO NOTHING;

-- Upsert test product with exact stock = 2, sold = 0
DELETE FROM public.order_items WHERE product_name = 'Concurrent Ring';
DELETE FROM public.products WHERE name = 'Concurrent Ring';

INSERT INTO public.products (category_id, name, price, stock_quantity, sold_count, is_active)
VALUES (
  (SELECT id FROM public.categories WHERE slug = 'concurrency-tests' LIMIT 1),
  'Concurrent Ring',
  100.00,
  2,
  0,
  true
);

-- Ensure buyer users exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE raw_user_meta_data ->> 'test_identifier' = 'buyer_concurrent_a') THEN
    PERFORM tests.create_supabase_user('buyer_concurrent_a', 'buyer_conc_a@test.com', '01011110001');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE raw_user_meta_data ->> 'test_identifier' = 'buyer_concurrent_b') THEN
    PERFORM tests.create_supabase_user('buyer_concurrent_b', 'buyer_conc_b@test.com', '01011110002');
  END IF;
END $$;
EOF

PRODUCT_ID=$(run_sql -t -A -c "SELECT id FROM public.products WHERE name = 'Concurrent Ring';")
echo "Test Product ID: $PRODUCT_ID (initial stock = 2, sold_count = 0)"

TMP_DIR=$(mktemp -d 2>/dev/null || mktemp -d -t 'concurrency')
SESSION_A_LOG="$TMP_DIR/session_a.log"
SESSION_B_LOG="$TMP_DIR/session_b.log"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

echo "Starting concurrent order sessions..."
START_TIME=$(date +%s)

# Session A: Orders all 2 units, sleeps 3s before commit
cat << EOF > "$TMP_DIR/session_a.sql"
BEGIN;
SELECT tests.authenticate_as('buyer_concurrent_a');
SELECT public.place_order(
  jsonb_build_array(jsonb_build_object('product_id', $PRODUCT_ID, 'quantity', 2)),
  'representative', 'Buyer A', '01011110001', 1::smallint, 'Cairo', 'Address A'
);
SELECT pg_sleep(3);
COMMIT;
EOF

# Session B: Orders 1 unit of the same product
cat << EOF > "$TMP_DIR/session_b.sql"
BEGIN;
SELECT tests.authenticate_as('buyer_concurrent_b');
SELECT public.place_order(
  jsonb_build_array(jsonb_build_object('product_id', $PRODUCT_ID, 'quantity', 1)),
  'representative', 'Buyer B', '01011110002', 1::smallint, 'Cairo', 'Address B'
);
COMMIT;
EOF

# Launch Session A in background
(
  run_sql < "$TMP_DIR/session_a.sql" > "$SESSION_A_LOG" 2>&1
) &
PID_A=$!

# Brief pause to ensure Session A acquires the row lock first
sleep 0.5

# Launch Session B in background
(
  run_sql < "$TMP_DIR/session_b.sql" > "$SESSION_B_LOG" 2>&1
) &
PID_B=$!

echo "Waiting for Session A (pid $PID_A) and Session B (pid $PID_B)..."

# Capture exit codes
set +e
wait $PID_A
EXIT_A=$?
wait $PID_B
EXIT_B=$?
set -e

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo "Execution completed in ${ELAPSED}s."
echo "Session A exit code: $EXIT_A"
echo "Session B exit code: $EXIT_B"

echo "--- Session A output ---"
cat "$SESSION_A_LOG"
echo "--- Session B output ---"
cat "$SESSION_B_LOG"

# 3. Assertions
echo "Verifying concurrency assertions..."

# Assertion 1: Session A must succeed
if [ "$EXIT_A" -ne 0 ]; then
  echo "FAIL: Session A failed to place order!" >&2
  exit 1
fi
echo "PASS: Session A succeeded."

# Assertion 2: Session B must fail
if [ "$EXIT_B" -eq 0 ]; then
  echo "FAIL: Session B unexpectedly succeeded! Oversell occurred!" >&2
  exit 1
fi
echo "PASS: Session B failed as expected."

# Assertion 3: Session B error message must indicate out of stock
if grep -qi "left in stock" "$SESSION_B_LOG"; then
  echo "PASS: Session B error message correctly indicated out of stock."
else
  echo "FAIL: Session B error message did not contain 'left in stock'!" >&2
  exit 1
fi

# Assertion 4: Session B must have waited for Session A (elapsed time >= 2s)
if [ "$ELAPSED" -lt 2 ]; then
  echo "FAIL: Session B did not wait for Session A lock (elapsed ${ELAPSED}s < 2s)!" >&2
  exit 1
fi
echo "PASS: Session B waited for Session A to release the lock."

# Assertion 5: Database stock and sold counts must be exactly 0 and 2
FINAL_STOCK=$(run_sql -t -A -c "SELECT stock_quantity FROM public.products WHERE id = $PRODUCT_ID;")
FINAL_SOLD=$(run_sql -t -A -c "SELECT sold_count FROM public.products WHERE id = $PRODUCT_ID;")
ORDERS_COUNT=$(run_sql -t -A -c "SELECT count(*) FROM public.order_items WHERE product_id = $PRODUCT_ID;")

echo "Final product stock: $FINAL_STOCK (expected: 0)"
echo "Final product sold: $FINAL_SOLD (expected: 2)"
echo "Created orders count: $ORDERS_COUNT (expected: 1)"

if [ "$FINAL_STOCK" -ne 0 ]; then
  echo "FAIL: Final stock quantity is $FINAL_STOCK, expected 0!" >&2
  exit 1
fi

if [ "$FINAL_SOLD" -ne 2 ]; then
  echo "FAIL: Final sold count is $FINAL_SOLD, expected 2!" >&2
  exit 1
fi

if [ "$ORDERS_COUNT" -ne 1 ]; then
  echo "FAIL: Order items count is $ORDERS_COUNT, expected 1!" >&2
  exit 1
fi

echo "=== Scenario S7 Concurrency Test PASSED! No overselling occurred. ==="
exit 0
