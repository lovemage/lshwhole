import { useState, useEffect } from "react";

interface Announcement {
  id: number;
  title: string;
  content: string;
  is_active: boolean;
  created_at: string;
}

export default function AnnouncementManager() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ title: "", content: "" });
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/announcements");
      if (response.ok) {
        const data = await response.json();
        setAnnouncements(data);
      }
    } catch (error) {
      console.error("Failed to fetch announcements:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAnnouncement = async () => {
    if (!formData.title || !formData.content) {
      alert("請填寫標題和內容");
      return;
    }

    try {
      setLoading(true);
      if (editingId) {
        // Update
        const response = await fetch(`/api/announcements/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (response.ok) {
          alert("公告已更新");
          setEditingId(null);
          setFormData({ title: "", content: "" });
          fetchAnnouncements();
        }
      } else {
        // Create
        const response = await fetch("/api/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (response.ok) {
          alert("公告已建立");
          setFormData({ title: "", content: "" });
          fetchAnnouncements();
        }
      }
    } catch (error) {
      console.error("Failed to save announcement:", error);
      alert("保存失敗");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAnnouncement = async (id: number) => {
    if (!confirm("確定要刪除此公告嗎？")) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/announcements/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        alert("公告已刪除");
        fetchAnnouncements();
      }
    } catch (error) {
      console.error("Failed to delete announcement:", error);
      alert("刪除失敗");
    } finally {
      setLoading(false);
    }
  };

  const handleEditAnnouncement = (announcement: Announcement) => {
    setEditingId(announcement.id);
    setFormData({ title: announcement.title, content: announcement.content });
    setShowForm(true);
  };

  return (
    <div className="py-6">
      <div className="mb-6">
        <div className="flex gap-4 border-b border-border-light">
          <button
            onClick={() => {
              setShowForm(false);
              setEditingId(null);
              setFormData({ title: "", content: "" });
            }}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              !showForm
                ? "border-primary text-primary"
                : "border-transparent text-text-secondary-light hover:text-text-primary-light"
            }`}
          >
            公告列表
          </button>
          <button
            onClick={() => {
              setShowForm(true);
              setEditingId(null);
              setFormData({ title: "", content: "" });
            }}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              showForm && !editingId
                ? "border-primary text-primary"
                : "border-transparent text-text-secondary-light hover:text-text-primary-light"
            }`}
          >
            新增公告
          </button>
          {editingId && (
            <button
              onClick={() => {
                setShowForm(true);
              }}
              className={`px-4 py-2 font-medium border-b-2 transition-colors border-primary text-primary`}
            >
              編輯公告
            </button>
          )}
        </div>
      </div>

      {!showForm ? (
        // Announcements List
        <div className="space-y-4">
          {loading ? (
            <p className="text-text-secondary-light">載入中...</p>
          ) : announcements.length === 0 ? (
            <p className="text-text-secondary-light">暫無公告</p>
          ) : (
            announcements.map((announcement) => (
              <div
                key={announcement.id}
                className="flex flex-col gap-3 rounded-xl border border-border-light bg-card-light p-6"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-text-primary-light">
                      {announcement.title}
                    </h3>
                    <p className="text-sm text-text-secondary-light mt-1">
                      {new Date(announcement.created_at).toLocaleDateString(
                        "zh-TW"
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditAnnouncement(announcement)}
                      className="px-3 py-1 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    >
                      編輯
                    </button>
                    <button
                      onClick={() => handleDeleteAnnouncement(announcement.id)}
                      className="px-3 py-1 text-sm font-medium text-danger hover:bg-danger/10 rounded-lg transition-colors"
                    >
                      刪除
                    </button>
                  </div>
                </div>
                <p className="text-text-primary-light line-clamp-2">
                  {announcement.content.replace(/<[^>]*>/g, "")}
                </p>
              </div>
            ))
          )}
        </div>
      ) : (
        // Announcement Form
        <div className="space-y-4 max-w-2xl">
          <div>
            <label className="block text-sm font-medium text-text-primary-light mb-2">
              標題
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="輸入公告標題"
              className="w-full px-4 py-2 rounded-lg border border-border-light bg-background-light text-text-primary-light placeholder:text-text-secondary-light focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary-light mb-2">
              內容
            </label>
            <textarea
              value={formData.content}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              placeholder="輸入公告內容"
              rows={8}
              className="w-full px-4 py-2 rounded-lg border border-border-light bg-background-light text-text-primary-light placeholder:text-text-secondary-light focus:border-primary focus:ring-1 focus:ring-primary resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSaveAnnouncement}
              disabled={loading}
              className="px-6 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? "保存中..." : editingId ? "更新公告" : "建立公告"}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setFormData({ title: "", content: "" });
              }}
              className="px-6 py-2 border border-border-light text-text-primary-light font-medium rounded-lg hover:bg-background-light transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
