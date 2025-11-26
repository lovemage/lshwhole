-- Add original_url to products table for tracking source URL
ALTER TABLE products ADD COLUMN IF NOT EXISTS original_url TEXT;

-- Add image type columns to product_images table
ALTER TABLE product_images ADD COLUMN IF NOT EXISTS is_product BOOLEAN DEFAULT true;
ALTER TABLE product_images ADD COLUMN IF NOT EXISTS is_description BOOLEAN DEFAULT false;
