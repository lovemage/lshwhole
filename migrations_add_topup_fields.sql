-- Add proof_image and note columns to wallet_topup_requests
ALTER TABLE wallet_topup_requests ADD COLUMN IF NOT EXISTS proof_image TEXT;
ALTER TABLE wallet_topup_requests ADD COLUMN IF NOT EXISTS note TEXT;
