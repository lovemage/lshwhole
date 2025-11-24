import { useState, useEffect } from "react";
import IconPicker from "@/components/IconPicker";

interface Category {
  id: number;
  slug: string;
  name: string;
  level: number;
  sort: number;
  description: string;
  icon?: string;
  retail_visible?: boolean;
  active: boolean;
  created_at: string;
}

interface Tag {
  id: number;
  slug: string;
  name: string;
  sort: number;
  description: string;
  active: boolean;
  created_at: string;
}

export default function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedL1, setSelectedL1] = useState<number | null>(null);
  const [selectedL2, setSelectedL2] = useState<number | null>(null);
  const [categoryRelations, setCategoryRelations] = useState<any[]>([]);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [categoryFormData, setCategoryFormData] = useState({ slug: "", name: "", sort: 0, description: "", icon: "", level: 1, retail_visible: true });
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  // 標籤管理狀態
  const [showTagForm, setShowTagForm] = useState(false);
  const [editingTagId, setEditingTagId] = useState<number | null>(null);
  const [tagFormData, setTagFormData] = useState({ slug: "", name: "", sort: 0, description: "" });
  const [tagLoading, setTagLoading] = useState(false);
  // 分類說明 Modal
  const [showCategoryHelp, setShowCategoryHelp] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchTags();
    fetchCategoryRelations();
  }, []);

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

  const fetchCategoryRelations = async () => {
    try {
      const res = await fetch("/api/category-relations");
      if (res.ok) {
        const data = await res.json();
        setCategoryRelations(data);
      }
    } catch (err) {
      console.error("Failed to fetch category relations:", err);
    }
  };

  const fetchTags = async () => {
    try {
      const res = await fetch("/api/tags");
      if (res.ok) {
        const data = await res.json();
        setTags(data);
      }
    } catch (err) {
      console.error("Failed to fetch tags:", err);
    }
  };

  const isRelated = (parentId: number | null, childId: number) => {
    if (!parentId) return false;
    return categoryRelations.some(
      (r: any) => r.parent_category_id === parentId && r.child_category_id === childId
    );
  };

  const toggleRelation = async (parentId: number | null, childId: number, checked: boolean) => {
    if (!parentId) return;
    try {
      const res = await fetch("/api/category-relations", {
        method: checked ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parent_id: parentId, child_id: childId }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j?.error || "操作失敗");
        return;
      }
      await fetchCategoryRelations();
    } catch (err) {
      console.error("toggleRelation error:", err);
      alert("操作失敗");
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryFormData.slug || !categoryFormData.name) {
      alert("請填寫 Slug 和名稱");
      return;
    }

    try {
      setCategoryLoading(true);
      const method = editingCategoryId ? "PUT" : "POST";
      const url = "/api/categories";

      const requestBody = editingCategoryId
        ? {
          id: editingCategoryId,
          ...categoryFormData,
          level: categoryFormData.level,
          icon: categoryFormData.icon || null,
        }
        : {
          ...categoryFormData,
          level: categoryFormData.level,
          icon: categoryFormData.icon || null,
        };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        alert(editingCategoryId ? "分類已更新" : "分類已建立");
        setCategoryFormData({ slug: "", name: "", sort: 0, description: "", icon: "", level: 1, retail_visible: true });
        setEditingCategoryId(null);
        setShowCategoryForm(false);
        fetchCategories();
      }
    } catch (err) {
      console.error("Failed to save category:", err);
      alert("保存失敗");
    } finally {
      setCategoryLoading(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm("確定要刪除此分類嗎？")) return;

    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        alert("分類已刪除");
        fetchCategories();
      }
    } catch (err) {
      console.error("Failed to delete category:", err);
      alert("刪除失敗");
    }
  };

  const handleSaveTag = async () => {
    if (!tagFormData.slug || !tagFormData.name) {
      alert("請填寫 Slug 和名稱");
      return;
    }
    try {
      setTagLoading(true);
      const method = editingTagId ? "PUT" : "POST";
      const url = editingTagId ? `/api/tags/${editingTagId}` : "/api/tags";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tagFormData),
      });
      if (res.ok) {
        alert(editingTagId ? "標籤已更新" : "標籤已建立");
        setShowTagForm(false);
        setEditingTagId(null);
        setTagFormData({ slug: "", name: "", sort: 0, description: "" });
        fetchTags();
      }
    } catch (err) {
      console.error("Failed to save tag:", err);
      alert("保存失敗");
    } finally {
      setTagLoading(false);
    }
  };

  const handleDeleteTag = async (id: number) => {
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

  return (
    <div className="py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-text-primary-light">分類管理</h2>
        <button
          onClick={() => setShowCategoryHelp(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border-light bg-background-light hover:bg-primary/10 transition-colors"
          title="分類使用說明"
        >
          <span className="material-symbols-outlined text-lg">help</span>
          <span className="text-sm text-text-primary-light">使用說明</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* L1 Categories */}
        <div className="flex flex-col gap-3 rounded-xl border border-border-light bg-card-light p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-text-primary-light">一級分類 (L1)</h3>
            <button
              onClick={() => {
                setShowCategoryForm(true);
                setEditingCategoryId(null);
                setCategoryFormData({ slug: "", name: "", sort: 0, description: "", icon: "", level: 1, retail_visible: true });
              }}
              className="text-xs px-2 py-1 bg-primary text-white rounded hover:bg-primary/90"
            >
              新增
            </button>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {categories
              .filter((c) => c.level === 1)
              .sort((a, b) => a.sort - b.sort)
              .map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => setSelectedL1(cat.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedL1 === cat.id
                    ? "bg-primary/20 border border-primary"
                    : "bg-background-light border border-border-light hover:bg-primary/10"
                    }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 flex items-center gap-3">
                      {cat.icon && (
                        /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(cat.icon) ? (
                          <span className="text-xl">{cat.icon}</span>
                        ) : (
                          <span className="material-symbols-outlined text-xl text-primary">
                            {cat.icon}
                          </span>
                        )
                      )}
                      <div>
                        <p className="font-medium text-text-primary-light">{cat.name}</p>
                        <p className="text-xs text-text-secondary-light">{cat.slug}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCategoryId(cat.id);
                          setCategoryFormData({
                            slug: cat.slug,
                            name: cat.name,
                            sort: cat.sort,
                            description: cat.description,
                            icon: cat.icon || "",
                            level: cat.level,
                            retail_visible: cat.retail_visible ?? true,
                          });
                          setShowCategoryForm(true);
                        }}
                        className="text-xs px-2 py-1 bg-primary/20 text-primary rounded hover:bg-primary/30"
                      >
                        編輯
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCategory(cat.id);
                        }}
                        className="text-xs px-2 py-1 bg-danger/20 text-danger rounded hover:bg-danger/30"
                      >
                        刪除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* L2 Categories */}
        <div className="flex flex-col gap-3 rounded-xl border border-border-light bg-card-light p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-text-primary-light">二級分類 (L2)</h3>
            <button
              onClick={() => {
                setShowCategoryForm(true);
                setEditingCategoryId(null);
                setCategoryFormData({ slug: "", name: "", sort: 0, description: "", icon: "", level: 2, retail_visible: true });
              }}
              className="text-xs px-2 py-1 bg-primary text-white rounded hover:bg-primary/90"
            >
              新增
            </button>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {categories
              .filter((c) => c.level === 2)
              .sort((a, b) => a.sort - b.sort)
              .map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => setSelectedL2(cat.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedL2 === cat.id
                    ? "bg-primary/20 border border-primary"
                    : "bg-background-light border border-border-light hover:bg-primary/10"
                    }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 flex items-center gap-3">
                      {cat.icon && (
                        /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(cat.icon) ? (
                          <span className="text-xl">{cat.icon}</span>
                        ) : (
                          <span className="material-symbols-outlined text-xl text-primary">
                            {cat.icon}
                          </span>
                        )
                      )}
                      <div>
                        <p className="font-medium text-text-primary-light">{cat.name}</p>
                        <p className="text-xs text-text-secondary-light">{cat.slug}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCategoryId(cat.id);
                          setCategoryFormData({
                            slug: cat.slug,
                            name: cat.name,
                            sort: cat.sort,
                            description: cat.description,
                            icon: cat.icon || "",
                            level: cat.level,
                            retail_visible: cat.retail_visible ?? true,
                          });
                          setShowCategoryForm(true);
                        }}
                        className="text-xs px-2 py-1 bg-primary/20 text-primary rounded hover:bg-primary/30"
                      >
                        編輯
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCategory(cat.id);
                        }}
                        className="text-xs px-2 py-1 bg-danger/20 text-danger rounded hover:bg-danger/30"
                      >
                        刪除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* L3 Categories */}
        <div className="flex flex-col gap-3 rounded-xl border border-border-light bg-card-light p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-text-primary-light">三級分類 (L3)</h3>
            <button
              onClick={() => {
                setShowCategoryForm(true);
                setEditingCategoryId(null);
                setCategoryFormData({ slug: "", name: "", sort: 0, description: "", icon: "", level: 3, retail_visible: true });
              }}
              className="text-xs px-2 py-1 bg-primary text-white rounded hover:bg-primary/90"
            >
              新增
            </button>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {categories
              .filter((c) => c.level === 3)
              .sort((a, b) => a.sort - b.sort)
              .map((cat) => (
                <div
                  key={cat.id}
                  className="p-3 rounded-lg bg-background-light border border-border-light"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 flex items-center gap-3">
                      {cat.icon && (
                        /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(cat.icon) ? (
                          <span className="text-xl">{cat.icon}</span>
                        ) : (
                          <span className="material-symbols-outlined text-xl text-primary">
                            {cat.icon}
                          </span>
                        )
                      )}
                      <div>
                        <p className="font-medium text-text-primary-light">{cat.name}</p>
                        <p className="text-xs text-text-secondary-light">{cat.slug}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditingCategoryId(cat.id);
                          setCategoryFormData({
                            slug: cat.slug,
                            name: cat.name,
                            sort: cat.sort,
                            description: cat.description,
                            icon: cat.icon || "",
                            level: cat.level,
                            retail_visible: cat.retail_visible ?? true,
                          });
                          setShowCategoryForm(true);
                        }}
                        className="text-xs px-2 py-1 bg-primary/20 text-primary rounded hover:bg-primary/30"
                      >
                        編輯
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="text-xs px-2 py-1 bg-danger/20 text-danger rounded hover:bg-danger/30"
                      >
                        刪除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* L1 -> L2 */}
        <div className="rounded-xl border border-border-light bg-card-light p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-text-primary-light">父子關係：L1 → L2</h3>
            <div className="text-sm text-text-secondary-light">
              {selectedL1 ? `目前 L1：${categories.find((c) => c.id === selectedL1)?.name || selectedL1}` : "請先在左側點選一個 L1"}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-72 overflow-y-auto">
            {categories
              .filter((c) => c.level === 2)
              .sort((a, b) => a.sort - b.sort)
              .map((l2) => (
                <label key={l2.id} className="flex items-center gap-2 rounded-lg border border-border-light bg-background-light px-3 py-2">
                  <input
                    type="checkbox"
                    disabled={!selectedL1}
                    checked={isRelated(selectedL1, l2.id)}
                    onChange={(e) => toggleRelation(selectedL1, l2.id, e.target.checked)}
                  />
                  <span className="text-sm text-text-primary-light">{l2.name}</span>
                  <span className="text-xs text-text-secondary-light">{l2.slug}</span>
                </label>
              ))}
          </div>
        </div>

        {/* L2 -> L3 */}
        <div className="rounded-xl border border-border-light bg-card-light p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-text-primary-light">父子關係：L2 → L3</h3>
            <div className="text-sm text-text-secondary-light">
              {selectedL2 ? `目前 L2：${categories.find((c) => c.id === selectedL2)?.name || selectedL2}` : "請先在中間點選一個 L2"}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-72 overflow-y-auto">
            {categories
              .filter((c) => c.level === 3)
              .sort((a, b) => a.sort - b.sort)
              .map((l3) => (
                <label key={l3.id} className="flex items-center gap-2 rounded-lg border border-border-light bg-background-light px-3 py-2">
                  <input
                    type="checkbox"
                    disabled={!selectedL2}
                    checked={isRelated(selectedL2, l3.id)}
                    onChange={(e) => toggleRelation(selectedL2, l3.id, e.target.checked)}
                  />
                  <span className="text-sm text-text-primary-light">{l3.name}</span>
                  <span className="text-xs text-text-secondary-light">{l3.slug}</span>
                </label>
              ))}
          </div>
        </div>
      </div>

      {showCategoryForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card-light rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-text-primary-light mb-4">
              {editingCategoryId ? "編輯分類" : "新增分類"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary-light mb-1">
                  Slug (英文大寫)
                </label>
                <input
                  type="text"
                  value={categoryFormData.slug}
                  onChange={(e) =>
                    setCategoryFormData({
                      ...categoryFormData,
                      slug: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm"
                  placeholder="例：JP, WOMEN, OUTER"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary-light mb-1">
                  名稱
                </label>
                <input
                  type="text"
                  value={categoryFormData.name}
                  onChange={(e) =>
                    setCategoryFormData({
                      ...categoryFormData,
                      name: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm"
                  placeholder="例：日本商品"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary-light mb-1">
                  排序
                </label>
                <input
                  type="number"
                  value={categoryFormData.sort}
                  onChange={(e) =>
                    setCategoryFormData({
                      ...categoryFormData,
                      sort: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary-light mb-1">
                  零售會員可見
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-text-secondary-light">
                  <input
                    type="checkbox"
                    checked={categoryFormData.retail_visible ?? true}
                    onChange={(e) =>
                      setCategoryFormData({
                        ...categoryFormData,
                        retail_visible: e.target.checked,
                      })
                    }
                    className="rounded border-border-light"
                  />
                  <span>若關閉，此分類以及該分類下商品將不會出現在零售端商品列表</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary-light mb-1">
                  描述
                </label>
                <textarea
                  value={categoryFormData.description}
                  onChange={(e) =>
                    setCategoryFormData({
                      ...categoryFormData,
                      description: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm"
                  rows={3}
                  placeholder="分類描述（供管理員參考）"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary-light mb-1">
                  圖標
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowIconPicker(true)}
                    className="flex items-center gap-2 px-3 py-2 border border-border-light rounded-lg bg-background-light hover:bg-gray-50 transition-colors"
                  >
                    {categoryFormData.icon ? (
                      <>
                        {/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(categoryFormData.icon) ? (
                          <span className="text-lg">{categoryFormData.icon}</span>
                        ) : (
                          <span className="material-symbols-outlined text-lg text-primary">
                            {categoryFormData.icon}
                          </span>
                        )}
                        <span className="text-sm text-text-primary-light">
                          {categoryFormData.icon}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-lg text-gray-400">
                          add_circle
                        </span>
                        <span className="text-sm text-text-secondary-light">
                          選擇圖標
                        </span>
                      </>
                    )}
                  </button>
                  {categoryFormData.icon && (
                    <button
                      type="button"
                      onClick={() => setCategoryFormData({
                        ...categoryFormData,
                        icon: ""
                      })}
                      className="px-2 py-1 text-xs text-gray-500 hover:text-red-500 transition-colors"
                    >
                      清除
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCategoryForm(false);
                  setEditingCategoryId(null);
                }}
                className="flex-1 px-4 py-2 rounded-lg border border-border-light text-text-primary-light hover:bg-background-light"
              >
                取消
              </button>
              <button
                onClick={handleSaveCategory}
                disabled={categoryLoading}
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {categoryLoading ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showIconPicker && (
        <IconPicker
          value={categoryFormData.icon}
          onChange={(icon) => {
            setCategoryFormData({
              ...categoryFormData,
              icon: icon
            });
          }}
          onClose={() => setShowIconPicker(false)}
        />
      )}

      {showCategoryHelp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card-light rounded-xl p-8 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-text-primary-light">分類使用說明</h3>
              <button
                onClick={() => setShowCategoryHelp(false)}
                className="text-text-secondary-light hover:text-text-primary-light"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-bold text-text-primary-light mb-3">分類結構</h4>
                <p className="text-sm text-text-secondary-light mb-3">
                  系統採用三層級分類結構，從寬泛到具體：
                </p>
                <ul className="text-sm text-text-secondary-light space-y-2 ml-4">
                  <li>• <span className="font-medium text-text-primary-light">L1（一級）</span>：國家/地區（JP、KR、TH、EUR）</li>
                  <li>• <span className="font-medium text-text-primary-light">L2（二級）</span>：商品類型（WOMEN、MEN、KIDS、ACC、BEAUTY、FOOD）</li>
                  <li>• <span className="font-medium text-text-primary-light">L3（三級）</span>：具體商品分類（OUTER、TEE、SHORT、PANT、HAT、SKINCARE、SNACKS）</li>
                </ul>
              </div>

              <div className="border-l-4 border-primary pl-4">
                <h4 className="text-lg font-bold text-text-primary-light mb-2">情境 1：日本女性服飾</h4>
                <p className="text-sm text-text-secondary-light mb-2">
                  當您導入一件日本女性外套時：
                </p>
                <div className="bg-background-light rounded-lg p-3 text-xs text-text-primary-light font-mono space-y-1">
                  <div>L1：JP（日本）</div>
                  <div>L2：WOMEN（女性）</div>
                  <div>L3：OUTER（外套）</div>
                </div>
              </div>

              <div className="border-l-4 border-primary pl-4">
                <h4 className="text-lg font-bold text-text-primary-light mb-2">情境 2：韓國兒童食品</h4>
                <p className="text-sm text-text-secondary-light mb-2">
                  當您導入韓國兒童零食時：
                </p>
                <div className="bg-background-light rounded-lg p-3 text-xs text-text-primary-light font-mono space-y-1">
                  <div>L1：KR（韓國）</div>
                  <div>L2：FOOD（食品）</div>
                  <div>L3：SNACKS（零食）</div>
                </div>
              </div>

              <div className="border-l-4 border-primary pl-4">
                <h4 className="text-lg font-bold text-text-primary-light mb-2">情境 3：泰國美妝配件</h4>
                <p className="text-sm text-text-secondary-light mb-2">
                  當您導入泰國護膚品時：
                </p>
                <div className="bg-background-light rounded-lg p-3 text-xs text-text-primary-light font-mono space-y-1">
                  <div>L1：TH（泰國）</div>
                  <div>L2：BEAUTY（美妝）</div>
                  <div>L3：SKINCARE（護膚）</div>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-bold text-text-primary-light mb-3">父子關係設定</h4>
                <p className="text-sm text-text-secondary-light">
                  在下方「父子關係」區塊中，您可以設定 L1 與 L2、L2 與 L3 之間的對應關係。
                  例如：JP（L1）可以對應 WOMEN、MEN、KIDS、ACC、BEAUTY、FOOD（L2），
                  而 WOMEN（L2）可以對應 OUTER、TEE、SHORT、PANT、HAT（L3）。
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCategoryHelp(false)}
                className="px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border-light bg-card-light p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-text-primary-light">標籤</h3>
          <button
            onClick={() => {
              setShowTagForm(true);
              setEditingTagId(null);
              setTagFormData({ slug: "", name: "", sort: 0, description: "" });
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-primary/90"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            <span>新增標籤</span>
          </button>
        </div>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {tags
            .sort((a, b) => a.sort - b.sort)
            .map((tag) => (
              <div key={tag.id} className="p-3 rounded-lg bg-background-light border border-border-light">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium text-text-primary-light">{tag.name}</p>
                    <p className="text-xs text-text-secondary-light">{tag.slug}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditingTagId(tag.id);
                        setTagFormData({ slug: tag.slug, name: tag.name, sort: tag.sort, description: tag.description });
                        setShowTagForm(true);
                      }}
                      className="text-xs px-2 py-1 bg-primary/20 text-primary rounded hover:bg-primary/30"
                    >
                      編輯
                    </button>
                    <button
                      onClick={() => handleDeleteTag(tag.id)}
                      className="text-xs px-2 py-1 bg-danger/20 text-danger rounded hover:bg-danger/30"
                    >
                      刪除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          {tags.length === 0 && (
            <p className="text-sm text-text-secondary-light">尚無標籤，點擊右上角「新增標籤」。</p>
          )}
        </div>
      </div>

      {showTagForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card-light rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-text-primary-light mb-4">{editingTagId ? "編輯標籤" : "新增標籤"}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary-light mb-1">Slug (英文大寫)</label>
                <input
                  type="text"
                  value={tagFormData.slug}
                  onChange={(e) => setTagFormData({ ...tagFormData, slug: e.target.value.toUpperCase() })}
                  className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm"
                  placeholder="例：LIVE_BROADCAST"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary-light mb-1">名稱</label>
                <input
                  type="text"
                  value={tagFormData.name}
                  onChange={(e) => setTagFormData({ ...tagFormData, name: e.target.value })}
                  className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm"
                  placeholder="例：直播商品"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary-light mb-1">排序</label>
                <input
                  type="number"
                  value={tagFormData.sort}
                  onChange={(e) => setTagFormData({ ...tagFormData, sort: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary-light mb-1">描述</label>
                <textarea
                  value={tagFormData.description}
                  onChange={(e) => setTagFormData({ ...tagFormData, description: e.target.value })}
                  className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm"
                  rows={3}
                  placeholder="標籤描述（供管理員參考）"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowTagForm(false);
                  setEditingTagId(null);
                }}
                className="flex-1 px-4 py-2 rounded-lg border border-border-light text-text-primary-light hover:bg-background-light"
              >
                取消
              </button>
              <button
                onClick={handleSaveTag}
                disabled={tagLoading}
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {tagLoading ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
