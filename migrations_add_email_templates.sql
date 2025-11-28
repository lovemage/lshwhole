CREATE TABLE IF NOT EXISTS email_templates (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default templates
INSERT INTO email_templates (key, subject, body) VALUES
('order_created', '訂單確認通知 #{order_id}', '親愛的會員 {name}，<br/><br/>感謝您的訂購！您的訂單 #{order_id} 已成功建立。<br/><br/>訂單金額：NT$ {amount}<br/><br/>我們會盡快為您處理。'),
('order_arrived', '商品抵達台灣通知 #{order_id}', '親愛的會員 {name}，<br/><br/>您的訂單 #{order_id} 中的商品已抵達台灣，將盡快安排出貨。<br/><br/>感謝您的耐心等待。'),
('upgrade_success', '會員升級成功通知', '親愛的會員 {name}，<br/><br/>恭喜您！您的會員等級已成功升級為 {level}。<br/><br/>現在您可以享受更多專屬優惠！'),
('upgrade_failed', '會員升級申請結果通知', '親愛的會員 {name}，<br/><br/>很抱歉通知您，您的會員升級申請未通過審核。<br/><br/>如有疑問，請聯繫客服。'),
('topup_success', '儲值成功通知', '親愛的會員 {name}，<br/><br/>您的儲值申請已通過！<br/><br/>儲值金額：NT$ {amount}<br/>目前餘額：NT$ {balance}<br/><br/>感謝您的支持。'),
('topup_failed', '儲值申請結果通知', '親愛的會員 {name}，<br/><br/>很抱歉通知您，您的儲值申請未通過審核。<br/><br/>原因：{reason}<br/><br/>如有疑問，請聯繫客服。')
ON CONFLICT (key) DO NOTHING;
