import { useState, useEffect } from "react";

export default function ShippingSettings() {
  const [shippingSettings, setShippingSettings] = useState({
    rate_intl_kg: 0,
    rate_intl_kr: 0,
    rate_intl_jp: 0,
    rate_intl_th: 0,
    rate_dom_post: 0,
    rate_dom_blackcat: 0,
    rate_dom_cvs: 0,
    rate_dom_hsinchu: 0,
  });
  const [shippingSettingsLoading, setShippingSettingsLoading] = useState(false);

  useEffect(() => {
    fetchShippingSettings();
  }, []);

  const fetchShippingSettings = async () => {
    try {
      setShippingSettingsLoading(true);
      const res = await fetch("/api/admin/shipping-settings");
      if (res.ok) {
        const data = await res.json();
        setShippingSettings({
          rate_intl_kg: data.rate_intl_kg || 0,
          rate_intl_kr: data.rate_intl_kr || 0,
          rate_intl_jp: data.rate_intl_jp || 0,
          rate_intl_th: data.rate_intl_th || 0,
          rate_dom_post: data.rate_dom_post || 0,
          rate_dom_blackcat: data.rate_dom_blackcat || 0,
          rate_dom_cvs: data.rate_dom_cvs || 0,
          rate_dom_hsinchu: data.rate_dom_hsinchu || 0,
        });
      }
    } catch (err) {
      console.error("Fetch shipping settings failed:", err);
    } finally {
      setShippingSettingsLoading(false);
    }
  };

  const saveShippingSettings = async () => {
    try {
      setShippingSettingsLoading(true);
      const res = await fetch("/api/admin/shipping-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shippingSettings),
      });
      if (res.ok) {
        alert("運費設定已儲存");
      } else {
        alert("儲存失敗");
      }
    } catch (err) {
      console.error("Save shipping settings failed:", err);
      alert("儲存失敗");
    } finally {
      setShippingSettingsLoading(false);
    }
  };

  return (
    <div className="py-6 max-w-2xl space-y-6">
      <div className="bg-card-light rounded-xl border border-border-light p-6">
        <h3 className="text-lg font-bold text-text-primary-light mb-4">國際運費費率 (每公斤/TWD)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary-light mb-1">韓國 (KR)</label>
            <input
              type="number"
              value={shippingSettings.rate_intl_kr}
              onChange={(e) => setShippingSettings({ ...shippingSettings, rate_intl_kr: Number(e.target.value) })}
              className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary-light mb-1">日本 (JP)</label>
            <input
              type="number"
              value={shippingSettings.rate_intl_jp}
              onChange={(e) => setShippingSettings({ ...shippingSettings, rate_intl_jp: Number(e.target.value) })}
              className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary-light mb-1">泰國 (TH)</label>
            <input
              type="number"
              value={shippingSettings.rate_intl_th}
              onChange={(e) => setShippingSettings({ ...shippingSettings, rate_intl_th: Number(e.target.value) })}
              className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary-light mb-1">其他預設 (Default)</label>
            <input
              type="number"
              value={shippingSettings.rate_intl_kg}
              onChange={(e) => setShippingSettings({ ...shippingSettings, rate_intl_kg: Number(e.target.value) })}
              className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="bg-card-light rounded-xl border border-border-light p-6">
        <h3 className="text-lg font-bold text-text-primary-light mb-4">國內運費費率</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary-light mb-1">宅配 (郵政)</label>
            <input
              type="number"
              value={shippingSettings.rate_dom_post}
              onChange={(e) => setShippingSettings({ ...shippingSettings, rate_dom_post: Number(e.target.value) })}
              className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary-light mb-1">宅配 (黑貓)</label>
            <input
              type="number"
              value={shippingSettings.rate_dom_blackcat}
              onChange={(e) => setShippingSettings({ ...shippingSettings, rate_dom_blackcat: Number(e.target.value) })}
              className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary-light mb-1">新竹貨運</label>
            <input
              type="number"
              value={shippingSettings.rate_dom_hsinchu}
              onChange={(e) => setShippingSettings({ ...shippingSettings, rate_dom_hsinchu: Number(e.target.value) })}
              className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary-light mb-1">便利店</label>
            <input
              type="number"
              value={shippingSettings.rate_dom_cvs}
              onChange={(e) => setShippingSettings({ ...shippingSettings, rate_dom_cvs: Number(e.target.value) })}
              className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="mt-2 text-sm text-text-secondary-light">
          * 「批發客賣貨便開單」的國內運費預設為 0 (由會員處理)
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={saveShippingSettings}
          disabled={shippingSettingsLoading}
          className="px-6 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 disabled:opacity-50"
        >
          {shippingSettingsLoading ? "儲存中..." : "儲存設定"}
        </button>
      </div>
    </div>
  );
}
