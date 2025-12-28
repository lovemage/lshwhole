import { useState, useEffect } from "react";
import { NAV_ITEMS } from "./constants";
import { supabase } from "@/lib/supabase";

interface SubAccount {
  user_id: string;
  email: string;
  name: string;
  permissions: string[];
  created_at: string;
}

export default function SubAccountManager() {
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([]);
  const [subAccountsLoading, setSubAccountsLoading] = useState(false);
  const [showSubAccountModal, setShowSubAccountModal] = useState(false);
  const [editingSubAccount, setEditingSubAccount] = useState<SubAccount | null>(null);
  const [subAccountForm, setSubAccountForm] = useState({
    email: "",
    password: "",
    name: "",
    permissions: [] as string[],
  });

  useEffect(() => {
    fetchSubAccounts();
  }, []);

  const getAuthHeader = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  };

  const fetchSubAccounts = async () => {
    try {
      setSubAccountsLoading(true);
      const res = await fetch("/api/admin/sub-accounts", {
        headers: await getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setSubAccounts(data);
      }
    } catch (err) {
      console.error("Failed to fetch sub-accounts:", err);
    } finally {
      setSubAccountsLoading(false);
    }
  };

  const handleSaveSubAccount = async () => {
    if (!subAccountForm.email || (!editingSubAccount && !subAccountForm.password)) {
      alert("請填寫必要欄位");
      return;
    }

    try {
      setSubAccountsLoading(true);
      const method = editingSubAccount ? "PUT" : "POST";
      const body = editingSubAccount
        ? { ...subAccountForm, user_id: editingSubAccount.user_id }
        : subAccountForm;

      const authHeader = await getAuthHeader();
      const res = await fetch("/api/admin/sub-accounts", {
        method,
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        alert(editingSubAccount ? "子帳戶已更新" : "子帳戶已建立");
        setShowSubAccountModal(false);
        setEditingSubAccount(null);
        setSubAccountForm({ email: "", password: "", name: "", permissions: [] });
        fetchSubAccounts();
      } else {
        const j = await res.json().catch(() => ({}));
        alert(j?.error || "操作失敗");
      }
    } catch (err) {
      console.error("Failed to save sub-account:", err);
      alert("操作失敗");
    } finally {
      setSubAccountsLoading(false);
    }
  };

  const handleDeleteSubAccount = async (userId: string) => {
    if (!confirm("確定要刪除此子帳戶嗎？")) return;
    try {
      const res = await fetch(`/api/admin/sub-accounts?user_id=${userId}`, {
        method: "DELETE",
        headers: await getAuthHeader(),
      });
      if (res.ok) {
        alert("子帳戶已刪除");
        fetchSubAccounts();
      } else {
        alert("刪除失敗");
      }
    } catch (err) {
      console.error("Failed to delete sub-account:", err);
      alert("刪除失敗");
    }
  };

  const togglePermission = (navId: string) => {
    setSubAccountForm(prev => {
      const perms = prev.permissions.includes(navId)
        ? prev.permissions.filter(p => p !== navId)
        : [...prev.permissions, navId];
      return { ...prev, permissions: perms };
    });
  };

  const renderSubAccountModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">{editingSubAccount ? "編輯子帳戶" : "新增子帳戶"}</h2>
          <button onClick={() => setShowSubAccountModal(false)} className="text-text-secondary-light hover:text-text-primary-light">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email (帳號)</label>
            <input
              type="email"
              value={subAccountForm.email}
              onChange={(e) => setSubAccountForm({ ...subAccountForm, email: e.target.value })}
              disabled={!!editingSubAccount}
              className="w-full px-3 py-2 border border-border-light rounded-lg disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">密碼 {editingSubAccount && "(不修改請留空)"}</label>
            <input
              type="password"
              value={subAccountForm.password}
              onChange={(e) => setSubAccountForm({ ...subAccountForm, password: e.target.value })}
              className="w-full px-3 py-2 border border-border-light rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">姓名</label>
            <input
              type="text"
              value={subAccountForm.name}
              onChange={(e) => setSubAccountForm({ ...subAccountForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-border-light rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">權限設定 (勾選可見頁面)</label>
            <div className="grid grid-cols-2 gap-2">
              {NAV_ITEMS.map(item => (
                <label key={item.id} className="flex items-center gap-2 p-2 border border-border-light rounded bg-gray-50 cursor-pointer hover:bg-gray-100">
                  <input
                    type="checkbox"
                    checked={subAccountForm.permissions.includes(item.id)}
                    onChange={() => togglePermission(item.id)}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span className="text-sm">{item.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => setShowSubAccountModal(false)}
            className="flex-1 px-4 py-2 border border-border-light rounded-lg font-medium hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleSaveSubAccount}
            disabled={subAccountsLoading}
            className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {subAccountsLoading ? "處理中..." : "確認儲存"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 md:p-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-text-secondary-light">新增與管理後台子帳戶及其權限</p>
        </div>
        <button
          onClick={() => {
            setEditingSubAccount(null);
            setSubAccountForm({ email: "", password: "", name: "", permissions: [] });
            setShowSubAccountModal(true);
          }}
          className="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary/90"
        >
          新增子帳戶
        </button>
      </div>

      <div className="bg-white rounded-xl border border-border-light overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-border-light">
            <tr>
              <th className="px-6 py-3 text-sm font-medium text-text-secondary-light">姓名</th>
              <th className="px-6 py-3 text-sm font-medium text-text-secondary-light">Email</th>
              <th className="px-6 py-3 text-sm font-medium text-text-secondary-light">權限數量</th>
              <th className="px-6 py-3 text-sm font-medium text-text-secondary-light">建立時間</th>
              <th className="px-6 py-3 text-sm font-medium text-text-secondary-light">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {subAccounts.map((account) => (
              <tr key={account.user_id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-text-primary-light">{account.name}</td>
                <td className="px-6 py-4 text-sm text-text-secondary-light">{account.email}</td>
                <td className="px-6 py-4 text-sm text-text-secondary-light">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                    {account.permissions?.length || 0} 項
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-text-secondary-light">
                  {new Date(account.created_at).toLocaleDateString("zh-TW")}
                </td>
                <td className="px-6 py-4 text-sm flex gap-3">
                  <button
                    onClick={() => {
                      setEditingSubAccount(account);
                      setSubAccountForm({
                        email: account.email,
                        password: "",
                        name: account.name,
                        permissions: account.permissions || [],
                      });
                      setShowSubAccountModal(true);
                    }}
                    className="text-primary hover:underline"
                  >
                    編輯
                  </button>
                  <button
                    onClick={() => handleDeleteSubAccount(account.user_id)}
                    className="text-danger hover:underline"
                  >
                    刪除
                  </button>
                </td>
              </tr>
            ))}
            {subAccounts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-text-secondary-light">
                  暫無子帳戶
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {showSubAccountModal && renderSubAccountModal()}
    </div>
  );
}
