import { useState, useEffect } from "react";

export default function UpgradeSettings() {
  const [upgradeSettings, setUpgradeSettings] = useState<{
    rules_text: string;
    bank_account_info: string;
    agent_fee_twd: number | null;
  } | null>(null);
  const [upgradeSettingsLoading, setUpgradeSettingsLoading] = useState(false);

  useEffect(() => {
    fetchUpgradeSettings();
  }, []);

  const fetchUpgradeSettings = async () => {
    try {
      setUpgradeSettingsLoading(true);
      const res = await fetch("/api/admin/upgrade-settings");
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        console.error("載入升級申請設定失敗", { status: res.status, statusText: res.statusText, error: j });
        return;
      }
      const json = await res.json().catch(() => ({}));
      const data = json?.data;
      if (data) {
        setUpgradeSettings({
          rules_text: data.rules_text || "",
          bank_account_info: data.bank_account_info || "",
          agent_fee_twd:
            typeof data.agent_fee_twd === "number" ? data.agent_fee_twd : null,
        });
      } else {
        // Admin 預設文案，需與前台 /member 預設顯示一致
        setUpgradeSettings({
          rules_text: "請先完成會員資料與手機驗證，並確認已了解批發會員使用規則後再提出申請。",
          bank_account_info: "銀行：範例銀行 123 分行\n戶名：範例國際有限公司\n帳號：01234567890123",
          agent_fee_twd: 6000,
        });
      }
    } catch (err) {
      console.error("Failed to fetch upgrade settings:", err);
    } finally {
      setUpgradeSettingsLoading(false);
    }
  };

  const saveUpgradeSettings = async () => {
    if (!upgradeSettings) return;
    try {
      setUpgradeSettingsLoading(true);
      const res = await fetch("/api/admin/upgrade-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rules_text: upgradeSettings.rules_text,
          bank_account_info: upgradeSettings.bank_account_info,
          agent_fee_twd: upgradeSettings.agent_fee_twd,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(json?.error || "保存設定失敗");
        return;
      }
      const data = json?.data;
      if (data) {
        setUpgradeSettings({
          rules_text: data.rules_text || "",
          bank_account_info: data.bank_account_info || "",
          agent_fee_twd:
            typeof data.agent_fee_twd === "number" ? data.agent_fee_twd : null,
        });
      }
      alert("設定已保存");
    } catch (err) {
      console.error("Failed to save upgrade settings:", err);
      alert("保存設定失敗");
    } finally {
      setUpgradeSettingsLoading(false);
    }
  };

  return (
    <div className="py-6 space-y-6">
      <div className="max-w-3xl space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-primary-light mb-1">
            申請資格與說明文字
          </label>
          <textarea
            value={upgradeSettings?.rules_text ?? ""}
            onChange={(e) =>
              setUpgradeSettings((prev) => ({
                rules_text: e.target.value,
                bank_account_info: prev?.bank_account_info ?? "",
                agent_fee_twd: prev?.agent_fee_twd ?? null,
              }))
            }
            rows={6}
            className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm"
            placeholder="說明零售會員升級為批發會員的條件與流程（將顯示在會員中心升級區塊）"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary-light mb-1">
            銀行帳號資訊（顯示於會員中心）
          </label>
          <textarea
            value={upgradeSettings?.bank_account_info ?? ""}
            onChange={(e) =>
              setUpgradeSettings((prev) => ({
                rules_text: prev?.rules_text ?? "",
                bank_account_info: e.target.value,
                agent_fee_twd: prev?.agent_fee_twd ?? null,
              }))
            }
            rows={4}
            className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm whitespace-pre-line"
            placeholder={"銀行：範例銀行 123 分行\n戶名：範例國際有限公司\n帳號：01234567890123"}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary-light mb-1">
            代理費金額（每年，單位：NT$）
          </label>
          <input
            type="number"
            min={0}
            value={upgradeSettings?.agent_fee_twd ?? ""}
            onChange={(e) =>
              setUpgradeSettings((prev) => ({
                rules_text: prev?.rules_text ?? "",
                bank_account_info: prev?.bank_account_info ?? "",
                agent_fee_twd: e.target.value === "" ? null : Math.max(0, Math.floor(Number(e.target.value) || 0)),
              }))
            }
            className="w-40 rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm"
            placeholder="6000"
          />
          <p className="mt-1 text-xs text-text-secondary-light">
            若留空則會員中心將預設顯示 6000 元/年。
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={saveUpgradeSettings}
            disabled={upgradeSettingsLoading}
            className="px-6 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-50"
          >
            {upgradeSettingsLoading ? "保存中..." : "保存設定"}
          </button>
        </div>
      </div>
    </div>
  );
}
