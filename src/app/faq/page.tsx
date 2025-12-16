import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function FAQPage() {
  const faqs: Array<{ q: string; a: string }> = [
    {
      q: "零售會員與批發會員差在哪裡？",
      a: "零售會員：可瀏覽一般商品並享有零售價格優惠。\n批發會員：可瀏覽全站所有商品，享有批發價格（最優惠），並提供批發會員專屬服務。",
    },
    {
      q: "如何升級成零售會員？",
      a: "升級條件：儲值金額需達 NT$1,500。\n請至『會員中心』完成儲值後，即可申請升級為零售會員。",
    },
    {
      q: "如何升級成批發會員？",
      a: "升級條件：需先為零售會員，並具備儲值金額 NT$5,000 + 代理費 NT$6,000/年（從錢包扣除）。\n請至『會員中心』依指示申請升級批發會員。",
    },
    {
      q: "零售/批發會員資格如何維持？",
      a: "需在 45 天內累積消費滿 NT$300 以維持資格。\n計算週期以訂單成立時間為準，每次成立訂單後會重置 45 天計算。",
    },
    {
      q: "如果 45 天內沒有達到最低消費會怎麼樣？",
      a: "若超過 45 天未達最低消費，系統將自動關閉您的登入權限。\n若權限被關閉，登入時會看到提示訊息，請聯繫管理員協助處理。",
    },
    {
      q: "批發會員代理費會怎麼收取？",
      a: "批發會員升級時會從錢包扣除代理費 NT$6,000（年費）。升級前請確認錢包金額充足。",
    },
    {
      q: "升級失敗或看不到升級按鈕怎麼辦？",
      a: "常見原因包含：尚未登入、錢包儲值金額不足、或登入權限已被關閉。\n請先確認會員中心顯示的等級與錢包金額，若仍無法處理，請聯繫客服。",
    },
  ];

  return (
    <div className="min-h-screen bg-background-light flex flex-col">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-text-primary-light mb-2">常見問題</h1>
          <p className="text-sm text-text-secondary-light">關於零售會員 / 批發會員規則與升級流程的整理</p>
        </div>

        <div className="space-y-4">
          {faqs.map((item, idx) => (
            <section key={idx} className="rounded-lg border border-border-light bg-card-light p-6">
              <h2 className="text-lg font-bold text-text-primary-light mb-3">{item.q}</h2>
              <p className="text-base text-text-primary-light leading-relaxed whitespace-pre-wrap">{item.a}</p>
            </section>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
