"use client";

import { useState, useEffect } from "react";

interface Spec {
  name: string;
  values: string[];
}

interface SpecTemplate {
  id: string;
  name: string;
  specs: Spec[];
  created_at: string;
}

export default function SpecTemplateManager() {
  const [templates, setTemplates] = useState<SpecTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SpecTemplate | null>(null);
  const [formName, setFormName] = useState("");
  const [formSpecs, setFormSpecs] = useState<Spec[]>([]);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/admin/spec-templates");
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

  const openAddModal = () => {
    setEditingTemplate(null);
    setFormName("");
    setFormSpecs([{ name: "尺寸", values: [] }]);
    setShowModal(true);
  };

  const openEditModal = (template: SpecTemplate) => {
    setEditingTemplate(template);
    setFormName(template.name);
    setFormSpecs(template.specs || []);
    setShowModal(true);
  };

  const addSpec = () => {
    setFormSpecs([...formSpecs, { name: "", values: [] }]);
  };

  const removeSpec = (idx: number) => {
    setFormSpecs(formSpecs.filter((_, i) => i !== idx));
  };

  const updateSpecName = (idx: number, name: string) => {
    const newSpecs = [...formSpecs];
    newSpecs[idx].name = name;
    setFormSpecs(newSpecs);
  };

  const addSpecValue = (idx: number, value: string) => {
    if (!value.trim()) return;
    const newSpecs = [...formSpecs];
    if (!newSpecs[idx].values.includes(value.trim())) {
      newSpecs[idx].values.push(value.trim());
      setFormSpecs(newSpecs);
    }
  };

  const removeSpecValue = (specIdx: number, valIdx: number) => {
    const newSpecs = [...formSpecs];
    newSpecs[specIdx].values.splice(valIdx, 1);
    setFormSpecs(newSpecs);
  };

  const handleSave = async () => {
    if (!formName.trim()) return alert("請輸入範本名稱");
    if (formSpecs.length === 0 || formSpecs.every(s => s.values.length === 0)) {
      return alert("請至少添加一個規格值");
    }

    try {
      const payload = { name: formName, specs: formSpecs };
      let res;
      if (editingTemplate) {
        res = await fetch("/api/admin/spec-templates", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, id: editingTemplate.id }),
        });
      } else {
        res = await fetch("/api/admin/spec-templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        fetchTemplates();
        setShowModal(false);
      } else {
        const err = await res.json();
        alert(err.error || "保存失敗");
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("保存失敗");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("確定刪除此範本？")) return;
    try {
      const res = await fetch(`/api/admin/spec-templates?id=${id}`, { method: "DELETE" });
      if (res.ok) fetchTemplates();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const getSpecPreview = (specs: Spec[]) => {
    return specs.map(s => `${s.name}: ${s.values.join("/")}`).join(" | ");
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-500">載入中...</div>;
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">規格範本管理</h2>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          新增範本
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        預設規格範本可在商品管理中快速套用，例如：童裝尺寸、鞋子尺碼等
      </p>

      {/* Template List */}
      <div className="space-y-3">
        {templates.length === 0 ? (
          <div className="text-center py-8 text-gray-400">尚無規格範本</div>
        ) : (
          templates.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800">{t.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{getSpecPreview(t.specs)}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEditModal(t)} className="p-2 text-primary hover:bg-primary/10 rounded">
                  <span className="material-symbols-outlined">edit</span>
                </button>
                <button onClick={() => handleDelete(t.id)} className="p-2 text-red-500 hover:bg-red-50 rounded">
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-bold">{editingTemplate ? "編輯範本" : "新增範本"}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">範本名稱</label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="例如：童裝尺寸、成人服裝尺寸"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">規格設定</label>
                  <button onClick={addSpec} className="text-xs text-primary hover:underline">+ 新增規格</button>
                </div>
                <div className="space-y-3">
                  {formSpecs.map((spec, idx) => (
                    <div key={idx} className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          placeholder="規格名稱 (例: 尺寸)"
                          value={spec.name}
                          onChange={(e) => updateSpecName(idx, e.target.value)}
                          className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
                        />
                        <button onClick={() => removeSpec(idx)} className="text-gray-400 hover:text-red-500">
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {spec.values.map((val, vIdx) => (
                          <div key={vIdx} className="flex items-center gap-1 bg-white border border-gray-200 rounded px-2 py-1">
                            <span className="text-sm">{val}</span>
                            <button onClick={() => removeSpecValue(idx, vIdx)} className="text-gray-400 hover:text-red-500">
                              <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                          </div>
                        ))}
                        <input
                          placeholder="+ 值 (Enter)"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addSpecValue(idx, e.currentTarget.value);
                              e.currentTarget.value = "";
                            }
                          }}
                          className="w-24 rounded border border-gray-300 px-2 py-1 text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">取消</button>
              <button onClick={handleSave} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

