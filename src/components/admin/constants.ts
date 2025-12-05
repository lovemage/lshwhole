export const NAV_GROUPS = [
  {
    title: "首頁管理",
    items: [
      { id: "announcements", label: "公告管理", icon: "campaign" },
      { id: "banners", label: "橫幅管理", icon: "view_carousel" },
      { id: "hot_products", label: "熱銷商品", icon: "whatshot" },
      { id: "limited_time_products", label: "限時商品", icon: "timer" },
    ]
  },
  {
    title: "商品相關",
    items: [
      { id: "crawler", label: "爬蟲導入", icon: "cloud_download" },
      { id: "products", label: "商品管理", icon: "inventory_2" },
      { id: "categories", label: "分類管理", icon: "category" },
      { id: "tags", label: "標籤管理", icon: "label" },
      { id: "spec_templates", label: "規格範本", icon: "tune" },
    ]
  },
  {
    title: "訂單及會員",
    items: [
      { id: "orders", label: "訂單管理", icon: "receipt_long" },
      { id: "shipping_settings", label: "運費管理", icon: "local_shipping" },
      { id: "members", label: "會員管理", icon: "group" },
      { id: "upgrade_settings", label: "申請資格", icon: "description" },
      { id: "email_templates", label: "Email 模板", icon: "mail" },
    ]
  },
  {
    title: "系統設置",
    items: [
      { id: "sub_accounts", label: "子帳管理", icon: "manage_accounts" },
      { id: "blog", label: "部落格管理", icon: "article" },
      { id: "settings", label: "系統設置", icon: "settings" },
    ]
  }
];

// Flat list for compatibility and dashboard logic
export const NAV_ITEMS = [
  { id: "dashboard", label: "儀表看板", icon: "dashboard" },
  ...NAV_GROUPS.flatMap(g => g.items)
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
