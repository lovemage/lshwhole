import { useState, useEffect } from "react";

interface Tag {
  id: number;
  slug: string;
  name: string;
  sort: number;
  description: string;
  category: string;
  active: boolean;
  created_at: string;
}

const CATEGORIES = [
  { id: "A1", name: "品牌分類 (Brand)" },
  { id: "A2", name: "商品屬性 (Attribute)" },
  { id: "A3", name: "活動分類 (Activity)" },
  { id: "B1", name: "部落格標籤 (Blog)" },
];

export default function TagManager() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("A1");
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingTagId, setEditingTagId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    slug: "",
    name: "",
    sort: 0,
    description: "",
    category: "A1",
  });
  const [formLoading, setFormLoading] = useState(false);
  const [batchInput, setBatchInput] = useState("");
  const [batchMode, setBatchMode] = useState(false);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/tags");
      if (res.ok) {
        const data = await res.json();
        setTags(data);
      }
    } catch (err) {
      console.error("Failed to fetch tags:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTags = tags.filter((t) => t.category === selectedCategory || (!t.category && selectedCategory === "A2"));

  const handleSave = async () => {
    // Validation
    if (batchMode && !editingTagId) {
      if (!batchInput.trim()) {
        alert("請輸入標籤名稱");
        return;
      }
    } else {
      if (!formData.slug || !formData.name) {
        alert("請填寫 Slug 和名稱");
        return;
      }
    }

    try {
      setFormLoading(true);
      
      if (batchMode && !editingTagId) {
        // Batch creation
        const lines = batchInput.split("\n").filter(l => l.trim());
        let successCount = 0;
        
        for (const line of lines) {
          // Format: Name (Slug is auto-generated) OR Name|Slug
          let name = line.trim();
          let slug = "";
          
          if (line.includes("|")) {
            [name, slug] = line.split("|").map(s => s.trim());
          }
          
          if (!slug) {
            // Auto generate slug
            const prefix = formData.category === "A1" ? "BRAND_" : formData.category === "A3" ? "PROMO_" : "ATTR_";
            // Simple slugify: UPPERCASE, replace spaces/special chars with _
            const slugBase = name.toUpperCase().replace(/[^A-Z0-9]/g, "_");
            slug = `${prefix}${slugBase}`;
          }
          
          const payload = {
            ...formData,
            name,
            slug,
            sort: 0, // Default sort
          };
          
          const res = await fetch("/api/tags", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          
          if (res.ok) successCount++;
        }
        
        alert(`批量建立完成，成功 ${successCount} 筆`);
        setShowForm(false);
        setBatchInput("");
        setBatchMode(false);
        fetchTags();
        
      } else {
        // Single creation/edit
        const method = editingTagId ? "PUT" : "POST";
        const url = editingTagId ? `/api/tags/${editingTagId}` : "/api/tags";
        
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (res.ok) {
          alert(editingTagId ? "標籤已更新" : "標籤已建立");
          setShowForm(false);
          setEditingTagId(null);
          setFormData({ slug: "", name: "", sort: 0, description: "", category: selectedCategory });
          fetchTags();
        } else {
          const j = await res.json().catch(() => ({}));
          alert(j?.error || "保存失敗");
        }
      }
    } catch (err) {
      console.error("Failed to save tag:", err);
      alert("保存失敗");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("確定要刪除此標籤嗎？")) return;
    try {
      const res = await fetch(`/api/tags/${id}`, { method: "DELETE" });
      if (res.ok) {
        alert("標籤已刪除");
        fetchTags();
      }
    } catch (err) {
      console.error("Failed to delete tag:", err);
      alert("刪除失敗");
    }
  };

  const openAdd = () => {
    setEditingTagId(null);
    setFormData({ slug: "", name: "", sort: 0, description: "", category: selectedCategory });
    setBatchMode(false);
    setBatchInput("");
    setShowForm(true);
  };

  const openEdit = (tag: Tag) => {
    setEditingTagId(tag.id);
    setFormData({
      slug: tag.slug,
      name: tag.name,
      sort: tag.sort,
      description: tag.description || "",
      category: tag.category || "A2",
    });
    setShowForm(true);
  };

  // Helper function to generate example tags
  const generateExampleTags = async () => {
    if (!confirm("確定要生成範例標籤嗎？這可能會產生重複數據。")) return;
    
    // This is just a client-side trigger to the migration route we created temporarily,
    // OR we can just loop and create them via API if the migration route is not available.
    // Since I created the migration route, let's try to hit it.
    try {
      const res = await fetch("/api/admin/run-migration");
      if (res.ok) {
        alert("範例標籤生成成功！");
        fetchTags();
      } else {
        // Fallback: manually create via API
        alert("無法自動生成，請手動新增。");
      }
    } catch (e) {
      alert("生成失敗");
    }
  };

  // Group brands by first letter if in A1 category
  const renderBrandGroups = () => {
    const sorted = [...filteredTags].sort((a, b) => a.slug.localeCompare(b.slug));
    const groups: { [key: string]: Tag[] } = {};
    
    sorted.forEach(tag => {
      // Extract brand name from slug (e.g., BRAND_NIKE -> NIKE) or just use slug
      let key = tag.slug.replace("BRAND_", "").charAt(0).toUpperCase();
      if (!/[A-Z]/.test(key)) key = "#";
      if (!groups[key]) groups[key] = [];
      groups[key].push(tag);
    });

    const keys = Object.keys(groups).sort();

    return (
      <div className="space-y-6">
        {keys.map(key => (
          <div key={key}>
            <h3 className="text-lg font-bold text-text-primary-light border-b border-border-light pb-2 mb-3">{key}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {groups[key].map(tag => (
                <TagCard key={tag.id} tag={tag} onEdit={() => openEdit(tag)} onDelete={() => handleDelete(tag.id)} />
              ))}
            </div>
          </div>
        ))}
        {keys.length === 0 && <p className="text-text-secondary-light">暫無標籤</p>}
      </div>
    );
  };

  return (
    <div className="py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-text-primary-light">標籤管理</h2>
        <div className="flex gap-2">
           <button
            onClick={generateExampleTags}
            className="px-3 py-2 rounded-lg border border-border-light bg-background-light text-text-secondary-light hover:text-primary hover:border-primary transition-colors text-sm"
          >
            生成範例標籤
          </button>
          <button
            onClick={openAdd}
            className="px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90"
          >
            新增標籤
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex border-b border-border-light overflow-x-auto">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-6 py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${
              selectedCategory === cat.id
                ? "border-primary text-primary"
                : "border-transparent text-text-secondary-light hover:text-text-primary-light"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Tag List */}
      {loading ? (
        <p className="text-text-secondary-light">載入中...</p>
      ) : (
        <>
          {selectedCategory === "A1" ? (
            renderBrandGroups()
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredTags.map((tag) => (
                <TagCard key={tag.id} tag={tag} onEdit={() => openEdit(tag)} onDelete={() => handleDelete(tag.id)} />
              ))}
              {filteredTags.length === 0 && <p className="text-text-secondary-light col-span-full">暫無標籤</p>}
            </div>
          )}
        </>
      )}

      {/* Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card-light rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-text-primary-light mb-4">
              {editingTagId ? "編輯標籤" : "新增標籤"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary-light mb-1">
                  分類
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm"
                >
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              
              {!editingTagId && (
                <div className="flex items-center gap-2 mb-2">
                   <input
                    type="checkbox"
                    id="batchMode"
                    checked={batchMode}
                    onChange={(e) => setBatchMode(e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="batchMode" className="text-sm font-medium text-text-primary-light cursor-pointer">
                    批量輸入模式
                  </label>
                </div>
              )}

              {batchMode ? (
                <div>
                   <label className="block text-sm font-medium text-text-primary-light mb-1">
                    批量輸入名稱 (一行一個)
                  </label>
                  <p className="text-xs text-text-secondary-light mb-2">
                    格式: 名稱 (Slug自動生成) 或 名稱|Slug
                  </p>
                  <textarea
                    value={batchInput}
                    onChange={(e) => setBatchInput(e.target.value)}
                    className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm min-h-[200px]"
                    placeholder="Nike
Adidas|BRAND_ADIDAS
Puma"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-text-primary-light mb-1">
                      Slug (英文代碼)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.slug}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            slug: e.target.value.toUpperCase(),
                          })
                        }
                        className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm"
                        placeholder={formData.category === "A1" ? "BRAND_NIKE" : "ATTR_MEN"}
                      />
                      {!editingTagId && (
                        <button
                          onClick={() => {
                             const prefix = formData.category === "A1" ? "BRAND_" : formData.category === "A3" ? "PROMO_" : "ATTR_";
                             const slugBase = formData.name.toUpperCase().replace(/[^A-Z0-9]/g, "_");
                             setFormData({...formData, slug: `${prefix}${slugBase}`});
                          }}
                          className="px-3 py-1 bg-gray-100 text-xs rounded hover:bg-gray-200 whitespace-nowrap"
                        >
                          自動生成
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary-light mt-1">
                      {formData.category === "A1" ? "品牌建議使用 BRAND_ 開頭" : formData.category === "A3" ? "活動建議使用 PROMO_ 開頭" : ""}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary-light mb-1">
                      名稱
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          name: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm"
                      placeholder="例：Nike"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary-light mb-1">
                      排序
                    </label>
                    <input
                      type="number"
                      value={formData.sort}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sort: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary-light mb-1">
                      描述
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm"
                      rows={3}
                    />
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-border-light text-text-primary-light hover:bg-background-light"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={formLoading}
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {formLoading ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TagCard({ tag, onEdit, onDelete }: { tag: Tag; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="p-4 rounded-xl border border-border-light bg-card-light hover:shadow-sm transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="font-bold text-text-primary-light">{tag.name}</h4>
          <p className="text-xs text-text-secondary-light font-mono">{tag.slug}</p>
        </div>
        <div className="flex gap-1">
          <button onClick={onEdit} className="p-1 text-primary hover:bg-primary/10 rounded">
            <span className="material-symbols-outlined text-base">edit</span>
          </button>
          <button onClick={onDelete} className="p-1 text-danger hover:bg-danger/10 rounded">
            <span className="material-symbols-outlined text-base">delete</span>
          </button>
        </div>
      </div>
      {tag.description && (
        <p className="text-sm text-text-secondary-light line-clamp-2">{tag.description}</p>
      )}
    </div>
  );
}
