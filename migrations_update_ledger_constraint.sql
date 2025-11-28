-- Update wallet_ledger type constraint to allow PAYMENT and PURCHASE
ALTER TABLE wallet_ledger DROP CONSTRAINT IF EXISTS wallet_ledger_type_check;
ALTER TABLE wallet_ledger ADD CONSTRAINT wallet_ledger_type_check CHECK (type IN ('TOPUP', 'WITHDRAWAL', 'REFUND', 'PAYMENT', 'PURCHASE', 'ADJUSTMENT'));
