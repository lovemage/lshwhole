-- Update email templates with optimized content and styles

-- Common Style (Inline CSS for email compatibility)
-- Container: max-width: 600px; margin: 0 auto; font-family: sans-serif; color: #333;
-- Button: display: inline-block; padding: 10px 20px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px;

-- 1. Order Created
UPDATE email_templates SET 
  subject = '【LSH Wholesale】訂單確認通知 #{order_id}',
  body = '<div style="max-width: 600px; margin: 0 auto; font-family: sans-serif; color: #333;">
    <h2 style="color: #000;">訂單確認通知</h2>
    <p>親愛的會員 {name}，</p>
    <p>感謝您的訂購！您的訂單 <strong>#{order_id}</strong> 已成功建立。</p>
    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p style="margin: 0;">訂單金額：<strong>NT$ {amount}</strong></p>
    </div>
    <p>我們會盡快為您處理後續事宜。</p>
    <div style="text-align: center; margin-top: 30px;">
      <a href="https://lshwholesale.com/member/orders" style="display: inline-block; padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold;">查看訂單詳情</a>
    </div>
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
    <p style="font-size: 12px; color: #999;">此郵件為系統自動發送，請勿直接回覆。</p>
  </div>'
WHERE key = 'order_created';

-- 2. Order Arrived (Item Arrived) - With Payment Reminder
UPDATE email_templates SET 
  subject = '【LSH Wholesale】商品抵台通知與運費付款 #{order_id}',
  body = '<div style="max-width: 600px; margin: 0 auto; font-family: sans-serif; color: #333;">
    <h2 style="color: #000;">商品抵達台灣通知</h2>
    <p>親愛的會員 {name}，</p>
    <p>通知您，您的訂單 <strong>#{order_id}</strong> 中的商品已抵達台灣倉庫。</p>
    <div style="background-color: #fff8e1; padding: 15px; border-radius: 5px; border: 1px solid #ffecb3; margin: 20px 0;">
      <p style="margin: 0; color: #d84315; font-weight: bold;">⚠️ 請注意：需要您的操作</p>
      <p style="margin: 10px 0 0;">請登入系統支付國際/國內運費，以便我們盡快為您安排出貨。</p>
    </div>
    <p>請點擊下方按鈕前往訂單頁面進行付款：</p>
    <div style="text-align: center; margin-top: 30px;">
      <a href="https://lshwholesale.com/member/orders" style="display: inline-block; padding: 12px 24px; background-color: #d32f2f; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold;">前往支付運費</a>
    </div>
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
    <p style="font-size: 12px; color: #999;">此郵件為系統自動發送，請勿直接回覆。</p>
  </div>'
WHERE key = 'order_arrived';

-- 3. Upgrade Success
UPDATE email_templates SET 
  subject = '【LSH Wholesale】會員升級成功通知',
  body = '<div style="max-width: 600px; margin: 0 auto; font-family: sans-serif; color: #333;">
    <h2 style="color: #000;">恭喜您，升級成功！</h2>
    <p>親愛的會員 {name}，</p>
    <p>您的會員等級已成功升級為： <span style="color: #d32f2f; font-weight: bold; font-size: 18px;">{level}</span></p>
    <p>現在您可以享受更多專屬優惠與批發價格！</p>
    <div style="text-align: center; margin-top: 30px;">
      <a href="https://lshwholesale.com" style="display: inline-block; padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold;">立即開始購物</a>
    </div>
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
    <p style="font-size: 12px; color: #999;">此郵件為系統自動發送，請勿直接回覆。</p>
  </div>'
WHERE key = 'upgrade_success';

-- 4. Upgrade Failed
UPDATE email_templates SET 
  subject = '【LSH Wholesale】會員升級申請結果',
  body = '<div style="max-width: 600px; margin: 0 auto; font-family: sans-serif; color: #333;">
    <h2 style="color: #000;">會員升級申請通知</h2>
    <p>親愛的會員 {name}，</p>
    <p>很抱歉通知您，您的會員升級申請未通過審核。</p>
    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p style="margin: 0;">如有疑問，請聯繫我們的客服團隊，我們將竭誠為您服務。</p>
    </div>
    <div style="text-align: center; margin-top: 30px;">
      <a href="https://lshwholesale.com/member" style="display: inline-block; padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold;">返回會員中心</a>
    </div>
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
    <p style="font-size: 12px; color: #999;">此郵件為系統自動發送，請勿直接回覆。</p>
  </div>'
WHERE key = 'upgrade_failed';

-- 5. Topup Success
UPDATE email_templates SET 
  subject = '【LSH Wholesale】儲值成功通知',
  body = '<div style="max-width: 600px; margin: 0 auto; font-family: sans-serif; color: #333;">
    <h2 style="color: #000;">儲值成功通知</h2>
    <p>親愛的會員 {name}，</p>
    <p>您的儲值申請已通過審核，款項已入帳。</p>
    <div style="background-color: #e8f5e9; padding: 15px; border-radius: 5px; border: 1px solid #c8e6c9; margin: 20px 0;">
      <p style="margin: 5px 0;">儲值金額：<strong style="color: #2e7d32;">NT$ {amount}</strong></p>
      <p style="margin: 5px 0;">目前餘額：<strong>NT$ {balance}</strong></p>
    </div>
    <p>感謝您的支持！</p>
    <div style="text-align: center; margin-top: 30px;">
      <a href="https://lshwholesale.com/member" style="display: inline-block; padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold;">查看錢包</a>
    </div>
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
    <p style="font-size: 12px; color: #999;">此郵件為系統自動發送，請勿直接回覆。</p>
  </div>'
WHERE key = 'topup_success';

-- 6. Topup Failed
UPDATE email_templates SET 
  subject = '【LSH Wholesale】儲值申請結果通知',
  body = '<div style="max-width: 600px; margin: 0 auto; font-family: sans-serif; color: #333;">
    <h2 style="color: #000;">儲值申請通知</h2>
    <p>親愛的會員 {name}，</p>
    <p>很抱歉通知您，您的儲值申請未通過審核。</p>
    <div style="background-color: #ffebee; padding: 15px; border-radius: 5px; border: 1px solid #ffcdd2; margin: 20px 0;">
      <p style="margin: 0; color: #c62828;"><strong>原因：</strong>{reason}</p>
    </div>
    <p>請檢查您的匯款資訊或聯繫客服。</p>
    <div style="text-align: center; margin-top: 30px;">
      <a href="https://lshwholesale.com/member" style="display: inline-block; padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold;">返回會員中心</a>
    </div>
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
    <p style="font-size: 12px; color: #999;">此郵件為系統自動發送，請勿直接回覆。</p>
  </div>'
WHERE key = 'topup_failed';

-- 7. New Product Promo
UPDATE email_templates SET 
  subject = '【LSH Wholesale】新品上架通知！',
  body = '<div style="max-width: 600px; margin: 0 auto; font-family: sans-serif; color: #333;">
    <h2 style="color: #000; text-align: center;">🎉 新品上架 🎉</h2>
    <p>親愛的會員 {name}，</p>
    <p>我們有最新的精選商品上架囉！快來看看本期推薦：</p>
    <div style="margin: 20px 0;">
      {product_list}
    </div>
    <div style="text-align: center; margin-top: 30px;">
      <a href="https://lshwholesale.com/products" style="display: inline-block; padding: 12px 24px; background-color: #d32f2f; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold;">立即前往選購</a>
    </div>
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
    <p style="font-size: 12px; color: #999;">此郵件為系統自動發送，請勿直接回覆。</p>
  </div>'
WHERE key = 'new_product_promo';
