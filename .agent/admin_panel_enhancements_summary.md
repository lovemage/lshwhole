# Admin Panel Enhancements - Implementation Summary

## Date: 2025-11-23

## Completed Features

### 1. Navigation Standardization ✅
- **Renamed all navigation items to 4 characters:**
  - "儀表板" → "儀表看板"
  - "公告" → "公告管理"
  - "分類" → "分類管理"
  - "商品" → "商品管理"
  - "會員" → "會員管理"
  - "訂單" → "訂單管理"
  - "橫幅" → "橫幅管理"
  - "子帳戶" → "子帳管理"

- **Removed "匯率" (Exchange Rate) navigation item** as requested

### 2. External Link Addition ✅
- **Added "返回網站" (Return to Website) link** in the sidebar
  - Opens in a new tab (`target="_blank"`)
  - Positioned above the logout button
  - Uses the `public` Material icon

### 3. Sub-account Management System ✅

#### Backend API (`/api/admin/sub-accounts/route.ts`)
- **GET**: Fetch all sub-accounts with user details
- **POST**: Create new sub-account with email, password, name, and permissions
- **PUT**: Update existing sub-account (password, name, permissions)
- **DELETE**: Remove sub-account

#### Data Storage
- Created `/src/data/admin_sub_accounts.json` for storing sub-account permissions
- Integrates with Supabase Auth for user management
- Updates profiles table with admin role

#### Frontend Features
- **Sub-account List Page**: Displays all sub-accounts in a table
  - Shows name, email, permission count, creation date
  - Edit and delete actions for each account
  
- **Add/Edit Modal**: 
  - Email input (disabled when editing)
  - Password input (optional when editing)
  - Name input
  - Permission checkboxes for each dashboard page
  
- **Permission System**:
  - Checkbox grid showing all available dashboard pages
  - Permissions stored as array of page IDs
  - Super admin (not in sub-accounts list) has access to all pages

#### Permission Filtering
- **Dynamic Navigation**: `filteredNavItems` filters navigation based on user permissions
- **Permission Check on Mount**: Automatically detects if current user is a sub-account
- **Access Control**: Sub-accounts only see pages they have permission for

### 4. State Management
Added new state variables:
```typescript
const [subAccounts, setSubAccounts] = useState<any[]>([]);
const [subAccountsLoading, setSubAccountsLoading] = useState(false);
const [showSubAccountModal, setShowSubAccountModal] = useState(false);
const [editingSubAccount, setEditingSubAccount] = useState<any>(null);
const [subAccountForm, setSubAccountForm] = useState({
  email: "",
  password: "",
  name: "",
  permissions: [] as string[],
});
const [currentUserPermissions, setCurrentUserPermissions] = useState<string[] | null>(null);
const [currentUserId, setCurrentUserId] = useState<string | null>(null);
```

## Files Modified

1. `/src/app/admin/page.tsx`
   - Added sub-account state management
   - Implemented permission checking logic
   - Created sub-account CRUD functions
   - Added sub-account list UI and modal
   - Updated navigation items
   - Added "返回網站" link
   - Implemented permission-based navigation filtering

2. `/src/app/api/admin/sub-accounts/route.ts` (NEW)
   - Full CRUD API for sub-account management
   - Integrates with Supabase Auth
   - Manages permissions in JSON file

3. `/src/data/admin_sub_accounts.json` (NEW)
   - Stores sub-account permissions
   - Format: `[{ user_id: string, permissions: string[] }]`

## How to Use

### Creating a Sub-account
1. Navigate to "子帳管理" in the admin panel
2. Click "新增子帳戶"
3. Enter email, password, and name
4. Select which pages the sub-account can access
5. Click "確認儲存"

### Managing Permissions
- Each sub-account can be assigned specific dashboard pages
- Permissions are granular - control access to:
  - Dashboard, Announcements, Categories, Crawler, Products
  - Members, Orders, Hot Products, Banners, Settings, etc.
- Super admins (not in sub-accounts list) have full access

### Editing Sub-accounts
1. Click "編輯" next to any sub-account
2. Update name or permissions (password optional)
3. Save changes

### Deleting Sub-accounts
1. Click "刪除" next to any sub-account
2. Confirm deletion
3. User is removed from Supabase Auth and permissions file

## Technical Notes

- **Authentication**: Uses Supabase Auth for user management
- **Permission Storage**: JSON file for flexibility and simplicity
- **Role Assignment**: Sub-accounts have `role: 'admin'` in profiles table
- **Security**: Password updates use Supabase Admin API
- **UI/UX**: Modal-based editing with checkbox grid for permissions

## Next Steps (Optional Enhancements)

1. Add role-based permissions (e.g., read-only vs. full access)
2. Implement activity logging for sub-accounts
3. Add email verification for new sub-accounts
4. Create permission templates for common roles
5. Add bulk permission management

## Testing Checklist

- [ ] Create a new sub-account
- [ ] Assign specific permissions
- [ ] Log in as sub-account and verify limited access
- [ ] Edit sub-account permissions
- [ ] Update sub-account password
- [ ] Delete sub-account
- [ ] Verify super admin still has full access
- [ ] Test "返回網站" link opens in new tab
