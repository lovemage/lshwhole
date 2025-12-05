"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string | null;
  status: "draft" | "published" | "archived";
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  published_at: string | null;
  created_at: string;
  tags: Tag[];
}

interface Tag {
  id: number;
  name: string;
  slug: string;
  category: string;
}

export default function BlogManager() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  
  // Editor State
  const [showEditor, setShowEditor] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    cover_image: "",
    status: "draft" as "draft" | "published" | "archived",
    seo_title: "",
    seo_description: "",
    seo_keywords: "",
    tag_ids: [] as number[],
  });
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchPosts();
    fetchTags();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/blog-posts");
      if (res.ok) {
        const data = await res.json();
        setPosts(data.data || []);
      }
    } catch (e) {
      console.error("Failed to fetch posts", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const res = await fetch("/api/tags");
      if (res.ok) {
         setTags(await res.json());
      }
    } catch (e) {
        console.error("Failed to fetch tags", e);
    }
  };
  
  const handleEdit = (post: BlogPost) => {
    setEditingPost(post);
    setFormData({
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt || "",
        content: post.content || "",
        cover_image: post.cover_image || "",
        status: post.status,
        seo_title: post.seo_title || "",
        seo_description: post.seo_description || "",
        seo_keywords: post.seo_keywords || "",
        tag_ids: post.tags?.map(t => t.id) || [],
    });
    setShowEditor(true);
  };
  
  const handleCreate = () => {
      setEditingPost(null);
      setFormData({
        title: "",
        slug: "",
        excerpt: "",
        content: "",
        cover_image: "",
        status: "draft",
        seo_title: "",
        seo_description: "",
        seo_keywords: "",
        tag_ids: [],
      });
      setShowEditor(true);
  };

  const handleSave = async () => {
      if (!formData.title || !formData.slug) {
          alert("標題和 Slug 為必填欄位");
          return;
      }
      
      const payload = {
          ...formData,
          tags: formData.tag_ids,
          tag_ids: undefined // Backend expects 'tags' as array of IDs
      };
      
      try {
          const url = editingPost ? `/api/blog-posts/${editingPost.id}` : "/api/blog-posts";
          const method = editingPost ? "PUT" : "POST";
          
          const res = await fetch(url, {
              method,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
          });
          
          if (res.ok) {
              alert("儲存成功");
              setShowEditor(false);
              fetchPosts();
          } else {
              const err = await res.json();
              alert(err.error || "儲存失敗");
          }
      } catch (e) {
          console.error(e);
          alert("儲存失敗");
      }
  };
  
  const handleDelete = async (id: number) => {
      if(!confirm("確定要刪除這篇文章嗎？")) return;
      try {
          const res = await fetch(`/api/blog-posts/${id}`, { method: "DELETE" });
          if (res.ok) {
              fetchPosts();
          } else {
              alert("刪除失敗");
          }
      } catch(e) {
          alert("刪除失敗");
      }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      setIsUploading(true);
      try {
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch("/api/upload", { method: "POST", body: fd });
          if (res.ok) {
              const data = await res.json();
              setFormData({...formData, cover_image: data.url});
          } else {
              alert("上傳失敗");
          }
      } catch (e) {
          alert("上傳失敗");
      } finally {
          setIsUploading(false);
      }
  };

  // Auto-generate slug from title (simple version)
  const generateSlug = () => {
      if (!formData.title) return;
      // If chinese, maybe use random ID or pinyin? 
      // For now just random string if not english
      const isAscii = /^[\x00-\x7F]*$/.test(formData.title);
      if (isAscii) {
          const slug = formData.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
          setFormData({...formData, slug});
      } else {
          // Generate a timestamp based slug for non-ascii
          const slug = `post-${Date.now()}`;
          setFormData({...formData, slug});
      }
  };

  if (showEditor) {
      return (
          <div className="py-6 space-y-6">
              <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-800">{editingPost ? "編輯文章" : "新增文章"}</h2>
                  <button onClick={() => setShowEditor(false)} className="text-gray-500 hover:text-gray-700">取消</button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Main Content */}
                  <div className="lg:col-span-2 space-y-4">
                      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">標題</label>
                              <input 
                                type="text" 
                                value={formData.title} 
                                onChange={(e) => setFormData({...formData, title: e.target.value})}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                                placeholder="輸入文章標題"
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">內容</label>
                              <div className="h-96 pb-12">
                                <ReactQuill 
                                    theme="snow" 
                                    value={formData.content} 
                                    onChange={(val) => setFormData({...formData, content: val})} 
                                    className="h-80"
                                />
                              </div>
                          </div>
                          <div className="pt-8">
                              <label className="block text-sm font-medium text-gray-700 mb-1">摘要 (Excerpt)</label>
                              <textarea 
                                value={formData.excerpt} 
                                onChange={(e) => setFormData({...formData, excerpt: e.target.value})}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 h-24"
                                placeholder="簡短描述，用於列表顯示"
                              />
                          </div>
                      </div>
                      
                      {/* SEO Section */}
                      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                          <h3 className="font-bold text-gray-800 border-b pb-2">SEO 設定</h3>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">SEO 標題</label>
                              <input 
                                type="text" 
                                value={formData.seo_title} 
                                onChange={(e) => setFormData({...formData, seo_title: e.target.value})}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                                placeholder="預設使用文章標題"
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">SEO 描述</label>
                              <textarea 
                                value={formData.seo_description} 
                                onChange={(e) => setFormData({...formData, seo_description: e.target.value})}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                                placeholder="建議 160 字以內"
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">關鍵字 (Keywords)</label>
                              <input 
                                type="text" 
                                value={formData.seo_keywords} 
                                onChange={(e) => setFormData({...formData, seo_keywords: e.target.value})}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                                placeholder="以逗號分隔"
                              />
                          </div>
                      </div>
                  </div>
                  
                  {/* Sidebar Settings */}
                  <div className="space-y-6">
                      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">狀態</label>
                              <select 
                                value={formData.status} 
                                onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                              >
                                  <option value="draft">草稿 (Draft)</option>
                                  <option value="published">發布 (Published)</option>
                                  <option value="archived">封存 (Archived)</option>
                              </select>
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">網址代稱 (Slug)</label>
                              <div className="flex gap-2">
                                  <input 
                                    type="text" 
                                    value={formData.slug} 
                                    onChange={(e) => setFormData({...formData, slug: e.target.value})}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                                  />
                                  <button onClick={generateSlug} className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200 text-xs whitespace-nowrap">生成</button>
                              </div>
                          </div>
                      </div>
                      
                      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">封面圖片</label>
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors relative">
                              {formData.cover_image ? (
                                  <div className="relative">
                                      <img src={formData.cover_image} alt="Cover" className="w-full h-40 object-cover rounded" />
                                      <button 
                                        onClick={() => setFormData({...formData, cover_image: ""})}
                                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                      >
                                          <span className="material-symbols-outlined text-sm">close</span>
                                      </button>
                                  </div>
                              ) : (
                                  <label className="cursor-pointer block">
                                      <span className="material-symbols-outlined text-4xl text-gray-400">add_photo_alternate</span>
                                      <p className="text-sm text-gray-500 mt-2">{isUploading ? "上傳中..." : "點擊上傳圖片"}</p>
                                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
                                  </label>
                              )}
                          </div>
                      </div>
                      
                      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">標籤</label>
                          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                              {tags.map(tag => (
                                  <button 
                                    key={tag.id}
                                    onClick={() => {
                                        const ids = formData.tag_ids.includes(tag.id)
                                            ? formData.tag_ids.filter(id => id !== tag.id)
                                            : [...formData.tag_ids, tag.id];
                                        setFormData({...formData, tag_ids: ids});
                                    }}
                                    className={`px-3 py-1 rounded-full text-xs transition-colors border ${
                                        formData.tag_ids.includes(tag.id)
                                        ? "bg-primary text-white border-primary"
                                        : "bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200"
                                    }`}
                                  >
                                      {tag.name}
                                  </button>
                              ))}
                          </div>
                      </div>
                      
                      {/* AI Helper */}
                      <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 text-sm">
                          <div className="flex justify-between items-start mb-2">
                              <h4 className="font-bold text-purple-800 flex items-center gap-2">
                                  <span className="material-symbols-outlined text-lg">auto_awesome</span>
                                  AI 文章生成助手
                              </h4>
                              <button 
                                onClick={() => {
                                    const text = `請協助製作 Blog 文章：\n\n請分別填入以下內容：\n1. 標題 (範例:大阪玩具購物行程)\n2. 內容 (豐富詳細，使用 HTML 格式)\n3. 摘要\n4. SEO標題\n5. SEO描述 (注意字數限制)\n6. 關鍵字 (逗號分開)`;
                                    navigator.clipboard.writeText(text);
                                    alert("已複製指令！請貼上給 AI 使用。");
                                }}
                                className="text-xs bg-white text-purple-600 border border-purple-200 px-2 py-1 rounded hover:bg-purple-50 flex items-center gap-1"
                              >
                                  <span className="material-symbols-outlined text-sm">content_copy</span>
                                  複製指令
                              </button>
                          </div>
                          <p className="text-purple-700 mb-2">複製以下指令給 AI (如 ChatGPT) 來協助撰寫：</p>
                          <div className="bg-white/50 p-2 rounded border border-purple-100 text-purple-800 font-mono text-xs whitespace-pre-wrap">
                              請協助製作 Blog 文章：<br/>
                              請分別填入以下內容：<br/>
                              1. 標題 (範例:大阪玩具購物行程)<br/>
                              2. 內容 (豐富詳細，使用 HTML 格式)<br/>
                              3. 摘要<br/>
                              4. SEO標題<br/>
                              5. SEO描述 (注意字數限制)<br/>
                              6. 關鍵字 (逗號分開)
                          </div>
                      </div>

                      {/* Instructions */}
                      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800">
                          <h4 className="font-bold mb-2">教學說明</h4>
                          <ul className="list-disc pl-4 space-y-1">
                              <li>設定 <strong>SEO 標題</strong> 與 <strong>描述</strong> 可增加 Google 搜尋曝光。</li>
                              <li>使用 <strong>H2, H3</strong> 標籤來組織文章結構。</li>
                              <li>圖片建議使用 WebP 格式並壓縮。</li>
                          </ul>
                      </div>

                      <button 
                        onClick={handleSave}
                        className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 shadow-sm"
                      >
                          儲存文章
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">部落格文章管理 (Overseas News)</h2>
        <button
          onClick={handleCreate}
          className="px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90"
        >
          新增文章
        </button>
      </div>
      
      {/* Blog List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">封面</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">標題 / Slug</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">狀態</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">標籤</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">建立時間</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                  {loading ? (
                      <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">載入中...</td></tr>
                  ) : posts.length === 0 ? (
                      <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">尚無文章</td></tr>
                  ) : (
                      posts.map(post => (
                          <tr key={post.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="h-12 w-20 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                                    {post.cover_image ? (
                                        <img src={post.cover_image} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                        <span className="text-xs text-gray-400">無圖</span>
                                    )}
                                  </div>
                              </td>
                              <td className="px-6 py-4">
                                  <div className="text-sm font-medium text-gray-900 line-clamp-1">{post.title}</div>
                                  <div className="text-xs text-gray-500">{post.slug}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                      post.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                      {post.status === 'published' ? '已發布' : post.status === 'archived' ? '已封存' : '草稿'}
                                  </span>
                              </td>
                              <td className="px-6 py-4">
                                  <div className="flex flex-wrap gap-1">
                                      {post.tags?.map(t => (
                                          <span key={t.id} className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">{t.name}</span>
                                      ))}
                                  </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(post.created_at).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <button onClick={() => handleEdit(post)} className="text-primary hover:text-primary/80 mr-4">編輯</button>
                                  <button onClick={() => handleDelete(post.id)} className="text-red-600 hover:text-red-800">刪除</button>
                              </td>
                          </tr>
                      ))
                  )}
              </tbody>
          </table>
      </div>
    </div>
  );
}
