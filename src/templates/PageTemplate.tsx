/**
 * Page Template - Light Design System
 * 
 * 使用此模板建立新頁面，確保設計一致性
 * 
 * 使用方式：
 * 1. 複製此檔案到 web/src/app/[page-name]/page.tsx
 * 2. 修改 PageName 為實際頁面名稱
 * 3. 填入 Header、Main、Footer 內容
 * 4. 移除不需要的部分
 */

export default function PageName() {
  return (
    <div className="page-container">
      {/* ============================================
          HEADER
          ============================================ */}
      <header className="page-header">
        <div className="page-header-inner">
          {/* Logo */}
          <div className="flex items-center gap-3 text-gray-800">
            <div className="size-6 text-primary">
              <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path d="M44 11.2727C44 14.0109 39.8386 16.3957 33.69 17.6364C39.8386 18.877 44 21.2618 44 24C44 26.7382 39.8386 29.123 33.69 30.3636C39.8386 31.6043 44 33.9891 44 36.7273C44 40.7439 35.0457 44 24 44C12.9543 44 4 40.7439 4 36.7273C4 33.9891 8.16144 31.6043 14.31 30.3636C8.16144 29.123 4 26.7382 4 24C4 21.2618 8.16144 18.877 14.31 17.6364C8.16144 16.3957 4 14.0109 4 11.2727C4 7.25611 12.9543 4 24 4C35.0457 4 44 7.25611 44 11.2727Z" fill="currentColor"></path>
              </svg>
            </div>
            <h2 className="text-gray-900 text-lg font-bold leading-tight tracking-[-0.015em]">LshWholesale</h2>
          </div>

          {/* Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            <a className="nav-link" href="#">首頁</a>
            <a className="nav-link" href="#">商品</a>
            <a className="nav-link" href="#">韓國</a>
            <a className="nav-link" href="#">日本</a>
            <a className="nav-link" href="#">泰國</a>
            <a className="nav-link" href="#">如何運作</a>
          </nav>

          {/* Actions */}
          <div className="flex gap-2">
            <a href="/register" className="btn-primary">
              <span className="truncate">註冊</span>
            </a>
            <a href="/login" className="btn-secondary">
              <span className="truncate">登入</span>
            </a>
          </div>
        </div>
      </header>

      {/* ============================================
          MAIN CONTENT
          ============================================ */}
      <main className="page-main">
        <div className="max-w-7xl mx-auto section-padding">
          {/* 在此添加頁面內容 */}
          <div className="card p-8">
            <h1 className="text-heading-1 mb-4">頁面標題</h1>
            <p className="text-body-lg">頁面內容</p>
          </div>
        </div>
      </main>

      {/* ============================================
          FOOTER
          ============================================ */}
      <footer className="page-footer">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {/* Column 1 */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 tracking-wider uppercase">網站導航</h3>
              <ul className="space-y-2">
                <li><a className="nav-link" href="#">商品</a></li>
                <li><a className="nav-link" href="#">韓國</a></li>
                <li><a className="nav-link" href="#">日本</a></li>
                <li><a className="nav-link" href="#">泰國</a></li>
              </ul>
            </div>

            {/* Column 2 */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 tracking-wider uppercase">客戶服務</h3>
              <ul className="space-y-2">
                <li><a className="nav-link" href="#">聯絡我們</a></li>
                <li><a className="nav-link" href="#">常見問題</a></li>
                <li><a className="nav-link" href="#">運送資訊</a></li>
              </ul>
            </div>

            {/* Column 3 */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 tracking-wider uppercase">公司</h3>
              <ul className="space-y-2">
                <li><a className="nav-link" href="#">關於我們</a></li>
                <li><a className="nav-link" href="#">如何運作</a></li>
              </ul>
            </div>

            {/* Column 4 */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 tracking-wider uppercase">電子報</h3>
              <p className="text-body-md">獲取最新的產品更新和即將推出的銷售資訊。</p>
              <form className="flex flex-col sm:flex-row gap-2">
                <input 
                  className="input-base" 
                  placeholder="輸入您的電子郵件" 
                  type="email" 
                />
                <button className="btn-primary">訂閱</button>
              </form>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-12 border-t border-gray-200 pt-8 flex flex-col sm:flex-row items-center justify-between">
            <p className="text-body-md text-gray-500">© {new Date().getFullYear()} LshWholesale。版權所有。</p>
            <div className="flex space-x-6 mt-4 sm:mt-0">{/* social icons */}</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

