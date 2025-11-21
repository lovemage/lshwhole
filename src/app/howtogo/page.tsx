"use client";

import Link from "next/link";

export default function HowToGoPage() {
  return (
    <div className="min-h-screen bg-[#f8f8f5] flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/5 to-blue-50 py-20 px-4 sm:px-6 lg:px-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="w-24 h-24 mx-auto mb-8 bg-white rounded-2xl shadow-xl flex items-center justify-center overflow-hidden p-4">
            <img src="/logo/5.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            如何運作？
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            歡迎來到 Lsx Wholesale！我們專營韓國、日本、泰國代購商品批發。
            <br />
            了解我們的會員分級制度，選擇最適合您的方案。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="px-8 py-4 bg-primary text-white font-bold text-lg rounded-xl shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center">
              立即註冊
            </Link>
            <Link href="/login" className="px-8 py-4 bg-white text-primary font-bold text-lg rounded-xl shadow-lg border border-gray-200 hover:bg-gray-50 transition-all flex items-center justify-center">
              登入查看
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-10 py-16 space-y-20">
        
        {/* 會員等級總覽表格 */}
        <section>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">會員等級總覽</h2>
            <p className="text-gray-600 text-lg">不同等級享有不同的價格優惠與權限</p>
          </div>
          
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-5 text-left text-sm font-bold text-gray-900 uppercase tracking-wider w-1/4">項目</th>
                    <th className="px-6 py-5 text-left text-sm font-bold text-gray-900 uppercase tracking-wider w-1/4">訪客 (Guest)</th>
                    <th className="px-6 py-5 text-left text-sm font-bold text-primary uppercase tracking-wider w-1/4">零售 (Retail)</th>
                    <th className="px-6 py-5 text-left text-sm font-bold text-purple-700 uppercase tracking-wider w-1/4">批發 (Wholesale)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">升級條件</td>
                    <td className="px-6 py-4 text-sm text-gray-600">註冊即為訪客</td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-medium text-primary">儲值金 ≥ NT$1,500</td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-medium text-purple-700">儲值金 ≥ NT$5,000<br/>+ 代理費 NT$6,000/年</td>
                  </tr>
                  <tr className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">維持資格</td>
                    <td className="px-6 py-4 text-sm text-gray-400">-</td>
                    <td className="px-6 py-4 text-sm text-gray-600">45日內消費 ≥ NT$300</td>
                    <td className="px-6 py-4 text-sm text-gray-600">45日內消費 ≥ NT$300</td>
                  </tr>
                  <tr className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">未達標會員</td>
                    <td className="px-6 py-4 text-sm text-gray-400">-</td>
                    <td className="px-6 py-4 text-sm text-red-500 font-medium">關閉登入權限</td>
                    <td className="px-6 py-4 text-sm text-red-500 font-medium">關閉登入權限</td>
                  </tr>
                  <tr className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">可瀏覽頁面</td>
                    <td className="px-6 py-4 text-sm text-gray-600">僅限 熱銷商品</td>
                    <td className="px-6 py-4 text-sm text-gray-600">一般商品 + 熱銷商品</td>
                    <td className="px-6 py-4 text-sm text-gray-600">全站所有商品</td>
                  </tr>
                  <tr className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">可見價格</td>
                    <td className="px-6 py-4 text-sm text-gray-400">無 (或部分公開)</td>
                    <td className="px-6 py-4 text-sm text-gray-600">零售價</td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-bold">批發價 (最優惠)</td>
                  </tr>
                  <tr className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">付款方式</td>
                    <td className="px-6 py-4 text-sm text-gray-400">未開放</td>
                    <td className="px-6 py-4 text-sm text-gray-600">儲值金付款</td>
                    <td className="px-6 py-4 text-sm text-gray-600">儲值金付款</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 詳細規則區塊 */}
        <div className="grid md:grid-cols-3 gap-8">
          {/* Guest */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 flex flex-col h-full">
            <div className="mb-6">
              <span className="inline-block px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-sm font-bold mb-4">基礎等級</span>
              <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <span className="material-symbols-outlined">person_outline</span>
                訪客會員
              </h3>
            </div>
            <ul className="space-y-4 flex-1 text-gray-600">
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-green-500 shrink-0">check_circle</span>
                <span>註冊後即為訪客會員。</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-green-500 shrink-0">check_circle</span>
                <span>可瀏覽「熱銷商品」專區。</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-gray-400 shrink-0">cancel</span>
                <span>無法瀏覽一般商品目錄。</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-gray-400 shrink-0">cancel</span>
                <span>尚未開放購物功能，需先升級。</span>
              </li>
            </ul>
          </div>

          {/* Retail */}
          <div className="bg-white p-8 rounded-2xl shadow-md border-2 border-primary/20 flex flex-col h-full relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-primary text-white text-xs font-bold px-3 py-1 rounded-bl-lg">推薦新手</div>
            <div className="mb-6">
              <span className="inline-block px-3 py-1 rounded-full bg-blue-50 text-primary text-sm font-bold mb-4">進階等級</span>
              <h3 className="text-2xl font-bold text-primary flex items-center gap-2">
                <span className="material-symbols-outlined">shopping_bag</span>
                零售會員
              </h3>
            </div>
            <ul className="space-y-4 flex-1 text-gray-600">
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary shrink-0">paid</span>
                <span className="font-medium text-gray-900">升級條件：儲值滿 NT$1,500。</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-green-500 shrink-0">check_circle</span>
                <span>解鎖一般商品瀏覽權限。</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-green-500 shrink-0">check_circle</span>
                <span>享有零售價格優惠。</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-orange-500 shrink-0">warning</span>
                <span className="text-sm">需在 45 天內消費滿 NT$300 以維持資格。</span>
              </li>
            </ul>
            <div className="mt-8 pt-6 border-t border-gray-100">
              <Link href="/member" className="block w-full py-3 text-center rounded-lg bg-primary text-white font-bold hover:bg-primary/90 transition-colors">
                去儲值升級
              </Link>
            </div>
          </div>

          {/* Wholesale */}
          <div className="bg-white p-8 rounded-2xl shadow-md border-2 border-purple-100 flex flex-col h-full relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">最優惠</div>
            <div className="mb-6">
              <span className="inline-block px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-sm font-bold mb-4">專業等級</span>
              <h3 className="text-2xl font-bold text-purple-700 flex items-center gap-2">
                <span className="material-symbols-outlined">storefront</span>
                批發會員
              </h3>
            </div>
            <ul className="space-y-4 flex-1 text-gray-600">
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-purple-600 shrink-0">paid</span>
                <span className="font-medium text-gray-900">升級條件：儲值 NT$5,000 + 代理費 NT$6,000/年。</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-green-500 shrink-0">check_circle</span>
                <span>瀏覽全站所有商品。</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-green-500 shrink-0">check_circle</span>
                <span className="font-bold text-purple-700">享有批發價格 (最優)。</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-orange-500 shrink-0">warning</span>
                <span className="text-sm">需在 45 天內消費滿 NT$300 以維持資格。</span>
              </li>
            </ul>
             <div className="mt-8 pt-6 border-t border-gray-100">
              <Link href="/member" className="block w-full py-3 text-center rounded-lg bg-purple-600 text-white font-bold hover:bg-purple-700 transition-colors">
                申請批發
              </Link>
            </div>
          </div>
        </div>

        {/* 注意事項區塊 */}
        <section className="bg-orange-50 rounded-2xl p-8 border border-orange-200">
          <div className="flex items-start gap-4">
            <div className="bg-orange-100 p-3 rounded-full shrink-0">
              <span className="material-symbols-outlined text-orange-600 text-2xl">priority_high</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">重要注意事項：資格維持規則</h3>
              <div className="space-y-3 text-gray-700">
                <p>為了確保會員權益與平台活躍度，我們設有資格維持機制：</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <span className="font-bold">計算週期：</span>以訂單成立時間為準，每次成立訂單後重置 45 天計算。
                  </li>
                  <li>
                    <span className="font-bold">最低消費：</span>45 天內累積消費需滿 <span className="text-red-600 font-bold">NT$300</span>。
                  </li>
                  <li>
                    <span className="font-bold">未達標後果：</span>若超過 45 天未達最低消費，系統將<span className="text-red-600 font-bold">自動關閉您的登入權限</span>。
                  </li>
                  <li>
                    <span className="font-bold">權限恢復：</span>若您的權限被關閉，登入時會看到提示訊息。請聯繫管理員協助處理。
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ / Contact */}
        <section className="text-center py-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">還有疑問嗎？</h2>
          <p className="text-gray-600 mb-8">還有疑問嗎?</p>
          <div className="flex flex-wrap justify-center gap-6">
            <div className="flex items-center gap-2 text-gray-700 bg-white px-5 py-3 rounded-lg shadow-sm border border-gray-200">
              <span className="material-symbols-outlined text-primary">mail</span>
              <span>support@lsx-wholesale.com</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700 bg-white px-5 py-3 rounded-lg shadow-sm border border-gray-200">
              <span className="material-symbols-outlined text-primary">call</span>
              <span>02-1234-5678</span>
            </div>
          </div>
        </section>

      </div>

      {/* Footer Link */}
      <footer className="bg-white border-t border-gray-200 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <Link href="/" className="text-primary font-medium hover:underline flex items-center justify-center gap-2">
            <span className="material-symbols-outlined">arrow_back</span>
            返回首頁
          </Link>
          <p className="text-gray-400 text-sm mt-4">© {new Date().getFullYear()} Lsx Wholesale. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
