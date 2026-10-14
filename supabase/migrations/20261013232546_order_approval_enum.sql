-- T-1.23: commit the enum value before functions use it in the next migration.
alter type public.payment_status add value if not exists 'awaiting_approval';
