-- Add category column to tags table
ALTER TABLE tags ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'A2'; -- Default to 'Product Attribute' (A2)
-- A1: Brand
-- A2: Product Type (Men/Women/Kids/Toys/Accessories)
-- A3: Activity (New Year/Live/Christmas)

-- Update existing tags to A2 if they are not categorized (optional, but good for consistency)
UPDATE tags SET category = 'A2' WHERE category IS NULL;

-- Seed Data
-- A1: Brands
INSERT INTO tags (slug, name, sort, description, category, active) VALUES
('BRAND_NIKE', 'Nike', 10, 'Nike Brand', 'A1', true),
('BRAND_ADIDAS', 'Adidas', 20, 'Adidas Brand', 'A1', true),
('BRAND_MUJI', 'MUJI', 30, 'MUJI Brand', 'A1', true),
('BRAND_UNIQLO', 'Uniqlo', 40, 'Uniqlo Brand', 'A1', true),
('BRAND_GAP', 'GAP', 50, 'GAP Brand', 'A1', true),
('BRAND_ZARA', 'Zara', 60, 'Zara Brand', 'A1', true),
('BRAND_H_M', 'H&M', 70, 'H&M Brand', 'A1', true),
('BRAND_LEGO', 'Lego', 80, 'Lego Toys', 'A1', true)
ON CONFLICT (slug) DO UPDATE SET category = 'A1';

-- A2: Product Types / Attributes
INSERT INTO tags (slug, name, sort, description, category, active) VALUES
('ATTR_MEN', '男裝', 10, 'Men''s Wear', 'A2', true),
('ATTR_WOMEN', '女裝', 20, 'Women''s Wear', 'A2', true),
('ATTR_KIDS', '童裝', 30, 'Kids'' Wear', 'A2', true),
('ATTR_TOYS', '玩具', 40, 'Toys', 'A2', true),
('ATTR_ACCESSORIES', '配件', 50, 'Accessories', 'A2', true),
('ATTR_HOME', '居家', 60, 'Home Goods', 'A2', true)
ON CONFLICT (slug) DO UPDATE SET category = 'A2';

-- A3: Activities / Promotions
INSERT INTO tags (slug, name, sort, description, category, active) VALUES
('PROMO_NEW_YEAR', '跨年優惠', 10, 'New Year Promotion', 'A3', true),
('PROMO_LIVE', '直播優惠', 20, 'Live Stream Promotion', 'A3', true),
('PROMO_XMAS', '聖誕節促銷', 30, 'Christmas Sale', 'A3', true),
('PROMO_CNY', '過年清倉', 40, 'Chinese New Year Clearance', 'A3', true),
('PROMO_BLACK_FRIDAY', '黑五特賣', 50, 'Black Friday Sale', 'A3', true)
ON CONFLICT (slug) DO UPDATE SET category = 'A3';
