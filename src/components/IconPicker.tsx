"use client";

import { useState } from "react";

interface IconPickerProps {
  value?: string;
  onChange: (icon: string) => void;
  onClose: () => void;
}

// 國旗 Emoji (用於 L1 國家分類)
const FLAG_EMOJIS = [
  "🇯🇵", // 日本
  "🇰🇷", // 韓國  
  "🇹🇭", // 泰國
  "🇪🇺", // 歐盟
  "🇺🇸", // 美國
  "🇨🇳", // 中國
  "🇹🇼", // 台灣
  "🇬🇧", // 英國
  "🇫🇷", // 法國
  "🇩🇪", // 德國
  "🇮🇹", // 義大利
  "🇪🇸", // 西班牙
  "🇨🇦", // 加拿大
  "🇦🇺", // 澳洲
  "🇸🇬", // 新加坡
  "🇲🇾", // 馬來西亞
  "🇻🇳", // 越南
  "🇮🇩", // 印尼
  "🇵🇭", // 菲律賓
  "🇮🇳", // 印度
];

// 商城專用 Google Material Icons
const ECOMMERCE_ICONS = [
  // 購物相關
  "shopping_bag", "shopping_cart", "shopping_basket", "store", "storefront",
  "local_mall", "local_grocery_store", "add_shopping_cart", "remove_shopping_cart",
  "shopping_cart_checkout", "point_of_sale", "receipt", "receipt_long",
  "payment", "credit_card", "account_balance_wallet", "monetization_on",
  "sell", "local_offer", "loyalty", "redeem", "card_giftcard",
  
  // 服裝時尚
  "checkroom", "dry_cleaning", "local_laundry_service", "iron", "content_cut",
  "style", "face_retouching_natural", "palette", "brush", "color_lens",
  "diamond", "ring_volume", "watch", "schedule", "access_time",
  
  // 配件飾品
  "wallet", "watch_later",
  "auto_awesome", "star", "grade", "workspace_premium",
  
  // 美妝保養
  "spa", "self_improvement", "healing", "face",
  "local_pharmacy", "medical_services", "health_and_safety", "clean_hands",
  "sanitizer", "soap", "shower",
  
  // 食品飲料
  "restaurant", "restaurant_menu", "local_dining", "local_bar", "local_cafe",
  "local_pizza", "cake", "coffee", "wine_bar", "liquor", "icecream",
  "lunch_dining", "dinner_dining", "breakfast_dining", "fastfood",
  "ramen_dining", "rice_bowl", "cookie", "bakery_dining",
  
  // 嬰幼兒童
  "child_care", "baby_changing_station", "toys", "sports_esports", "games",
  "extension", "casino", "celebration", "party_mode",
  "school", "local_library",
  
  // 家居生活
  "home", "house", "apartment", "chair", "table_restaurant",
  "kitchen", "microwave", "cleaning_services",
  "light", "lightbulb", "electrical_services", "build",
  
  // 電子3C
  "phone_android", "phone_iphone", "tablet", "laptop", "computer", "tv",
  "headphones", "speaker", "camera", "photo_camera", "videocam",
  "mouse", "keyboard", "memory", "storage",
  
  // 運動健身
  "fitness_center", "sports_gymnastics", "sports_soccer", "sports_basketball",
  "sports_tennis", "pool", "directions_bike", "directions_run", "hiking",
  "outdoor_grill", "camping", "kayaking", "surfing",
  
  // 寵物用品
  "pets", "cruelty_free", "eco", "park", "grass", "nature", "forest",
  
  // 汽車用品
  "directions_car", "local_gas_station", "car_repair", "construction",
  "handyman",
  
  // 辦公文具
  "work", "business_center", "folder", "description", "edit",
  "create", "draw", "print", "scanner",
  
  // 通用商業
  "inventory", "inventory_2", "local_shipping", "delivery_dining",
  "flight", "train", "directions_boat", "public", "language",
  "translate", "support_agent", "headset_mic", "call", "email",
  
  // 品質認證
  "verified", "verified_user", "security", "shield", "gpp_good", "thumb_up",
  "recommend", "star_rate", "reviews", "feedback", "rate_review",
  
  // 新品熱銷
  "new_releases", "trending_up", "trending_down", "whatshot", "local_fire_department",
  "flash_on", "bolt", "speed", "rocket_launch",
  
  // 分類標籤
  "category", "label", "bookmark", "tag", "filter_list", "sort", 
  "view_list", "grid_view", "view_module",
  
  // 搜尋導航
  "search", "find_in_page", "zoom_in", "zoom_out", "fullscreen",
  "arrow_forward", "arrow_back", "expand_more", "expand_less",
  "chevron_right", "chevron_left", "navigate_next", "navigate_before",
  
  // 其他實用
  "favorite", "favorite_border", "share", "link", "content_copy",
  "download", "upload", "cloud_upload", "cloud_download", "sync",
  "refresh", "cached", "update", "notifications", "campaign"
];

export default function IconPicker({ value, onChange, onClose }: IconPickerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIcon, setSelectedIcon] = useState(value || "");
  const [activeTab, setActiveTab] = useState<"flags" | "icons">("flags");

  // 合併所有圖標選項
  const allIcons = [...new Set(ECOMMERCE_ICONS)];
  const allFlags = FLAG_EMOJIS;

  // 根據當前標籤頁過濾
  const currentItems = activeTab === "flags" ? allFlags : allIcons;
  const filteredItems = currentItems.filter(item =>
    item.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleItemSelect = (item: string) => {
    setSelectedIcon(item);
  };

  const handleConfirm = () => {
    onChange(selectedIcon);
    onClose();
  };

  const handleClear = () => {
    setSelectedIcon("");
    onChange("");
    onClose();
  };

  // 判斷是否為 emoji
  const isEmoji = (str: string) => {
    return /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(str);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">選擇圖標</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab("flags")}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "flags"
                  ? "bg-white text-primary shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              🏳️ 國旗 ({allFlags.length})
            </button>
            <button
              onClick={() => setActiveTab("icons")}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "icons"
                  ? "bg-white text-primary shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              ⭐ 圖標 ({allIcons.length})
            </button>
          </div>
          
          {/* Search input */}
          <div className="mb-4">
            <input
              type="text"
              placeholder={`搜尋${activeTab === "flags" ? "國旗" : "圖標"}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Selected item preview */}
          {selectedIcon && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              {isEmoji(selectedIcon) ? (
                <span className="text-2xl">{selectedIcon}</span>
              ) : (
                <span className="material-symbols-outlined text-2xl text-primary">
                  {selectedIcon}
                </span>
              )}
              <div>
                <p className="text-sm font-medium text-gray-900">已選擇</p>
                <p className="text-xs text-gray-500">{selectedIcon}</p>
              </div>
            </div>
          )}
        </div>

        {/* Content Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className={`grid gap-3 ${activeTab === "flags" ? "grid-cols-10" : "grid-cols-8"}`}>
            {filteredItems.map((item, index) => (
              <button
                key={`${activeTab}-${item}-${index}`}
                onClick={() => handleItemSelect(item)}
                className={`p-3 rounded-lg border-2 transition-all hover:bg-gray-50 ${
                  selectedIcon === item
                    ? "border-primary bg-primary/10"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                title={item}
              >
                {activeTab === "flags" ? (
                  <span className="text-2xl">{item}</span>
                ) : (
                  <span className="material-symbols-outlined text-xl text-gray-700">
                    {item}
                  </span>
                )}
              </button>
            ))}
          </div>
          
          {filteredItems.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <span className="material-symbols-outlined text-4xl mb-2 block">search_off</span>
              <p>找不到符合的{activeTab === "flags" ? "國旗" : "圖標"}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={handleClear}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            清除
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            確認
          </button>
        </div>
      </div>
    </div>
  );
}
