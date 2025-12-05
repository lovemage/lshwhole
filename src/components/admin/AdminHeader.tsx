import { NAV_ITEMS } from "./constants";

interface AdminHeaderProps {
  activeNav?: string;
}

const PAGE_ANNOTATIONS: Record<string, string> = {
  announcements: "首頁公告區塊",
  categories: "商品傳統分類(關聯)",
  tags: "商品平行分類(搜尋)",
  spec_templates: "商品規格快速套用",
  crawler: "商品爬蟲檔案入口",
  products: "已上架商品管理",
  members: "會員升級儲值管理",
  upgrade_settings: "申請資格頁面編輯",
  orders: "所有訂單狀態管理",
  hot_products: "首頁展示商品編輯",
  limited_time_products: "首頁商品限時上架",
  sub_accounts: "小幫手帳號管理",
  banners: "首頁及商品頁廣告圖",
  shipping_settings: "全局運費編輯關聯訂單",
  email_templates: "會員狀態Email管理",
  dashboard: "商店活動摘要",
};

export default function AdminHeader({ activeNav = "dashboard" }: AdminHeaderProps) {
  // Find title from NAV_ITEMS if possible, or fallback
  const navItem = NAV_ITEMS.find((item) => item.id === activeNav);
  const title = navItem?.label || "儀表看板";
  const annotation = PAGE_ANNOTATIONS[activeNav] || "";

  return (
    <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-border-light px-6 py-4 sticky top-0 z-10 bg-card-light shadow-sm">
      <div className="flex items-center gap-4">
        {/* Page Title & Annotation */}
        <div className="flex flex-col">
          <h1 className="text-xl font-bold text-text-primary-light flex items-center gap-2">
            {title}
            {annotation && (
              <span className="text-sm font-normal text-text-secondary-light bg-background-light px-2 py-0.5 rounded-md border border-border-light">
                {annotation}
              </span>
            )}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <label className="relative flex items-center min-w-40 h-10! max-w-sm hidden md:flex">
          <span className="material-symbols-outlined absolute left-3 text-text-secondary-light">
            search
          </span>
          <input
            type="text"
            placeholder="搜尋..."
            className="form-input h-full w-full rounded-lg border border-border-light bg-background-light px-10 text-base text-text-primary-light placeholder:text-text-secondary-light focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </label>
        <button className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-text-secondary-light hover:bg-primary/10 hover:text-primary transition-colors">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-text-secondary-light hover:bg-primary/10 hover:text-primary transition-colors">
          <span className="material-symbols-outlined">help</span>
        </button>
        <div
          className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 ring-2 ring-border-light"
          style={{ backgroundColor: "#E2E8F0" }}
        ></div>
      </div>
    </header>
  );
}
