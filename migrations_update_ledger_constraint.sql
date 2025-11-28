-- Drop the restrictive check constraint to allow new transaction types
-- We will re-add a comprehensive constraint later if needed
ALTER TABLE wallet_ledger DROP CONSTRAINT IF EXISTS wallet_ledger_type_check;
