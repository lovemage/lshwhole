-- Create system_settings table for storing JSON configurations
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize display_settings with default empty arrays
INSERT INTO system_settings (key, value, description) 
VALUES (
  'display_settings', 
  '{"popular": [], "korea": [], "japan": [], "thailand": []}'::jsonb,
  '首頁與各區塊的商品展示設定'
)
ON CONFLICT (key) DO NOTHING;
