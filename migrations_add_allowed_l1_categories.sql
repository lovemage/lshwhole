-- Restrict per-member visible top-level categories (L1)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS allowed_l1_category_ids INTEGER[];

-- Null/empty array means不限制；由管理員介面維護
