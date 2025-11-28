"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-12">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-500 tracking-wider uppercase">網站導航</h3>
            <ul className="space-y-2">
              <li><Link className="text-base text-gray-600 hover:text-primary" href="/products">商品</Link></li>
              <li><Link className="text-base text-gray-600 hover:text-primary" href="/products">韓國</Link></li>
              <li><Link className="text-base text-gray-600 hover:text-primary" href="/products">日本</Link></li>
              <li><Link className="text-base text-gray-600 hover:text-primary" href="/products">泰國</Link></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-500 tracking-wider uppercase">客戶服務</h3>
            <ul className="space-y-2">
              <li><Link className="text-base text-gray-600 hover:text-primary" href="#">聯絡我們</Link></li>
              <li><a className="text-base text-gray-600 hover:text-primary" href="mailto:service@lshwholesale.com">service@lshwholesale.com</a></li>
              <li><Link className="text-base text-gray-600 hover:text-primary" href="#">常見問題</Link></li>
              <li><Link className="text-base text-gray-600 hover:text-primary" href="#">運送資訊</Link></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-500 tracking-wider uppercase">法律</h3>
            <ul className="space-y-2">
              <li><Link className="text-base text-gray-600 hover:text-primary" href="/terms-of-service">服務條款</Link></li>
              <li><Link className="text-base text-gray-600 hover:text-primary" href="/privacy-policy">隱私政策</Link></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-500 tracking-wider uppercase">電子報</h3>
            <p className="text-base text-gray-600">獲取最新的產品更新和即將推出的銷售資訊。</p>
            <form className="flex flex-col sm:flex-row gap-2" onSubmit={(e) => e.preventDefault()}>
              <input className="form-input flex-1 w-full min-w-0 rounded-lg text-gray-900 bg-gray-100 border-gray-300 focus:ring-primary focus:border-primary" placeholder="輸入您的電子郵件" type="email" />
              <button className="flex items-center justify-center rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold" type="submit">訂閱</button>
            </form>
          </div>
        </div>
        <div className="mt-12 border-t border-gray-200 pt-8 flex flex-col sm:flex-row items-center justify-between">
          <p className="text-base text-gray-500">© {new Date().getFullYear()} LshWholesale。版權所有。</p>
          <div className="flex space-x-6 mt-4 sm:mt-0">{/* social icons */}</div>
        </div>
      </div>
    </footer>
  );
}
