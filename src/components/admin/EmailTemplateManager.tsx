import { useState, useEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";
import { supabase } from "@/lib/supabase";

// Dynamic import for ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false }) as any;

interface EmailTemplate {
  id: number;
  key: string;
  subject: string;
  body: string;
  updated_at: string;
}

interface Category {
  id: number;
  name: string;
  level: number;
}

interface Relation {
  parent_category_id: number;
  child_category_id: number;
}

export default function EmailTemplateManager() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [formData, setFormData] = useState({ subject: "", body: "" });
  const [saving, setSaving] = useState(false);
  const [sendingPromo, setSendingPromo] = useState(false);
  const quillRef = useRef<any>(null);

  // Product Selection for Promo
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Categories for Filter
  const [categories, setCategories] = useState<Category[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [selectedL1, setSelectedL1] = useState<number | null>(null);
  const [selectedL2, setSelectedL2] = useState<number | null>(null);
  const [selectedL3, setSelectedL3] = useState<number | null>(null);

  useEffect(() => {
    fetchTemplates();
    fetchCategories();
    fetchRelations();
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

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  };

  const fetchRelations = async () => {
    try {
      const res = await fetch("/api/category-relations");
      if (res.ok) {
        const data = await res.json();
        setRelations(data);
      }
    } catch (err) {
      console.error("Failed to fetch relations:", err);
    }
  };

  const fetchProducts = async (categoryId?: number | null) => {
    try {
      setLoadingProducts(true);
      // Fetch products, optionally filter by category
      let url = "/api/products?limit=50&status=published";
      if (categoryId) {
        url += `&category_id=${categoryId}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const productList = data.data || [];
        setProducts(productList);
        // Only default select if no category filter (initial load)
        if (!categoryId && selectedProductIds.length === 0) {
          setSelectedProductIds(productList.slice(0, 5).map((p: any) => p.id));
        }
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleSelect = (t: EmailTemplate) => {
    setSelectedTemplate(t);
    setFormData({ subject: t.subject, body: t.body });
    if (t.key === 'new_product_promo') {
      fetchProducts(selectedL3 || selectedL2 || selectedL1 || null);
    }
  };

  // Derived categories
  const l1Categories = categories.filter(c => c.level === 1);
  const l2Categories = useMemo(() => {
    if (!selectedL1) return [];
    const childIds = relations.filter(r => r.parent_category_id === selectedL1).map(r => r.child_category_id);
    return categories.filter(c => c.level === 2 && childIds.includes(c.id));
  }, [selectedL1, categories, relations]);
  
  const l3Categories = useMemo(() => {
    if (!selectedL2) return [];
    const childIds = relations.filter(r => r.parent_category_id === selectedL2).map(r => r.child_category_id);
    return categories.filter(c => c.level === 3 && childIds.includes(c.id));
  }, [selectedL2, categories, relations]);

  const handleL1Change = (id: number) => {
    setSelectedL1(id);
    setSelectedL2(null);
    setSelectedL3(null);
    fetchProducts(id);
  };

  const handleL2Change = (id: number) => {
    setSelectedL2(id);
    setSelectedL3(null);
    fetchProducts(id);
  };

  const handleL3Change = (id: number) => {
    setSelectedL3(id);
    fetchProducts(id);
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

  const handleSendPromo = async () => {
    if (selectedProductIds.length === 0) {
      alert("請至少選擇一個商品");
      return;
    }
    if (!confirm(`確定要發送此促銷郵件給所有會員嗎？(包含 ${selectedProductIds.length} 個選定商品)`)) return;

    try {
      setSendingPromo(true);
      const res = await fetch("/api/admin/email/send-promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          templateKey: 'new_product_promo',
          productIds: selectedProductIds
        }),
      });

      const result = await res.json();
      if (res.ok) {
        alert(`發送成功！\n成功: ${result.successCount}\n失敗: ${result.failCount}`);
      } else {
        alert(`發送失敗: ${result.error}`);
      }
    } catch (err) {
      console.error("Failed to send promo:", err);
      alert("發送發生錯誤");
    } finally {
      setSendingPromo(false);
    }
  };

  const imageHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files ? input.files[0] : null;
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: formData
        });

        const rawText = await res.text();
        const data = (() => {
          try {
            return rawText ? JSON.parse(rawText) : {};
          } catch {
            return null;
          }
        })();

        if (!res.ok) {
          alert((data as any)?.error || rawText || '圖片上傳失敗');
          return;
        }

        if (data && (data as any).url) {
          const quill = quillRef.current?.getEditor();
          const range = quill?.getSelection(true);
          if (quill && range) {
            quill.insertEmbed(range.index, 'image', (data as any).url);
          }
        } else {
          alert((data as any)?.error || '圖片上傳失敗');
        }
      } catch (err) {
        console.error("Upload failed", err);
        alert('圖片上傳發生錯誤');
      }
    };
  };

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, false] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
        ['link', 'image'],
        ['clean']
      ],
      handlers: {
        image: imageHandler
      }
    }
  }), []);

  const templateNames: Record<string, string> = {
    order_created: "訂單確認通知 (下單後)",
    order_arrived: "商品抵達台灣通知",
    upgrade_success: "會員升級成功通知",
    upgrade_failed: "會員升級失敗通知",
    topup_success: "儲值成功通知",
    topup_failed: "儲值失敗通知",
    new_product_promo: "新品上架促銷通知",
    admin_topup_notification: "管理員通知 - 會員儲值申請",
  };

  return (
    <div className="py-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Template List */}
        <div className="md:col-span-1 space-y-4">
          {/* Promo Templates */}
          <div className="rounded-xl border border-border-light bg-card-light overflow-hidden">
            <div className="p-4 border-b border-border-light bg-blue-50">
              <h3 className="font-bold text-primary">行銷推廣</h3>
            </div>
            <div className="divide-y divide-border-light">
              {templates.filter(t => t.key === 'new_product_promo').map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSelect(t)}
                  className={`w-full text-left p-4 hover:bg-background-light transition-colors ${selectedTemplate?.id === t.id ? "bg-primary/5 border-l-4 border-primary" : ""
                    }`}
                >
                  <p className="font-medium text-text-primary-light">
                    {templateNames[t.key] || t.key}
                  </p>
                  <p className="text-xs text-text-secondary-light truncate mt-1">
                    {t.subject}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* System Templates */}
          <div className="rounded-xl border border-border-light bg-card-light overflow-hidden">
            <div className="p-4 border-b border-border-light bg-background-light">
              <h3 className="font-bold text-text-primary-light">系統通知</h3>
            </div>
            <div className="divide-y divide-border-light">
              {loading ? (
                <p className="p-4 text-text-secondary-light">載入中...</p>
              ) : templates.length === 0 ? (
                <p className="p-4 text-text-secondary-light">無模板資料</p>
              ) : (
                templates.filter(t => t.key !== 'new_product_promo').map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleSelect(t)}
                    className={`w-full text-left p-4 hover:bg-background-light transition-colors ${selectedTemplate?.id === t.id ? "bg-primary/5 border-l-4 border-primary" : ""
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
        </div>

        {/* Editor */}
        <div className="md:col-span-2 rounded-xl border border-border-light bg-card-light p-6">
          {selectedTemplate ? (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <label className="block text-sm font-medium text-text-primary-light mb-1">模板類型</label>
                  <div className="text-sm text-text-secondary-light">
                    {templateNames[selectedTemplate.key] || selectedTemplate.key} ({selectedTemplate.key})
                  </div>
                </div>
                {selectedTemplate.key === 'new_product_promo' && (
                  <button
                    onClick={handleSendPromo}
                    disabled={sendingPromo || saving}
                    className="px-4 py-2 bg-success text-white text-sm font-bold rounded-lg hover:bg-success/90 disabled:opacity-50 flex items-center gap-2"
                  >
                    {sendingPromo ? "發送中..." : (
                      <>
                        <span className="material-symbols-outlined text-sm">send</span>
                        發送給所有會員
                      </>
                    )}
                  </button>
                )}
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

              {selectedTemplate.key === 'new_product_promo' && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    選擇要推廣的商品 (將顯示於 {"{product_list}"})
                  </label>

                  {/* Category Filter */}
                  <div className="flex gap-2 mb-3">
                    <select
                      value={selectedL1 || ""}
                      onChange={(e) => handleL1Change(Number(e.target.value))}
                      className="px-2 py-1 text-sm border rounded"
                    >
                      <option value="">全部一級分類</option>
                      {l1Categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    
                    <select
                      value={selectedL2 || ""}
                      onChange={(e) => handleL2Change(Number(e.target.value))}
                      className="px-2 py-1 text-sm border rounded"
                      disabled={!selectedL1}
                    >
                      <option value="">全部二級分類</option>
                      {l2Categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>

                    <select
                      value={selectedL3 || ""}
                      onChange={(e) => handleL3Change(Number(e.target.value))}
                      className="px-2 py-1 text-sm border rounded"
                      disabled={!selectedL2}
                    >
                      <option value="">全部三級分類</option>
                      {l3Categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  {loadingProducts ? (
                    <p className="text-sm text-gray-500">載入商品中...</p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto grid grid-cols-1 gap-2 border border-gray-300 rounded p-2 bg-white">
                      {products.length === 0 && <p className="text-sm text-gray-400 p-2">無符合商品</p>}
                      {products.map(p => (
                        <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={selectedProductIds.includes(p.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedProductIds([...selectedProductIds, p.id]);
                              } else {
                                setSelectedProductIds(selectedProductIds.filter(id => id !== p.id));
                              }
                            }}
                            className="rounded border-gray-300"
                          />
                          <span className="flex-1 truncate">{p.title_zh || p.title_original}</span>
                          <span className="text-gray-500 text-xs">NT$ {p.retail_price_twd}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-2">已選擇 {selectedProductIds.length} 個商品</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-text-primary-light mb-1">
                  郵件內容 (HTML)
                </label>
                <div className="text-xs text-text-secondary-light mb-2">
                  可用變數: {'{name}'}, {'{order_id}'}, {'{amount}'}, {'{level}'}, {'{reason}'}, {'{product_list}'} 等
                </div>
                <div className="bg-white">
                  <ReactQuill
                    ref={quillRef}
                    theme="snow"
                    value={formData.body}
                    onChange={(value: string) => setFormData({ ...formData, body: value })}
                    modules={modules}
                    className="h-96 mb-12"
                  />
                </div>
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
