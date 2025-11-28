import { useState, useEffect } from "react";

interface Member {
  user_id: string;
  email: string;
  display_name: string;
  phone: string;
  tier: string;
  balance_twd: number;
  last_purchase_date: string;
  login_enabled: boolean;
  wholesale_upgrade_status: string;
  created_at: string;
  profile: any;
  topup_history?: any[];
}

export default function MemberManager() {
  const [activeTab, setActiveTab] = useState<"MEMBERS" | "TOPUP_REQUESTS">("MEMBERS");
  
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberTierFilter, setMemberTierFilter] = useState("");
  const [memberStatusFilter, setMemberStatusFilter] = useState("");
  const [memberPage, setMemberPage] = useState(0);
  const [memberTotal, setMemberTotal] = useState(0);
  const pageSize = 20;
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showMemberDetail, setShowMemberDetail] = useState(false);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState(0);
  const [topupNote, setTopupNote] = useState("");
  const [topupLoading, setTopupLoading] = useState(false);

  // Topup Requests
  const [topupRequests, setTopupRequests] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [viewProofImage, setViewProofImage] = useState<string | null>(null);

  useEffect(() => {
    fetchMembers(0);
    fetchTopupRequests();
  }, []);

  const fetchTopupRequests = async () => {
    try {
      setRequestsLoading(true);
      const res = await fetch("/api/admin/topup-requests?status=PENDING");
      if (res.ok) {
        const json = await res.json();
        setTopupRequests(json.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch requests:", err);
    } finally {
      setRequestsLoading(false);
    }
  };

  const handleRequestAction = async (id: number, action: "APPROVE" | "REJECT", note: string = "") => {
    if (!confirm(`確定要${action === "APPROVE" ? "核准" : "拒絕"}此申請嗎？`)) return;
    
    try {
      const res = await fetch("/api/admin/topup-requests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, note }),
      });
      
      if (res.ok) {
        alert("操作成功");
        fetchTopupRequests();
      } else {
        alert("操作失敗");
      }
    } catch (err) {
      console.error(err);
      alert("操作失敗");
    }
  };

  const fetchMembers = async (page: number = 0) => {
    try {
      setMembersLoading(true);
      const offset = page * pageSize;
      let url = `/api/admin/members?limit=${pageSize}&offset=${offset}`;

      if (memberSearch) {
        url += `&search=${encodeURIComponent(memberSearch)}`;
      }

      if (memberTierFilter) {
        url += `&tier=${memberTierFilter}`;
      }

      if (memberStatusFilter) {
        url += `&status_filter=${memberStatusFilter}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const result = await res.json();
        setMembers(result.data || []);
        setMemberTotal(result.count || 0);
        setMemberPage(page);
      } else {
        const j = await res.json().catch(() => ({}));
        alert("載入會員列表失敗：" + (j?.error || "未知錯誤"));
      }
    } catch (err) {
      console.error("Failed to fetch members:", err);
      alert("載入會員列表失敗");
    } finally {
      setMembersLoading(false);
    }
  };

  const openMemberDetail = async (member: Member) => {
    try {
      const res = await fetch(`/api/admin/members/${member.user_id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedMember(data);
        setShowMemberDetail(true);
      } else {
        const j = await res.json().catch(() => ({}));
        alert("載入會員詳情失敗：" + (j?.error || "未知錯誤"));
      }
    } catch (err) {
      console.error("Failed to fetch member detail:", err);
      alert("載入會員詳情失敗");
    }
  };

  const updateMemberTier = async (userId: string, newTier: string) => {
    try {
      const res = await fetch(`/api/admin/members/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: newTier }),
      });

      if (res.ok) {
        alert("會員資格已更新");
        fetchMembers(memberPage);
        if (selectedMember?.profile?.user_id === userId) {
          openMemberDetail({ user_id: userId } as Member);
        }
      } else {
        const j = await res.json().catch(() => ({}));
        alert("更新失敗：" + (j?.error || "未知錯誤"));
      }
    } catch (err) {
      console.error("Failed to update member tier:", err);
      alert("更新失敗");
    }
  };

  const toggleMemberLogin = async (userId: string, enabled: boolean) => {
    try {
      const res = await fetch(`/api/admin/members/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login_enabled: enabled }),
      });

      if (res.ok) {
        alert(`已${enabled ? "開啟" : "關閉"}該會員的登入權限`);
        fetchMembers(memberPage);
        if (selectedMember?.profile?.user_id === userId) {
          openMemberDetail({ user_id: userId } as Member);
        }
      } else {
        const j = await res.json().catch(() => ({}));
        alert("更新失敗：" + (j?.error || "未知錯誤"));
      }
    } catch (err) {
      console.error("Failed to toggle member login:", err);
      alert("更新失敗");
    }
  };

  const handleTopup = async () => {
    if (!selectedMember || topupAmount <= 0) {
      alert("請輸入有效的儲值金額");
      return;
    }

    try {
      setTopupLoading(true);
      const res = await fetch(`/api/admin/members/${selectedMember.profile.user_id}/topup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount_twd: topupAmount,
          note: topupNote,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        alert(`儲值成功！新餘額：NT$ ${result.new_balance}`);
        setShowTopupModal(false);
        setTopupAmount(0);
        setTopupNote("");
        // 重新載入會員詳情與列表
        openMemberDetail({ user_id: selectedMember.profile.user_id } as Member);
        fetchMembers(memberPage);
      } else {
        const j = await res.json().catch(() => ({}));
        alert("儲值失敗：" + (j?.error || "未知錯誤"));
      }
    } catch (err) {
      console.error("Failed to topup:", err);
      alert("儲值失敗");
    } finally {
      setTopupLoading(false);
    }
  };

  const handleApproveUpgrade = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/members/${userId}/upgrade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(j?.error || "批准升級失敗");
        return;
      }
      alert("已批准此會員升級為批發會員");
      openMemberDetail({ user_id: userId } as Member);
      fetchMembers(memberPage);
    } catch (err) {
      console.error("Failed to approve upgrade:", err);
      alert("批准升級失敗");
    }
  };

  const handleRejectUpgrade = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/members/${userId}/upgrade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });
      alert("已拒絕此會員的升級申請");
      openMemberDetail({ user_id: userId } as Member);
      fetchMembers(memberPage);
    } catch (err) {
      console.error("Failed to reject upgrade:", err);
      alert("拒絕申請失敗");
    }
  };

  return (
    <div className="py-6 space-y-6">
      <div className="flex gap-4 border-b border-border-light">
        <button
          onClick={() => setActiveTab("MEMBERS")}
          className={`px-4 py-2 font-medium ${activeTab === "MEMBERS" ? "text-primary border-b-2 border-primary" : "text-text-secondary-light"}`}
        >
          會員列表
        </button>
        <button
          onClick={() => setActiveTab("TOPUP_REQUESTS")}
          className={`px-4 py-2 font-medium ${activeTab === "TOPUP_REQUESTS" ? "text-primary border-b-2 border-primary" : "text-text-secondary-light"}`}
        >
          儲值申請 
          {topupRequests.length > 0 && <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{topupRequests.length}</span>}
        </button>
      </div>

      {activeTab === "MEMBERS" ? (
        <>
      {/* 搜尋與篩選 */}
      <div className="flex flex-wrap gap-4">
        <input
          type="text"
          placeholder="搜尋會員（Email / 姓名 / 電話）"
          value={memberSearch}
          onChange={(e) => setMemberSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-2 border border-border-light rounded-lg"
        />
        <select
          value={memberTierFilter}
          onChange={(e) => setMemberTierFilter(e.target.value)}
          className="px-4 py-2 border border-border-light rounded-lg"
        >
          <option value="">全部會員資格</option>
          <option value="guest">訪客會員</option>
          <option value="retail">零售會員</option>
          <option value="wholesale">批發會員</option>
          <option value="vip">VIP會員</option>
        </select>
        <select
          value={memberStatusFilter}
          onChange={(e) => setMemberStatusFilter(e.target.value)}
          className="px-4 py-2 border border-border-light rounded-lg"
        >
          <option value="">全部狀態</option>
          <option value="overdue">超過45天未消費</option>
          <option value="disabled">登入權限已關閉</option>
        </select>
        <button
          onClick={() => fetchMembers(0)}
          className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90"
        >
          搜尋
        </button>
      </div>

      {/* 會員列表 */}
      {membersLoading ? (
        <p className="text-text-secondary-light">載入中...</p>
      ) : members.length === 0 ? (
        <p className="text-text-secondary-light">暫無會員</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border-light">
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary-light">Email</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary-light">姓名</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary-light">電話</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary-light">會員資格</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary-light">錢包餘額</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary-light">最後消費</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary-light">登入狀態</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary-light">申請</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary-light">註冊時間</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary-light">操作</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.user_id} className="border-b border-border-light hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm">{member.email || "-"}</td>
                  <td className="py-3 px-4 text-sm">{member.display_name || "-"}</td>
                  <td className="py-3 px-4 text-sm">{member.phone || "-"}</td>
                  <td className="py-3 px-4 text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${member.tier === "vip"
                        ? "bg-yellow-100 text-yellow-800"
                        : member.tier === "wholesale"
                          ? "bg-purple-100 text-purple-800"
                          : member.tier === "retail"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                    >
                      {member.tier === "vip"
                        ? "VIP會員"
                        : member.tier === "wholesale"
                          ? "批發會員"
                          : member.tier === "retail"
                            ? "零售會員"
                            : "訪客會員"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm font-medium">NT$ {member.balance_twd || 0}</td>
                  <td className="py-3 px-4 text-sm text-text-secondary-light">
                    {member.last_purchase_date
                      ? new Date(member.last_purchase_date).toLocaleDateString("zh-TW")
                      : "無"}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${member.login_enabled
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                        }`}
                    >
                      {member.login_enabled ? "可登入" : "已關閉"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {member.wholesale_upgrade_status === "PENDING" && (
                      <span className="inline-flex items-center text-amber-600">
                        <span className="material-symbols-outlined text-base mr-1">notifications_active</span>
                        <span className="text-xs">申請中</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-text-secondary-light">
                    {new Date(member.created_at).toLocaleDateString("zh-TW")}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <button
                      onClick={() => openMemberDetail(member)}
                      className="text-primary hover:underline font-medium"
                    >
                      詳情
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 分頁 */}
      {memberTotal > pageSize && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => fetchMembers(memberPage - 1)}
            disabled={memberPage === 0}
            className="px-4 py-2 border border-border-light rounded-lg disabled:opacity-50"
          >
            上一頁
          </button>
          <span className="px-4 py-2">
            第 {memberPage + 1} 頁 / 共 {Math.ceil(memberTotal / pageSize)} 頁
          </span>
          <button
            onClick={() => fetchMembers(memberPage + 1)}
            disabled={(memberPage + 1) * pageSize >= memberTotal}
            className="px-4 py-2 border border-border-light rounded-lg disabled:opacity-50"
          >
            下一頁
          </button>
        </div>
      )}
      </>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">待處理儲值申請</h2>
            <button onClick={fetchTopupRequests} className="text-primary text-sm hover:underline">重新整理</button>
          </div>
          
          {requestsLoading ? (
            <p>載入中...</p>
          ) : topupRequests.length === 0 ? (
            <p className="text-gray-500">目前沒有待處理的申請</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border-light bg-gray-50">
                    <th className="text-left py-3 px-4 text-sm font-medium">申請時間</th>
                    <th className="text-left py-3 px-4 text-sm font-medium">會員</th>
                    <th className="text-left py-3 px-4 text-sm font-medium">金額</th>
                    <th className="text-left py-3 px-4 text-sm font-medium">帳號後五碼</th>
                    <th className="text-left py-3 px-4 text-sm font-medium">憑證</th>
                    <th className="text-left py-3 px-4 text-sm font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {topupRequests.map((req) => (
                    <tr key={req.id} className="border-b border-border-light hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm">{new Date(req.created_at).toLocaleString("zh-TW")}</td>
                      <td className="py-3 px-4 text-sm">
                        <div>{req.user?.display_name || "-"}</div>
                        <div className="text-xs text-gray-500">{req.user?.email}</div>
                      </td>
                      <td className="py-3 px-4 text-sm font-bold text-green-600">NT$ {req.amount_twd}</td>
                      <td className="py-3 px-4 text-sm">{req.bank_account_last_5}</td>
                      <td className="py-3 px-4 text-sm">
                        {req.proof_image ? (
                          <button
                            onClick={() => setViewProofImage(req.proof_image)}
                            className="text-primary hover:underline text-xs"
                          >
                            查看
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs">無</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm flex gap-2">
                        <button
                          onClick={() => handleRequestAction(req.id, "APPROVE")}
                          className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                        >
                          核准
                        </button>
                        <button
                          onClick={() => handleRequestAction(req.id, "REJECT")}
                          className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                        >
                          拒絕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 會員詳情 Modal */}
      {showMemberDetail && selectedMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-border-light p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold">會員詳情</h2>
              <button
                onClick={() => setShowMemberDetail(false)}
                className="text-text-secondary-light hover:text-text-primary-light"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 基本資料 */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold">基本資料</h3>
                  <div className="flex items-center gap-3">
                    <div className={`px-3 py-1 rounded text-sm font-medium ${selectedMember.profile.login_enabled ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                      {selectedMember.profile.login_enabled ? "登入權限：開啟" : "登入權限：關閉"}
                    </div>
                    <button
                      onClick={() => toggleMemberLogin(selectedMember.profile.user_id, !selectedMember.profile.login_enabled)}
                      className={`px-3 py-1 rounded text-sm font-medium border ${selectedMember.profile.login_enabled ? "border-red-300 text-red-600 hover:bg-red-50" : "border-green-300 text-green-600 hover:bg-green-50"}`}
                    >
                      {selectedMember.profile.login_enabled ? "關閉權限" : "開啟權限"}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-text-secondary-light">Email</p>
                    <p className="font-medium">{selectedMember.profile.email || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary-light">姓名</p>
                    <p className="font-medium">{selectedMember.profile.display_name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary-light">電話</p>
                    <p className="font-medium">{selectedMember.profile.phone || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary-light">收件地址</p>
                    <p className="font-medium">{selectedMember.profile.delivery_address || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary-light">註冊時間</p>
                    <p className="font-medium">{new Date(selectedMember.profile.created_at).toLocaleString("zh-TW")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary-light">最後消費日期</p>
                    <p className="font-medium">
                      {selectedMember.profile.last_purchase_date
                        ? new Date(selectedMember.profile.last_purchase_date).toLocaleDateString("zh-TW")
                        : "無紀錄"}
                    </p>
                  </div>
                </div>
              </div>

              {/* 會員資格 */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold">會員資格</h3>
                <div className="flex items-center gap-4">
                  <select
                    value={selectedMember.profile.tier}
                    onChange={(e) => updateMemberTier(selectedMember.profile.user_id, e.target.value)}
                    className="px-4 py-2 border border-border-light rounded-lg"
                  >
                    <option value="guest">訪客會員</option>
                    <option value="retail">零售會員</option>
                    <option value="wholesale">批發會員</option>
                    <option value="vip">VIP會員</option>
                  </select>
                  <span className="text-sm text-text-secondary-light">變更會員資格</span>
                </div>
              </div>

              {/* 錢包資訊 */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold">錢包資訊</h3>
                  <button
                    onClick={() => setShowTopupModal(true)}
                    className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90"
                  >
                    手動儲值
                  </button>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-text-secondary-light">當前餘額</p>
                  <p className="text-3xl font-bold text-primary">NT$ {selectedMember.balance_twd || 0}</p>
                </div>
              </div>

              {/* 升級申請狀態 */}
              <div className="space-y-2 border-t border-border-light pt-4 mt-4">
                <h3 className="text-lg font-bold">批發升級申請</h3>
                <p className="text-sm">
                  狀態：
                  <span className="ml-1 font-medium">
                    {selectedMember.profile.wholesale_upgrade_status === "PENDING"
                      ? "申請中"
                      : selectedMember.profile.wholesale_upgrade_status === "APPROVED"
                        ? "已通過"
                        : selectedMember.profile.wholesale_upgrade_status === "REJECTED"
                          ? "已拒絕"
                          : "尚未申請"}
                  </span>
                </p>
                {selectedMember.profile.wholesale_upgrade_requested_at && (
                  <p className="text-sm text-text-secondary-light">
                    申請時間：
                    {new Date(selectedMember.profile.wholesale_upgrade_requested_at).toLocaleString("zh-TW")}
                  </p>
                )}
                {selectedMember.profile.wholesale_upgrade_reviewed_at && (
                  <p className="text-sm text-text-secondary-light">
                    審核時間：
                    {new Date(selectedMember.profile.wholesale_upgrade_reviewed_at).toLocaleString("zh-TW")}
                  </p>
                )}
                {selectedMember.profile.wholesale_upgrade_status === "PENDING" && (
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => handleApproveUpgrade(selectedMember.profile.user_id)}
                      className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium"
                    >
                      批准升級為批發會員
                    </button>
                    <button
                      onClick={() => handleRejectUpgrade(selectedMember.profile.user_id)}
                      className="px-4 py-2 rounded-lg border border-border-light text-sm font-medium"
                    >
                      拒絕升級申請
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-bold">儲值記錄</h3>
                {selectedMember.topup_history && selectedMember.topup_history.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-border-light">
                          <th className="text-left py-2 px-3 text-sm font-medium text-text-secondary-light">時間</th>
                          <th className="text-left py-2 px-3 text-sm font-medium text-text-secondary-light">金額</th>
                          <th className="text-left py-2 px-3 text-sm font-medium text-text-secondary-light">參考編號</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedMember.topup_history.map((record: any) => (
                          <tr key={record.id} className="border-b border-border-light">
                            <td className="py-2 px-3 text-sm">{new Date(record.created_at).toLocaleString("zh-TW")}</td>
                            <td className="py-2 px-3 text-sm font-medium text-green-600">+NT$ {record.amount_twd}</td>
                            <td className="py-2 px-3 text-sm text-text-secondary-light">{record.external_ref}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-text-secondary-light text-sm">暫無儲值記錄</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 憑證預覽 Modal */}
      {viewProofImage && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4" onClick={() => setViewProofImage(null)}>
          <div className="relative max-w-4xl max-h-screen">
            <img src={viewProofImage.replace(/^http:/, 'https:')} alt="匯款憑證" className="max-w-full max-h-[90vh] object-contain" />
            <button
              onClick={() => setViewProofImage(null)}
              className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white rounded-full p-2"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
      )}

      {/* 儲值 Modal */}
      {showTopupModal && selectedMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">手動儲值</h2>
              <button
                onClick={() => {
                  setShowTopupModal(false);
                  setTopupAmount(0);
                  setTopupNote("");
                }}
                className="text-text-secondary-light hover:text-text-primary-light"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">會員</label>
                <p className="text-text-secondary-light">{selectedMember.profile.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">儲值金額（TWD）</label>
                <input
                  type="number"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-border-light rounded-lg"
                  placeholder="請輸入金額"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">備註（可選）</label>
                <textarea
                  value={topupNote}
                  onChange={(e) => setTopupNote(e.target.value)}
                  className="w-full px-4 py-2 border border-border-light rounded-lg"
                  placeholder="例如：匯款憑證編號、儲值原因等"
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowTopupModal(false);
                    setTopupAmount(0);
                    setTopupNote("");
                  }}
                  className="flex-1 px-4 py-2 border border-border-light rounded-lg font-medium hover:bg-gray-50"
                  disabled={topupLoading}
                >
                  取消
                </button>
                <button
                  onClick={handleTopup}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
                  disabled={topupLoading || topupAmount <= 0}
                >
                  {topupLoading ? "處理中..." : "確認儲值"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
