import { useState, useEffect } from "react";

interface EmailTemplate {
  id: number;
  key: string;
  subject: string;
  body: string;
  updated_at: string;
}

export default function EmailTemplateManager() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [formData, setFormData] = useState({ subject: "", body: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/email-templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (err) {
      console.error("Failed to fetch templates:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (t: EmailTemplate) => {
    setSelectedTemplate(t);
    setFormData({ subject: t.subject, body: t.body });
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/admin/email-templates/${selectedTemplate.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        alert("模板已更新");
        fetchTemplates();
      } else {
        alert("更新失敗");
      }
    } catch (err) {
      console.error("Failed to save template:", err);
      alert("更新失敗");
    } finally {
      setSaving(false);
    }
  };

  const templateNames: Record<string, string> = {
    order_created: "訂單確認通知 (下單後)",
    order_arrived: "商品抵達台灣通知",
    upgrade_success: "會員升級成功通知",
    upgrade_failed: "會員升級失敗通知",
    topup_success: "儲值成功通知",
    topup_failed: "儲值失敗通知",
  };

  return (
    <div className="py-6 space-y-6">
      <h2 className="text-2xl font-bold text-text-primary-light">Email 通知模板管理</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Template List */}
        <div className="md:col-span-1 rounded-xl border border-border-light bg-card-light overflow-hidden">
          <div className="p-4 border-b border-border-light bg-background-light">
            <h3 className="font-bold text-text-primary-light">模板列表</h3>
          </div>
          <div className="divide-y divide-border-light">
            {loading ? (
              <p className="p-4 text-text-secondary-light">載入中...</p>
            ) : templates.length === 0 ? (
              <p className="p-4 text-text-secondary-light">無模板資料</p>
            ) : (
              templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSelect(t)}
                  className={`w-full text-left p-4 hover:bg-background-light transition-colors ${
                    selectedTemplate?.id === t.id ? "bg-primary/5 border-l-4 border-primary" : ""
                  }`}
                >
                  <p className="font-medium text-text-primary-light">
                    {templateNames[t.key] || t.key}
                  </p>
                  <p className="text-xs text-text-secondary-light truncate mt-1">
                    {t.subject}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Editor */}
        <div className="md:col-span-2 rounded-xl border border-border-light bg-card-light p-6">
          {selectedTemplate ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary-light mb-1">模板類型</label>
                <div className="text-sm text-text-secondary-light">
                  {templateNames[selectedTemplate.key] || selectedTemplate.key} ({selectedTemplate.key})
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-primary-light mb-1">郵件主旨</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary-light mb-1">
                  郵件內容 (HTML)
                </label>
                <div className="text-xs text-text-secondary-light mb-2">
                  可用變數: {'{name}'}, {'{order_id}'}, {'{amount}'}, {'{level}'}, {'{reason}'} 等
                </div>
                <textarea
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  rows={15}
                  className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm font-mono"
                />
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2 rounded-lg bg-primary text-white font-bold hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? "儲存中..." : "儲存模板"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-text-secondary-light">
              請從左側選擇要編輯的模板
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
