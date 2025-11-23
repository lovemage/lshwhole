# LshWholesale - Light Design System

## 概述

所有頁面統一使用 **Light 設計**，基於 Tailwind CSS v4 和全局 CSS 變數。

## 顏色系統

### 主色調
- **Primary**: `#fac638` (黃色)
- **Background Light**: `#f8f8f5` (淺米色)
- **Text Dark**: `#111318` (深灰)

### 灰色系
- **Gray 50**: `#f9fafb`
- **Gray 100**: `#f3f4f6`
- **Gray 200**: `#e5e7eb`
- **Gray 300**: `#d1d5db`
- **Gray 400**: `#9ca3af`
- **Gray 500**: `#6b7280`
- **Gray 600**: `#4b5563`
- **Gray 700**: `#374151`
- **Gray 800**: `#1f2937`
- **Gray 900**: `#111318`

## 使用規則

### ✅ 必須遵守
1. **禁止使用 `dark:` 前綴** - 所有頁面統一 light 設計
2. **使用 CSS 變數** - 在 `globals.css` 中定義所有顏色
3. **背景色** - 使用 `bg-light-background` 或 `bg-white`
4. **文字色** - 使用 `text-gray-800` 或 `text-gray-600`
5. **邊框色** - 使用 `border-gray-200` 或 `border-gray-300`

### ❌ 禁止
- `dark:bg-*`
- `dark:text-*`
- `dark:border-*`
- 內聯 `style` 屬性設置顏色
- 硬編碼顏色值

## 頁面模板結構

### 根容器
```tsx
<div className="relative flex min-h-screen w-full flex-col bg-light-background overflow-x-hidden">
  {/* 內容 */}
</div>
```

### Header
```tsx
<header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-sm">
  <div className="flex items-center justify-between border-b border-gray-200 px-4 sm:px-6 lg:px-10 py-3">
    {/* 內容 */}
  </div>
</header>
```

### 卡片
```tsx
<div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
  {/* 內容 */}
</div>
```

### 按鈕
```tsx
{/* Primary */}
<button className="bg-primary text-white hover:bg-primary/90">
  {/* 內容 */}
</button>

{/* Secondary */}
<button className="bg-gray-200 text-gray-800 hover:bg-gray-300">
  {/* 內容 */}
</button>
```

## 全局 CSS 類

在 `globals.css` 中定義的實用類：

- `.bg-light-primary` - 主色背景
- `.bg-light-background` - 頁面背景
- `.bg-light-white` - 白色背景
- `.bg-light-gray-*` - 灰色背景
- `.text-light-primary` - 主色文字
- `.text-light-dark` - 深色文字
- `.text-light-gray-*` - 灰色文字
- `.border-light-gray-*` - 灰色邊框
- `.hover-light-primary:hover` - 懸停效果

## 字體

- **Display Font**: Work Sans (weights: 400, 500, 600, 700, 800, 900)
- **Icon Font**: Material Symbols Outlined

## 圓角

- `rounded` - 2px
- `rounded-lg` - 4px
- `rounded-xl` - 8px
- `rounded-full` - 12px

## 響應式設計

使用 Tailwind 的響應式前綴：
- `sm:` - 640px
- `md:` - 768px
- `lg:` - 1024px
- `xl:` - 1280px

## 新頁面建立步驟

1. 建立新頁面檔案 `web/src/app/[page-name]/page.tsx`
2. 使用根容器模板
3. 移除所有 `dark:` 前綴
4. 使用 `bg-light-background` 作為頁面背景
5. 使用 `text-gray-800` 作為主文字色
6. 參照現有頁面的樣式結構

## 顏色覆蓋（如需特殊頁面色調）

如果某個頁面需要不同的主色（如登入頁面的藍色），在 `globals.css` 中為該頁面建立專用類：

```css
.page-login {
  --color-primary: #2b6cee;
}
```

然後在頁面根容器添加該類。

## 常見問題

**Q: 為什麼不能使用 `dark:` 前綴？**
A: 設計要求統一使用 light 設計，避免混亂。

**Q: 如何改變某個頁面的主色？**
A: 在 `globals.css` 中建立頁面專用類，然後在頁面根容器使用。

**Q: 可以使用內聯 style 嗎？**
A: 不建議。所有樣式應在 CSS 中定義，保持一致性。

