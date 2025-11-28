INSERT INTO email_templates (key, subject, body) VALUES
('new_product_promo', '新品上架通知！', '親愛的會員 {name}，<br/><br/>我們有新品上架囉！<br/><br/>快來看看我們的最新商品：<br/><br/>{product_list}<br/><br/>立即前往網站選購！')
ON CONFLICT (key) DO NOTHING;
