"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface Profile {
  user_id: string;
  email: string;
  display_name: string;
  phone: string;
  delivery_address: string;
  tier: string;
  account_status: string;
  created_at?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    display_name: "",
    phone: "",
    delivery_address: "",
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push("/login");
        return;
      }

      const response = await fetch("/api/profile", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error("載入個人資料失敗");
      }

      const data = await response.json();
      setProfile(data);
      setFormData({
        display_name: data.display_name || "",
        phone: data.phone || "",
        delivery_address: data.delivery_address || "",
      });
    } catch (err) {
      console.error("載入個人資料失敗", err);
      setError("載入個人資料失敗");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push("/login");
        return;
      }

      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "更新失敗");
      }

      const updatedProfile = await response.json();
      setProfile(updatedProfile);
      setIsEditing(false);
      setSuccess("個人資料已更新");
    } catch (err: any) {
      console.error("更新個人資料失敗", err);
      setError(err.message || "更新個人資料失敗");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        display_name: profile.display_name || "",
        phone: profile.phone || "",
        delivery_address: profile.delivery_address || "",
      });
    }
    setIsEditing(false);
    setError(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600">找不到個人資料</p>
          <Link href="/" className="text-primary hover:underline mt-4 inline-block">
            返回首頁
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">個人資料</h1>
            <Link
              href="/"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              返回首頁
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 成功/錯誤提示 */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* 個人資料卡片 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">基本資料</h2>
                <p className="text-sm text-gray-600 mt-1">管理您的個人資料和收件資訊</p>
              </div>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  編輯資料
                </button>
              )}
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Email（不可編輯） */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-900 border border-gray-200">
                {profile.email}
              </div>
              <p className="text-xs text-gray-500 mt-1">Email 無法修改</p>
            </div>

            {/* 會員等級（不可編輯） */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                會員等級
              </label>
              <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-900 border border-gray-200">
                {profile.tier === "retail" && "零售會員"}
                {profile.tier === "wholesale" && "批發會員"}
                {profile.tier === "vip" && "VIP 會員"}
                {profile.tier === "basic" && "基本會員"}
              </div>
            </div>

            {/* 姓名 / 公司 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                姓名 / 公司 <span className="text-red-500">*</span>
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="display_name"
                  value={formData.display_name}
                  onChange={handleInputChange}
                  placeholder="請輸入您的姓名或公司名稱"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                  required
                />
              ) : (
                <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-900 border border-gray-200">
                  {profile.display_name || "未設定"}
                </div>
              )}
            </div>

            {/* 手機 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                手機 <span className="text-red-500">*</span>
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="請輸入您的手機號碼"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                  required
                />
              ) : (
                <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-900 border border-gray-200">
                  {profile.phone || "未設定"}
                </div>
              )}
            </div>

            {/* 收件地址 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                收件地址 <span className="text-red-500">*</span>
              </label>
              {isEditing ? (
                <textarea
                  name="delivery_address"
                  value={formData.delivery_address}
                  onChange={handleInputChange}
                  placeholder="請輸入完整的收件地址"
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                  required
                />
              ) : (
                <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-900 border border-gray-200 whitespace-pre-wrap">
                  {profile.delivery_address || "未設定"}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">此地址將作為下單時的預設收件地址</p>
            </div>

            {/* 編輯模式的按鈕 */}
            {isEditing && (
              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "儲存中..." : "儲存變更"}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  取消
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 帳戶資訊 */}
        <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">帳戶資訊</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">帳戶狀態：</span>
              <span className={profile.account_status === "ACTIVE" ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                {profile.account_status === "ACTIVE" ? "正常" : "已鎖定"}
              </span>
            </div>
            {profile.created_at && (
              <div className="flex justify-between">
                <span className="text-gray-600">註冊時間：</span>
                <span className="text-gray-900">
                  {new Date(profile.created_at).toLocaleDateString("zh-TW")}
                </span>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

