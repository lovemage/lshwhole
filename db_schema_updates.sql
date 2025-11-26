-- Add original_url to products table for tracking source URL
ALTER TABLE products ADD COLUMN IF NOT EXISTS original_url TEXT;
