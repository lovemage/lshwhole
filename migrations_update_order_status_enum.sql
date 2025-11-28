-- Add new values to order_status enum
-- Wrap in transaction block to handle if values already exist

DO $$
BEGIN
    ALTER TYPE order_status ADD VALUE 'COMPLETED';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    ALTER TYPE order_status ADD VALUE 'DISPUTE_PENDING';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    ALTER TYPE order_status ADD VALUE 'CANCELLED';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
