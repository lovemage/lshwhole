export const NAV_ITEMS = [
  { id: "dashboard", label: "儀表看板", icon: "dashboard" },
  { id: "announcements", label: "公告管理", icon: "campaign" },
  { id: "categories", label: "分類管理", icon: "category" },
  { id: "crawler", label: "爬蟲導入", icon: "cloud_download" },
  { id: "products", label: "商品管理", icon: "inventory_2" },
  { id: "members", label: "會員管理", icon: "group" },
  { id: "upgrade_settings", label: "申請資格", icon: "description" },
  { id: "orders", label: "訂單管理", icon: "receipt_long" },
  { id: "hot_products", label: "熱銷商品", icon: "whatshot" },
  { id: "limited_time_products", label: "限時商品", icon: "timer" },
  { id: "sub_accounts", label: "子帳管理", icon: "manage_accounts" },
  { id: "banners", label: "橫幅管理", icon: "view_carousel" },
  { id: "shipping_settings", label: "運費管理", icon: "local_shipping" },
  { id: "email_templates", label: "Email 模板", icon: "mail" },
  { id: "settings", label: "系統設置", icon: "settings" },
];

export interface DashboardStats {
  label: string;
  value: string;
  change: string;
  changeType: "positive" | "negative";
}

export interface CategoryStat {
  name: string;
  percentage: number;
}
