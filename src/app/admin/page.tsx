"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import IconPicker from "@/components/IconPicker";
import Script from "next/script";
interface DashboardStats {
  label: string;
  value: string;
  change: string;
  changeType: "positive" | "negative";
}

interface CategoryStat {
  name: string;
  percentage: number;
}

interface Announcement {
  id: number;
  title: string;
  content: string;
  is_active: boolean;
  created_at: string;
}

interface Category {
  id: number;
  slug: string;
  name: string;
  level: number;
  sort: number;
  description: string;
  icon?: string;
  // 新增：控制此分類是否對零售會員顯示
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

function AdminDashboard() {
  const [activeNav, setActiveNav] = useState("dashboard");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ title: "", content: "" });
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // 爬蟲導入狀態
  const [crawlerProducts, setCrawlerProducts] = useState<any[]>([]);
  const [crawlerFiltered, setCrawlerFiltered] = useState<any[]>([]);
  const [crawlerSearch, setCrawlerSearch] = useState("");
  const [crawlerSort, setCrawlerSort] = useState("default");
  const [priceSourceMode, setPriceSourceMode] = useState<"auto" | "jpy" | "krw">("auto");
  const [showSettings, setShowSettings] = useState(false);
  const [exchangeRates, setExchangeRates] = useState({ jpy_to_twd: 0.22, krw_to_twd: 0.024, profitMargin: 0 });

  // 分類管理狀態
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
  // 爬蟲導入：分類/標籤預設選擇
  const [selectedCrawlerL1, setSelectedCrawlerL1] = useState<number | null>(null);
  const [selectedCrawlerL2, setSelectedCrawlerL2] = useState<number | null>(null);
  const [selectedCrawlerL3, setSelectedCrawlerL3] = useState<number | null>(null);
  const [selectedCrawlerTags, setSelectedCrawlerTags] = useState<number[]>([]);
  // 分類說明 Modal
  const [showCategoryHelp, setShowCategoryHelp] = useState(false);
  // 爬蟲上架 Modal 狀態
  const [showPublish, setShowPublish] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishTarget, setPublishTarget] = useState<any>(null);
  // 批量上架狀態
  const [selectedCrawlerProducts, setSelectedCrawlerProducts] = useState<Set<number>>(new Set());
  const [showBatchPriceAdjust, setShowBatchPriceAdjust] = useState(false);
  const [batchPriceAdjustMode, setBatchPriceAdjustMode] = useState<"fixed" | "percentage">("fixed");
  const [batchPriceAdjustCost, setBatchPriceAdjustCost] = useState(0);
  const [batchPriceAdjustWholesale, setBatchPriceAdjustWholesale] = useState(0);
  const [batchPriceAdjustRetail, setBatchPriceAdjustRetail] = useState(0);
  const [batchPublishing, setBatchPublishing] = useState(false);
  const [publishForm, setPublishForm] = useState({
    sku: "",
    title: "",
    description: "",
    cost_twd: 0,
    wholesale_price_twd: 0,
    retail_price_twd: 0,
    l1Id: null as number | null,
    l2Id: null as number | null,
    l3Id: null as number | null,
    image_urls: [] as string[],
  });



  // 橫幅管理狀態
  const [bannerTab, setBannerTab] = useState<"index" | "products">("index");
  const [indexBanners, setIndexBanners] = useState<any[]>([]);
  const [bannerLoading, setBannerLoading] = useState(false);
  const [newIndexBanner, setNewIndexBanner] = useState({
    image_url: "",
    title: "",
    description: "",
    link_url: "",
    sort: 0,
    active: true,
  });
  const [indexInterval, setIndexInterval] = useState<number>(5);

  // 商品頁橫幅狀態
  const [productsBanners, setProductsBanners] = useState<any[]>([]);
  const [newProductsBanner, setNewProductsBanner] = useState({
    image_url: "",
    sort: 0,
    active: true,
  });


  // 商品管理狀態
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductL1, setSelectedProductL1] = useState<number | null>(null);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productPage, setProductPage] = useState(0);
  const [productTotal, setProductTotal] = useState(0);
  const pageSize = 20;
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [showProductEdit, setShowProductEdit] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [productEditForm, setProductEditForm] = useState({
    sku: "",
    title_zh: "",
    retail_price_twd: 0,
    wholesale_price_twd: 0,
    cost_twd: 0,
    status: "draft" as "draft" | "published",
  });

  // 會員管理狀態
  const [members, setMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberTierFilter, setMemberTierFilter] = useState("");
  const [memberStatusFilter, setMemberStatusFilter] = useState(""); // 新增：狀態篩選 (all, overdue, disabled)
  const [memberPage, setMemberPage] = useState(0);
  const [memberTotal, setMemberTotal] = useState(0);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [showMemberDetail, setShowMemberDetail] = useState(false);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState(0);
  const [topupNote, setTopupNote] = useState("");
  const [topupLoading, setTopupLoading] = useState(false);

  // 熱銷商品管理狀態
  const [hotProducts, setHotProducts] = useState<any[]>([]);
  const [hotProductsLoading, setHotProductsLoading] = useState(false);
  const [showAddHotProduct, setShowAddHotProduct] = useState(false);
  const [hotProductCandidates, setHotProductCandidates] = useState<any[]>([]);
  const [hotProductCandidateTotal, setHotProductCandidateTotal] = useState(0);
  const [hotProductCandidatePage, setHotProductCandidatePage] = useState(0);
  const [hotProductSearch, setHotProductSearch] = useState("");
  const [selectedHotCandidateIds, setSelectedHotCandidateIds] = useState<number[]>([]);
  const [addingHotProducts, setAddingHotProducts] = useState(false);
  const [selectedHotProductIds, setSelectedHotProductIds] = useState<number[]>([]);

  // 展示設定狀態 (Display Settings)
  const [displaySettings, setDisplaySettings] = useState<{
    popular: number[];
    korea: number[];
    japan: number[];
    thailand: number[];
  }>({ popular: [], korea: [], japan: [], thailand: [] });
  const [showDisplaySettingsDrawer, setShowDisplaySettingsDrawer] = useState(false);
  const [activeDisplayTab, setActiveDisplayTab] = useState<"popular" | "korea" | "japan" | "thailand">("popular");
  const [displayCandidates, setDisplayCandidates] = useState<any[]>([]);
  const [displayCandidateSearch, setDisplayCandidateSearch] = useState("");
  const [displayCandidatePage, setDisplayCandidatePage] = useState(0);
  const [displayCandidateTotal, setDisplayCandidateTotal] = useState(0);
  const [selectedDisplayCandidateIds, setSelectedDisplayCandidateIds] = useState<number[]>([]);
  const [savingDisplaySettings, setSavingDisplaySettings] = useState(false);
  const [displaySettingsLoading, setDisplaySettingsLoading] = useState(false);


  // 訂單管理狀態
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersPage, setOrdersPage] = useState(0);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [ordersStatusFilter, setOrdersStatusFilter] = useState<string>("");
  const [ordersSearch, setOrdersSearch] = useState("");

  // 批發升級申請設定（申請資格 / 銀行帳號 / 代理費）
  const [upgradeSettings, setUpgradeSettings] = useState<{
    rules_text: string;
    bank_account_info: string;
    agent_fee_twd: number | null;
  } | null>(null);
  const [upgradeSettingsLoading, setUpgradeSettingsLoading] = useState(false);

  // Sub-accounts state
  const [subAccounts, setSubAccounts] = useState<any[]>([]);
  const [subAccountsLoading, setSubAccountsLoading] = useState(false);
  const [showSubAccountModal, setShowSubAccountModal] = useState(false);
  const [editingSubAccount, setEditingSubAccount] = useState<any>(null);
  const [subAccountForm, setSubAccountForm] = useState({
    email: "",
    password: "",
    name: "",
    permissions: [] as string[],
  });
  const [currentUserPermissions, setCurrentUserPermissions] = useState<string[] | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    // 當 L1 改變時重置 L2/L3
    setSelectedCrawlerL2(null);
    setSelectedCrawlerL3(null);
  }, [selectedCrawlerL1]);

  useEffect(() => {
    // 當 L2 改變時重置 L3
    setSelectedCrawlerL3(null);
  }, [selectedCrawlerL2]);
  // Fetch category relations
  useEffect(() => {
    if (activeNav === "categories") {
      fetchCategoryRelations();
    }
  }, [activeNav]);
  // Crawler 也需要分類/標籤/關聯資料
  useEffect(() => {
    if (activeNav === "crawler") {
      fetchCategories();
      fetchTags();
      fetchCategoryRelations();
    }
  }, [activeNav]);


  // Fetch announcements
  useEffect(() => {
    if (activeNav === "announcements") {
      fetchAnnouncements();
    }
  }, [activeNav]);

  // Fetch products
  useEffect(() => {
    if (activeNav === "products") {
      fetchCategories();
      fetchProducts(0, null);
    }
  }, [activeNav]);

  // Fetch members
  useEffect(() => {
    if (activeNav === "members") {
      fetchMembers(0);
    }
  }, [activeNav]);

  // Fetch hot products and display settings
  useEffect(() => {
    if (activeNav === "hot_products") {
      fetchHotProducts();
      fetchDisplaySettings();
    }
  }, [activeNav]);

  // Fetch orders
  useEffect(() => {
    if (activeNav === "orders") {
      fetchOrders(0);
    }
  }, [activeNav]);

  // Fetch wholesale upgrade settings
  useEffect(() => {
    if (activeNav === "upgrade_settings") {
      fetchUpgradeSettings();
    }
  }, [activeNav]);

  // Fetch banners
  useEffect(() => {
    if (activeNav === "banners") {
      if (bannerTab === "index") {
        fetchIndexBanners();
        fetchIndexInterval();
      } else {
        fetchProductsBanners();
      }
    }
  }, [activeNav, bannerTab]);


  // Fetch categories
  useEffect(() => {
    if (activeNav === "categories") {
      fetchCategories();
      fetchTags();
    }
  }, [activeNav]);

  // Fetch sub-accounts
  useEffect(() => {
    if (activeNav === "sub_accounts") {
      fetchSubAccounts();
    }
  }, [activeNav]);

  // Check permissions
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const { data: { user } } = await import("@/lib/supabase").then(m => m.supabase.auth.getUser());
        if (user) {
          setCurrentUserId(user.id);
          const res = await fetch("/api/admin/sub-accounts");
          if (res.ok) {
            const accounts = await res.json();
            const myAccount = accounts.find((acc: any) => acc.user_id === user.id);
            if (myAccount) {
              setCurrentUserPermissions(myAccount.permissions || []);
            } else {
              setCurrentUserPermissions(null);
            }
          }
        }
      } catch (err) {
        console.error("Failed to check permissions:", err);
      }
    };
    checkPermissions();
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

  // 分類管理函數
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

  // 分類父子關係：讀取/判斷/切換
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
      // 操作成功後重新抓取關聯資料
      await fetchCategoryRelations();
    } catch (err) {
      console.error("toggleRelation error:", err);
      alert("操作失敗");
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

  // 標籤管理函數
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

  // 商品管理函數
  const fetchProducts = async (page: number = 0, l1Id: number | null = null) => {
    try {
      setProductsLoading(true);
      const offset = page * pageSize;
      let url = `/api/products?limit=${pageSize}&offset=${offset}`;

      if (productSearch) {
        url += `&search=${encodeURIComponent(productSearch)}`;
      }

      if (l1Id) {
        url += `&category_id=${l1Id}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const result = await res.json();
        setProducts(result.data || []);
        setProductTotal(result.count || 0);
        setProductPage(page);
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
    } finally {
      setProductsLoading(false);
    }
  };
  // 商品操作 handlers
  const toggleSelectAll = () => {
    if (selectedProductIds.length === products.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(products.map((p: any) => p.id));
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const batchUpdateStatus = async (newStatus: "draft" | "published") => {
    if (selectedProductIds.length === 0) return alert("請先選擇商品");
    const res = await fetch("/api/products/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "status", ids: selectedProductIds, status: newStatus }),
    });
    if (res.ok) {
      setSelectedProductIds([]);
      fetchProducts(productPage, selectedProductL1);
    } else {
      const j = await res.json().catch(() => ({}));
      alert(j?.error || "操作失敗");
    }
  };

  const batchDelete = async () => {
    if (selectedProductIds.length === 0) return alert("請先選擇商品");
    if (!confirm(`確定刪除選取的 ${selectedProductIds.length} 件商品？`)) return;
    const res = await fetch("/api/products/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", ids: selectedProductIds }),
    });
    if (res.ok) {
      setSelectedProductIds([]);
      fetchProducts(productPage, selectedProductL1);
    } else {
      const j = await res.json().catch(() => ({}));
      alert(j?.error || "刪除失敗");
    }
  };

  const openEditProduct = (p: any) => {
    setEditingProduct(p);
    setProductEditForm({
      sku: p.sku || "",
      title_zh: p.title_zh || p.title_original || "",
      retail_price_twd: Number(p.retail_price_twd || 0),
      wholesale_price_twd: Number(p.wholesale_price_twd || 0),
      cost_twd: Number(p.cost_twd || 0),
      status: (p.status === "published" ? "published" : "draft") as "draft" | "published",
    });
    setShowProductEdit(true);
  };

  const saveEditProduct = async () => {
    if (!editingProduct) return;
    // 價格強制為整數
    const toInt = (v: any) => (v === null || v === undefined || v === "" ? null : Math.floor(Number(v)));
    const payload = {
      sku: productEditForm.sku,
      title_zh: productEditForm.title_zh,
      retail_price_twd: toInt(productEditForm.retail_price_twd),
      wholesale_price_twd: toInt(productEditForm.wholesale_price_twd),
      cost_twd: toInt(productEditForm.cost_twd),
      status: productEditForm.status,
    };
    const res = await fetch(`/api/products/${editingProduct.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {

      setShowProductEdit(false);
      setEditingProduct(null);
      fetchProducts(productPage, selectedProductL1);
    } else {
      const j = await res.json().catch(() => ({}));
      alert(j?.error || "保存失敗");
    }
  };

  // 橫幅：首頁
  const fetchIndexBanners = async () => {
    setBannerLoading(true);
    try {
      const res = await fetch("/api/banners/index");
      const j = await res.json().catch(() => ({}));
      if (res.ok) setIndexBanners(Array.isArray(j.data) ? j.data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setBannerLoading(false);
    }
  };

  const fetchIndexInterval = async () => {
    try {
      const res = await fetch("/api/banner-settings?page_type=index");
      if (res.ok) {
        const j = await res.json().catch(() => ({}));
        if (j?.data?.carousel_interval != null) setIndexInterval(Number(j.data.carousel_interval));
      }
    } catch { }
  };

  const saveIndexInterval = async () => {
    try {
      const res = await fetch("/api/banner-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page_type: "index", carousel_interval: Number(indexInterval || 5) }),
      });
      if (res.ok) alert("輪播秒數已保存");
      else {
        const j = await res.json().catch(() => ({}));
        alert(j?.error || "保存失敗");
      }
    } catch {
      alert("保存失敗，請稍後再試");
    }
  };

  const createIndexBanner = async () => {
    if (!newIndexBanner.image_url.trim()) return alert("請輸入圖片網址");
    try {
      const res = await fetch("/api/banners/index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newIndexBanner),
      });
      if (res.ok) {
        setNewIndexBanner({ image_url: "", title: "", description: "", link_url: "", sort: 0, active: true });
        fetchIndexBanners();
      } else {
        const j = await res.json().catch(() => ({}));
        alert(j?.error || "新增失敗");
      }
    } catch {
      alert("新增失敗，請稍後再試");
    }
  };

  const updateIndexBanner = async (id: number, patch: any) => {
    const res = await fetch(`/api/banners/index?id=${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j?.error || "更新失敗");
    }
  };

  const deleteIndexBanner = async (id: number) => {
    if (!confirm("確定刪除此橫幅？")) return;
    const res = await fetch(`/api/banners/index?id=${id}`, { method: "DELETE" });
    if (res.ok) fetchIndexBanners();
    else {
      const j = await res.json().catch(() => ({}));
      alert(j?.error || "刪除失敗");
    }
  };

  const commitIndexBannerOrder = async (arr: any[]) => {
    for (let i = 0; i < arr.length; i++) {
      const it = arr[i];
      await updateIndexBanner(it.id, { sort: i });
    }
    fetchIndexBanners();
  };

  const moveIndexOrder = async (idx: number, dir: -1 | 1) => {
    const arr = [...indexBanners];
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    const tmp = arr[idx];
    arr[idx] = arr[j];
    arr[j] = tmp;
    setIndexBanners(arr);
    await commitIndexBannerOrder(arr);
  };

  // 橫幅：商品頁
  const fetchProductsBanners = async () => {
    setBannerLoading(true);
    try {
      const res = await fetch("/api/banners/products");
      const j = await res.json().catch(() => ({}));
      if (res.ok) setProductsBanners(Array.isArray(j.data) ? j.data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setBannerLoading(false);
    }
  };

  const createProductsBanner = async () => {
    if (!newProductsBanner.image_url.trim()) return alert("請輸入圖片網址");
    try {
      const res = await fetch("/api/banners/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProductsBanner),
      });
      if (res.ok) {
        setNewProductsBanner({ image_url: "", sort: 0, active: true });
        fetchProductsBanners();
      } else {
        const j = await res.json().catch(() => ({}));
        alert(j?.error || "新增失敗");
      }
    } catch {
      alert("新增失敗，請稍後再試");
    }
  };

  const updateProductsBanner = async (id: number, patch: any) => {
    const res = await fetch(`/api/banners/products?id=${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j?.error || "更新失敗");
    }
  };

  const deleteProductsBanner = async (id: number) => {
    if (!confirm("確定刪除此橫幅？")) return;
    const res = await fetch(`/api/banners/products?id=${id}`, { method: "DELETE" });
    if (res.ok) fetchProductsBanners();
    else {
      const j = await res.json().catch(() => ({}));
      alert(j?.error || "刪除失敗");
    }
  };

  const commitProductsBannerOrder = async (arr: any[]) => {
    for (let i = 0; i < arr.length; i++) {
      const it = arr[i];
      await updateProductsBanner(it.id, { sort: i });
    }
    fetchProductsBanners();
  };

  const moveProductsOrder = async (idx: number, dir: -1 | 1) => {
    const arr = [...productsBanners];
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    const tmp = arr[idx];
    arr[idx] = arr[j];
    arr[j] = tmp;
    setProductsBanners(arr);
    await commitProductsBannerOrder(arr);
  };



  // 爬蟲上架：開啟與提交（移出 saveEditProduct 作用域）
  const openPublish = (p: any) => {
    const costTwd = Math.floor(Number(getPriceTWD(p) || 0));
    // 自動計算批發價和零售價：批發價 = 成本價 + 25%，零售價 = 成本價 + 35%
    const wholesaleTwd = Math.floor(costTwd * 1.25);
    const retailTwd = Math.floor(costTwd * 1.35);

    setPublishTarget(p);
    setPublishForm({
      sku: String(p.productCode || ""),
      title: String(p.title || ""),
      description: String(p.description || ""),
      cost_twd: costTwd,
      wholesale_price_twd: wholesaleTwd,
      retail_price_twd: retailTwd,
      l1Id: selectedCrawlerL1,
      l2Id: selectedCrawlerL2,
      l3Id: selectedCrawlerL3,
      image_urls: Array.isArray(p.images) ? [...p.images] : [],
    });
    setShowPublish(true);
  };

  const moveImage = (idx: number, dir: -1 | 1) => {
    setPublishForm((prev) => {
      const arr = [...prev.image_urls];
      const to = idx + dir;
      if (to < 0 || to >= arr.length) return prev;
      const tmp = arr[idx];
      arr[idx] = arr[to];
      arr[to] = tmp;
      return { ...prev, image_urls: arr };
    });
  };

  // 重新計算批發價和零售價（爬蟲上架）
  const recalculatePrices = () => {
    const costTwd = publishForm.cost_twd;
    if (costTwd <= 0) {
      alert("請先設定成本價格");
      return;
    }
    const wholesaleTwd = Math.floor(costTwd * 1.25);
    const retailTwd = Math.floor(costTwd * 1.35);

    setPublishForm(prev => ({
      ...prev,
      wholesale_price_twd: wholesaleTwd,
      retail_price_twd: retailTwd
    }));
  };

  // 重新計算批發價和零售價（商品編輯）
  const recalculateEditPrices = () => {
    const costTwd = productEditForm.cost_twd;
    if (costTwd <= 0) {
      alert("請先設定成本價格");
      return;
    }
    const wholesaleTwd = Math.floor(costTwd * 1.25);
    const retailTwd = Math.floor(costTwd * 1.35);

    setProductEditForm(prev => ({
      ...prev,
      wholesale_price_twd: wholesaleTwd,
      retail_price_twd: retailTwd
    }));
  };

  const toggleImage = (url: string) => {
    setPublishForm((prev) => {
      const arr = new Set(prev.image_urls);
      if (arr.has(url)) arr.delete(url); else arr.add(url);
      return { ...prev, image_urls: Array.from(arr) };
    });
  };

  const publishNow = async () => {
    try {
      setPublishing(true);
      const toInt = (v: any) =>
        v === null || v === undefined || v === "" ? null : Math.floor(Number(v));
      const category_ids = [
        publishForm.l1Id,
        publishForm.l2Id,
        publishForm.l3Id,
      ].filter(Boolean) as number[];
      const payload = {
        sku: publishForm.sku,
        title: publishForm.title,
        description: publishForm.description,
        cost_twd: toInt(publishForm.cost_twd),
        wholesale_price_twd: toInt(publishForm.wholesale_price_twd),
        retail_price_twd: toInt(publishForm.retail_price_twd),
        status: "published",
        category_ids,
        tag_ids: selectedCrawlerTags,
        image_urls: publishForm.image_urls,
      };
      if (!payload.sku || !payload.title) {
        alert("請填寫 SKU 與標題");
        return;
      }
      const res = await fetch("/api/publish-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        alert("上架成功");
        setShowPublish(false);
      } else {
        const j = await res.json().catch(() => ({}));
        alert(j?.error || "上架失敗");
      }
    } finally {
      setPublishing(false);
    }
  };

  // 訂單管理函數
  const fetchOrders = async (page: number = 0) => {
    try {
      setOrdersLoading(true);
      const offset = page * pageSize;
      let url = `/api/admin/orders?limit=${pageSize}&offset=${offset}`;

      if (ordersStatusFilter) {
        url += `&status=${encodeURIComponent(ordersStatusFilter)}`;
      }

      if (ordersSearch) {
        url += `&search=${encodeURIComponent(ordersSearch)}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const result = await res.json();
        setOrders(result.data || []);
        setOrdersTotal(result.count || 0);
        setOrdersPage(page);
      } else {
        const j = await res.json().catch(() => ({}));
        alert("載入訂單列表失敗：" + (j?.error || "未知錯誤"));
      }
    } catch (err) {
      console.error("Failed to fetch orders:", err);
      alert("載入訂單列表失敗");
    } finally {
      setOrdersLoading(false);
    }
  };

  const deleteProduct = async (id: number) => {
    if (!confirm("確定刪除此商品？")) return;
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchProducts(productPage, selectedProductL1);
    } else {
      const j = await res.json().catch(() => ({}));
      alert(j?.error || "刪除失敗");
    }
  };

  // 會員管理函數
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

  const openMemberDetail = async (member: any) => {
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
          openMemberDetail({ user_id: userId });
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
          openMemberDetail({ user_id: userId });
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
        openMemberDetail({ user_id: selectedMember.profile.user_id });
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
      openMemberDetail({ user_id: userId });
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
      openMemberDetail({ user_id: userId });
      fetchMembers(memberPage);
    } catch (err) {
      console.error("Failed to reject upgrade:", err);
      alert("拒絕申請失敗");
    }
  };

  // Sub-account handlers
  const fetchSubAccounts = async () => {
    try {
      setSubAccountsLoading(true);
      const res = await fetch("/api/admin/sub-accounts");
      if (res.ok) {
        const data = await res.json();
        setSubAccounts(data);
      }
    } catch (err) {
      console.error("Failed to fetch sub-accounts:", err);
    } finally {
      setSubAccountsLoading(false);
    }
  };

  const handleSaveSubAccount = async () => {
    if (!subAccountForm.email || (!editingSubAccount && !subAccountForm.password)) {
      alert("請填寫必要欄位");
      return;
    }

    try {
      setSubAccountsLoading(true);
      const method = editingSubAccount ? "PUT" : "POST";
      const body = editingSubAccount
        ? { ...subAccountForm, user_id: editingSubAccount.user_id }
        : subAccountForm;

      const res = await fetch("/api/admin/sub-accounts", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        alert(editingSubAccount ? "子帳戶已更新" : "子帳戶已建立");
        setShowSubAccountModal(false);
        setEditingSubAccount(null);
        setSubAccountForm({ email: "", password: "", name: "", permissions: [] });
        fetchSubAccounts();
      } else {
        const j = await res.json().catch(() => ({}));
        alert(j?.error || "操作失敗");
      }
    } catch (err) {
      console.error("Failed to save sub-account:", err);
      alert("操作失敗");
    } finally {
      setSubAccountsLoading(false);
    }
  };

  const handleDeleteSubAccount = async (userId: string) => {
    if (!confirm("確定要刪除此子帳戶嗎？")) return;
    try {
      const res = await fetch(`/api/admin/sub-accounts?user_id=${userId}`, { method: "DELETE" });
      if (res.ok) {
        alert("子帳戶已刪除");
        fetchSubAccounts();
      } else {
        alert("刪除失敗");
      }
    } catch (err) {
      console.error("Failed to delete sub-account:", err);
      alert("刪除失敗");
    }
  };

  const togglePermission = (navId: string) => {
    setSubAccountForm(prev => {
      const perms = prev.permissions.includes(navId)
        ? prev.permissions.filter(p => p !== navId)
        : [...prev.permissions, navId];
      return { ...prev, permissions: perms };
    });
  };

  // 熱銷商品管理函數
  const fetchHotProducts = async () => {
    try {
      setHotProductsLoading(true);
      const res = await fetch("/api/admin/hot-products", {
        headers: { Authorization: `Bearer ${localStorage.getItem("supabase.auth.token")}` } // 修正：實際環境應由 cookie 處理，或 API route 內處理
      });
      // 注意：上面的 auth header 在我們專案架構中可能不需要，如果是 server component 或 middleware 處理。
      // 但原 api route 檢查 header。這裡簡化，假設 nextjs 會自動帶上 cookie，或者我們需要調整 api route。
      // 根據現有 api route 寫法：它檢查 Authorization header。
      // 但我們在 client side fetch，通常不會手動帶 header 除非有儲存 token。
      // 暫時嘗試直接 fetch，如果不通再調整。

      // 修正：我們使用 nextjs api route，通常依賴 cookie。原 api route 代碼使用了 createClient with auth header，
      // 這是因為 admin client 是 service role，但驗證使用者需要 user token。
      // 在我們目前的架構，前端 fetch 會自動帶 cookie，API route 應該從 cookie 讀取 (createServerComponentClient)。
      // 但原 API route 用 `request.headers.get("Authorization")`，這可能需要調整。
      // 暫時保留直接 fetch，假設 API route 已修正或可運作。
      const res2 = await fetch("/api/admin/hot-products");

      if (res2.ok) {
        const j = await res2.json();
        setHotProducts(j.products || []);
      } else {
        console.error("Failed to fetch hot products");
      }
    } catch (err) {
      console.error("Failed to fetch hot products:", err);
    } finally {
      setHotProductsLoading(false);
    }
  };

  const fetchHotProductCandidates = async (page: number = 0) => {
    try {
      const offset = page * pageSize;
      let url = `/api/products?limit=${pageSize}&offset=${offset}&status=published`; // 僅限已上架商品
      if (hotProductSearch) {
        url += `&search=${encodeURIComponent(hotProductSearch)}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const result = await res.json();
        // 過濾掉已經是熱銷商品的
        const currentHotIds = new Set(hotProducts.map((p) => p.id));
        const candidates = (result.data || []).map((p: any) => ({
          ...p,
          is_already_hot: currentHotIds.has(p.id)
        }));
        setHotProductCandidates(candidates);
        setHotProductCandidateTotal(result.count || 0);
        setHotProductCandidatePage(page);
      }
    } catch (err) {
      console.error("Failed to fetch candidates:", err);
    }
  };

  const handleAddHotProducts = async () => {
    if (selectedHotCandidateIds.length === 0) return alert("請選擇商品");

    try {
      setAddingHotProducts(true);
      const res = await fetch("/api/admin/hot-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_ids: selectedHotCandidateIds }),
      });

      if (res.ok) {
        alert("已加入熱銷商品");
        setSelectedHotCandidateIds([]);
        setShowAddHotProduct(false);
        fetchHotProducts();
      } else {
        const j = await res.json().catch(() => ({}));
        alert(j?.error || "加入失敗");
      }
    } catch (err) {
      console.error("Failed to add hot products:", err);
      alert("加入失敗");
    } finally {
      setAddingHotProducts(false);
    }
  };

  const handleRemoveHotProducts = async () => {
    if (selectedHotProductIds.length === 0) return alert("請選擇要移除的商品");
    if (!confirm(`確定要移除選取的 ${selectedHotProductIds.length} 件商品嗎？`)) return;

    try {
      const res = await fetch("/api/admin/hot-products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_ids: selectedHotProductIds }),
      });

      if (res.ok) {
        alert("已移除熱銷商品");
        setSelectedHotProductIds([]);
        fetchHotProducts();
      } else {
        const j = await res.json().catch(() => ({}));
        alert(j?.error || "移除失敗");
      }
    } catch (err) {
      console.error("Failed to remove hot products:", err);
      alert("移除失敗");
    }
  };

  // 展示設定管理函數 (Display Settings Functions)
  const fetchDisplaySettings = async () => {
    try {
      setDisplaySettingsLoading(true);
      const res = await fetch("/api/display-settings");
      if (res.ok) {
        const data = await res.json();
        setDisplaySettings(data);
      }
    } catch (err) {
      console.error("Failed to fetch display settings:", err);
    } finally {
      setDisplaySettingsLoading(false);
    }
  };

  const fetchDisplayCandidates = async (page: number = 0) => {
    try {
      const offset = page * pageSize;
      let url = `/api/products?limit=${pageSize}&offset=${offset}&status=published`;
      if (displayCandidateSearch) {
        url += `&search=${encodeURIComponent(displayCandidateSearch)}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const j = await res.json();
        // 標記已在當前分頁中的商品
        const currentIds = displaySettings[activeDisplayTab] || [];
        const candidates = (j.data || []).map((p: any) => ({
          ...p,
          is_already_added: currentIds.includes(p.id)
        }));
        setDisplayCandidates(candidates);
        setDisplayCandidateTotal(j.count || 0);
        setDisplayCandidatePage(page);
      }
    } catch (err) {
      console.error("Failed to fetch display candidates:", err);
    }
  };

  const saveDisplaySettings = async (newSettings: any) => {
    try {
      setSavingDisplaySettings(true);
      const res = await fetch("/api/display-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings),
      });
      if (res.ok) {
        setDisplaySettings(newSettings);
        alert("設定已儲存");
        setShowDisplaySettingsDrawer(false);
      } else {
        alert("儲存失敗");
      }
    } catch (err) {
      console.error("Failed to save display settings:", err);
      alert("儲存失敗");
    } finally {
      setSavingDisplaySettings(false);
    }
  };

  const handleAddDisplayProducts = async () => {
    if (selectedDisplayCandidateIds.length === 0) return;

    const currentIds = displaySettings[activeDisplayTab] || [];
    // Filter out duplicates just in case
    const newIds = [...currentIds, ...selectedDisplayCandidateIds.filter(id => !currentIds.includes(id))];

    const newSettings = {
      ...displaySettings,
      [activeDisplayTab]: newIds
    };

    await saveDisplaySettings(newSettings);
    setSelectedDisplayCandidateIds([]);
  };

  const handleRemoveDisplayProducts = async (idsToRemove: number[]) => {
    if (!confirm(`確定要移除選取的 ${idsToRemove.length} 個商品嗎？`)) return;

    const currentIds = displaySettings[activeDisplayTab] || [];
    const newIds = currentIds.filter(id => !idsToRemove.includes(id));

    const newSettings = {
      ...displaySettings,
      [activeDisplayTab]: newIds
    };

    await saveDisplaySettings(newSettings);
  };

  const toggleHotCandidate = (id: number) => {
    setSelectedHotCandidateIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleHotProductSelect = (id: number) => {
    setSelectedHotProductIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

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


  // 批量選擇商品
  const toggleSelectProduct = (idx: number) => {
    setSelectedCrawlerProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(idx)) {
        newSet.delete(idx);
      } else {
        newSet.add(idx);
      }
      return newSet;
    });
  };

  // 全選/取消全選（爬蟲）
  const toggleSelectAllCrawler = () => {
    if (selectedCrawlerProducts.size === crawlerFiltered.length) {
      setSelectedCrawlerProducts(new Set());
    } else {
      setSelectedCrawlerProducts(new Set(crawlerFiltered.map((_, idx) => idx)));
    }
  };

  // 應用批量價格調整
  const applyBatchPriceAdjust = () => {
    if (selectedCrawlerProducts.size === 0) {
      alert("請先選擇商品");
      return;
    }

    // 檢查是否至少有一個價格被調整
    if (batchPriceAdjustCost === 0 && batchPriceAdjustWholesale === 0 && batchPriceAdjustRetail === 0) {
      alert("請至少調整一個價格");
      return;
    }

    const updated = crawlerFiltered.map((p, idx) => {
      if (!selectedCrawlerProducts.has(idx)) return p;

      const currentPrice = getPriceTWD(p);
      let newPrice = currentPrice;

      // 只調整成本價（通過調整原始貨幣價格）
      if (batchPriceAdjustCost !== 0) {
        if (batchPriceAdjustMode === "fixed") {
          newPrice = currentPrice + batchPriceAdjustCost;
        } else {
          newPrice = Math.floor(currentPrice * (1 + batchPriceAdjustCost / 100));
        }

        // 根據原始貨幣類型反推價格
        if (p.wholesalePriceJPY) {
          p.wholesalePriceJPY = Math.floor(newPrice / exchangeRates.jpy_to_twd);
        } else if (p.wholesalePriceKRW) {
          p.wholesalePriceKRW = Math.floor(newPrice / exchangeRates.krw_to_twd);
        }
      }

      // 存儲批發價和零售價調整值（用於上架時使用）
      p._wholesaleAdjust = batchPriceAdjustWholesale;
      p._retailAdjust = batchPriceAdjustRetail;
      p._adjustMode = batchPriceAdjustMode;

      return p;
    });

    setCrawlerProducts(updated);
    setCrawlerFiltered(applyFilterSort(updated));
    setShowBatchPriceAdjust(false);
    alert("價格已調整");
  };

  // 批量上架
  const batchPublish = async () => {
    if (selectedCrawlerProducts.size === 0) {
      alert("請先選擇商品");
      return;
    }

    // 至少需要選擇 L1 和 L2，L3 可選
    if (!selectedCrawlerL1 || !selectedCrawlerL2) {
      alert("請先選擇分類（至少需要 L1 和 L2）");
      return;
    }

    if (!confirm(`確定要上架 ${selectedCrawlerProducts.size} 件商品嗎？`)) return;

    try {
      setBatchPublishing(true);
      const toInt = (v: any) => (v === null || v === undefined || v === "" ? null : Math.floor(Number(v)));
      const category_ids = [selectedCrawlerL1, selectedCrawlerL2, selectedCrawlerL3].filter(Boolean) as number[];

      let successCount = 0;
      let failCount = 0;

      for (const idx of Array.from(selectedCrawlerProducts).sort((a, b) => a - b)) {
        const p = crawlerFiltered[idx];
        const costTwd = Math.floor(Number(getPriceTWD(p) || 0));

        // 計算批發價和零售價
        let wholesaleTwd = Math.floor(costTwd * 1.25);
        let retailTwd = Math.floor(costTwd * 1.35);

        // 應用批發價調整
        if (p._wholesaleAdjust !== undefined && p._wholesaleAdjust !== 0) {
          if (p._adjustMode === "fixed") {
            wholesaleTwd = wholesaleTwd + p._wholesaleAdjust;
          } else {
            wholesaleTwd = Math.floor(wholesaleTwd * (1 + p._wholesaleAdjust / 100));
          }
        }

        // 應用零售價調整
        if (p._retailAdjust !== undefined && p._retailAdjust !== 0) {
          if (p._adjustMode === "fixed") {
            retailTwd = retailTwd + p._retailAdjust;
          } else {
            retailTwd = Math.floor(retailTwd * (1 + p._retailAdjust / 100));
          }
        }

        const payload = {
          sku: `${p.productCode}-${Date.now()}`,
          title: p.title,
          description: p.description || "",
          cost_twd: costTwd,
          wholesale_price_twd: wholesaleTwd,
          retail_price_twd: retailTwd,
          status: "published",
          category_ids,
          tag_ids: selectedCrawlerTags,
          image_urls: Array.isArray(p.images) ? [...p.images] : [],
        };

        const res = await fetch("/api/publish-product", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          successCount++;
        } else {
          failCount++;
        }
      }

      alert(`上架完成：成功 ${successCount} 件，失敗 ${failCount} 件`);
      setSelectedCrawlerProducts(new Set());
    } finally {
      setBatchPublishing(false);
    }
  };


  const stats: DashboardStats[] = [
    { label: "總銷售額", value: "$125,430.50", change: "+2.5% 較上月", changeType: "positive" },
    { label: "新訂單", value: "82", change: "+5.1% 較上月", changeType: "positive" },
    { label: "會員成長", value: "15", change: "-1.2% 較上月", changeType: "negative" },
  ];

  const categoryStats: CategoryStat[] = [
    { name: "韓國美妝", percentage: 80 },
    { name: "日本零食", percentage: 60 },
    { name: "泰國裝飾", percentage: 50 },
    { name: "服飾", percentage: 40 },
    { name: "電子產品", percentage: 20 },
  ];

  const navItems = [
    { id: "dashboard", label: "儀表看板", icon: "dashboard" },
    { id: "announcements", label: "公告管理", icon: "campaign" },
    { id: "categories", label: "分類管理", icon: "category" },
    { id: "crawler", label: "爬蟲導入", icon: "cloud_download" },
    { id: "products", label: "商品管理", icon: "inventory_2" },
    { id: "members", label: "會員管理", icon: "group" },
    { id: "upgrade_settings", label: "申請資格", icon: "description" },
    { id: "orders", label: "訂單管理", icon: "receipt_long" },
    { id: "hot_products", label: "熱銷商品", icon: "whatshot" },
    { id: "sub_accounts", label: "子帳管理", icon: "manage_accounts" },
    { id: "banners", label: "橫幅管理", icon: "view_carousel" },
    { id: "settings", label: "系統設置", icon: "settings" },
  ];

  // Filter nav items based on permissions
  const filteredNavItems = navItems.filter(item =>
    currentUserPermissions === null || currentUserPermissions.includes(item.id)
  );
  // 爬蟲導入：載入本地設定
  useEffect(() => {
    if (activeNav !== "crawler") return;
    try {
      const saved = localStorage.getItem("crawlerSettings");
      if (saved) {
        const obj = JSON.parse(saved);
        if (obj && typeof obj === "object") setExchangeRates((prev) => ({ ...prev, ...obj }));
      }
    } catch { }
  }, [activeNav]);

  const saveSettings = () => {
    localStorage.setItem("crawlerSettings", JSON.stringify(exchangeRates));
    alert("設定已保存");
  };

  const resetSettings = () => {
    const def = { jpy_to_twd: 0.22, krw_to_twd: 0.024, profitMargin: 0 };
    setExchangeRates(def);
    localStorage.setItem("crawlerSettings", JSON.stringify(def));
  };

  const getPriceTWD = (p: any) => {
    const margin = 1 + (Number(exchangeRates.profitMargin) || 0) / 100;
    // 優先使用 TWD，否則使用來源幣別換算
    if (p.wholesalePriceTWD) return Number(p.wholesalePriceTWD) * margin;
    if (priceSourceMode === "jpy" || (priceSourceMode === "auto" && p.wholesalePriceJPY)) {
      return Number(p.wholesalePriceJPY || 0) * (Number(exchangeRates.jpy_to_twd) || 0) * margin;
    }
    if (priceSourceMode === "krw" || (priceSourceMode === "auto" && p.wholesalePriceKRW)) {
      return Number(p.wholesalePriceKRW || 0) * (Number(exchangeRates.krw_to_twd) || 0) * margin;
    }
    return 0;
  };

  const applyFilterSort = (list: any[]) => {
    let arr = list;
    if (crawlerSearch.trim()) {
      const q = crawlerSearch.trim().toLowerCase();
      arr = arr.filter((p) =>
        (p.productCode || "").toString().toLowerCase().includes(q) ||
        (p.title || "").toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q)
      );
    }
    if (crawlerSort === "price-asc") arr = [...arr].sort((a, b) => getPriceTWD(a) - getPriceTWD(b));
    if (crawlerSort === "price-desc") arr = [...arr].sort((a, b) => getPriceTWD(b) - getPriceTWD(a));
    if (crawlerSort === "code-asc") arr = [...arr].sort((a, b) => String(a.productCode).localeCompare(String(b.productCode)));
    if (crawlerSort === "code-desc") arr = [...arr].sort((a, b) => String(b.productCode).localeCompare(String(a.productCode)));
    return arr;
  };

  useEffect(() => {
    if (!crawlerProducts.length) return;
    setCrawlerFiltered(applyFilterSort(crawlerProducts));
  }, [crawlerProducts, crawlerSearch, crawlerSort, priceSourceMode]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const name = file.name.toLowerCase();
    if (name.endsWith(".json")) {
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        parseJson(data);
      } catch (err) {
        alert("JSON 解析失敗");
      }
    } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      // 需依賴 XLSX CDN
      const w: any = window as any;
      if (!w.XLSX) {
        alert("Excel 解析庫尚未載入，請稍後重試");
        return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = w.XLSX.read(data, { type: "array" });
        const firstSheet = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheet];
        const json = w.XLSX.utils.sheet_to_json(sheet);
        parseJson(json);
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert("僅支援 .json / .xlsx 檔案");
    }
  };

  const parseJson = (input: any) => {
    const arr = Array.isArray(input) ? input : [input];
    const mapped = arr.map((it: any) => {
      const images = Array.isArray(it.images)
        ? it.images
        : Array.isArray(it.imgs)
          ? it.imgs
          : Array.isArray(it.imageUrls)
            ? it.imageUrls
            : it.image
              ? [it.image]
              : [];
      return {
        productCode: it.productCode || it.code || it.sku || it.id || "無代碼",
        title: it.title || it.name || "無標題",
        description: it.description || it.desc || "",
        wholesalePriceJPY: it.wholesalePriceJPY || it.priceJPY || it.price_jpy || it.jpy || null,
        wholesalePriceKRW: it.wholesalePriceKRW || it.priceKRW || it.price_krw || it.krw || null,
        wholesalePriceTWD: it.wholesalePriceTWD || it.priceTWD || it.twd || null,
        url: it.url || it.link || null,
        images,
      };
    });
    setCrawlerProducts(mapped);
    setCrawlerFiltered(applyFilterSort(mapped));
  };


  // Sub-account Modal
  const renderSubAccountModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">{editingSubAccount ? "編輯子帳戶" : "新增子帳戶"}</h2>
          <button onClick={() => setShowSubAccountModal(false)} className="text-text-secondary-light hover:text-text-primary-light">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email (帳號)</label>
            <input
              type="email"
              value={subAccountForm.email}
              onChange={(e) => setSubAccountForm({ ...subAccountForm, email: e.target.value })}
              disabled={!!editingSubAccount}
              className="w-full px-3 py-2 border border-border-light rounded-lg disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">密碼 {editingSubAccount && "(不修改請留空)"}</label>
            <input
              type="password"
              value={subAccountForm.password}
              onChange={(e) => setSubAccountForm({ ...subAccountForm, password: e.target.value })}
              className="w-full px-3 py-2 border border-border-light rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">姓名</label>
            <input
              type="text"
              value={subAccountForm.name}
              onChange={(e) => setSubAccountForm({ ...subAccountForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-border-light rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">權限設定 (勾選可見頁面)</label>
            <div className="grid grid-cols-2 gap-2">
              {navItems.map(item => (
                <label key={item.id} className="flex items-center gap-2 p-2 border border-border-light rounded bg-gray-50 cursor-pointer hover:bg-gray-100">
                  <input
                    type="checkbox"
                    checked={subAccountForm.permissions.includes(item.id)}
                    onChange={() => togglePermission(item.id)}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span className="text-sm">{item.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => setShowSubAccountModal(false)}
            className="flex-1 px-4 py-2 border border-border-light rounded-lg font-medium hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleSaveSubAccount}
            disabled={subAccountsLoading}
            className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {subAccountsLoading ? "處理中..." : "確認儲存"}
          </button>
        </div>
      </div>
    </div>
  );

  // Sub-accounts List
  if (activeNav === "sub_accounts") {
    return (
      <div className="flex h-screen bg-background-light">
        {/* Sidebar (Reused) */}
        <aside className="flex w-64 flex-col bg-sidebar-dark text-text-primary-dark p-4">
          <div className="flex items-center gap-3 p-4">
            <div className="size-8 text-primary">
              <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path d="M44 11.2727C44 14.0109 39.8386 16.3957 33.69 17.6364C39.8386 18.877 44 21.2618 44 24C44 26.7382 39.8386 29.123 33.69 30.3636C39.8386 31.6043 44 33.9891 44 36.7273C44 40.7439 35.0457 44 24 44C12.9543 44 4 40.7439 4 36.7273C4 33.9891 8.16144 31.6043 14.31 30.3636C8.16144 29.123 4 26.7382 4 24C4 21.2618 8.16144 18.877 14.31 17.6364C8.16144 16.3957 4 14.0109 4 11.2727C4 7.25611 12.9543 4 24 4C35.0457 4 44 7.25611 44 11.2727Z" fill="currentColor"></path>
              </svg>
            </div>
            <h2 className="text-xl font-bold">Lsx wholesale</h2>
          </div>
          <div className="flex flex-1 flex-col justify-between">
            <nav className="flex flex-col gap-2 mt-6">
              {filteredNavItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveNav(item.id)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${activeNav === item.id
                    ? "bg-primary/20 text-primary"
                    : "text-text-secondary-dark hover:bg-primary/10 hover:text-text-primary-dark"
                    }`}
                >
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <p className="text-sm font-medium">{item.label}</p>
                </button>
              ))}
            </nav>
            <div className="flex flex-col gap-4">
              <div className="h-px bg-border-dark"></div>
              <Link href="/" target="_blank" className="flex items-center gap-3 rounded-lg px-3 py-2 text-text-secondary-dark hover:bg-primary/10 hover:text-text-primary-dark">
                <span className="material-symbols-outlined">public</span>
                <p className="text-sm font-medium">返回網站</p>
              </Link>
              <Link href="/" className="flex items-center gap-3 rounded-lg px-3 py-2 text-text-secondary-dark hover:bg-primary/10 hover:text-text-primary-dark">
                <span className="material-symbols-outlined">logout</span>
                <p className="text-sm font-medium">登出</p>
              </Link>
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto">
          <div className="p-6 md:p-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-text-primary-light">子帳管理</h1>
                <p className="text-text-secondary-light">新增與管理後台子帳戶及其權限</p>
              </div>
              <button
                onClick={() => {
                  setEditingSubAccount(null);
                  setSubAccountForm({ email: "", password: "", name: "", permissions: [] });
                  setShowSubAccountModal(true);
                }}
                className="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary/90"
              >
                新增子帳戶
              </button>
            </div>

            <div className="bg-white rounded-xl border border-border-light overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-border-light">
                  <tr>
                    <th className="px-6 py-3 text-sm font-medium text-text-secondary-light">姓名</th>
                    <th className="px-6 py-3 text-sm font-medium text-text-secondary-light">Email</th>
                    <th className="px-6 py-3 text-sm font-medium text-text-secondary-light">權限數量</th>
                    <th className="px-6 py-3 text-sm font-medium text-text-secondary-light">建立時間</th>
                    <th className="px-6 py-3 text-sm font-medium text-text-secondary-light">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light">
                  {subAccounts.map((account) => (
                    <tr key={account.user_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-text-primary-light">{account.name}</td>
                      <td className="px-6 py-4 text-sm text-text-secondary-light">{account.email}</td>
                      <td className="px-6 py-4 text-sm text-text-secondary-light">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                          {account.permissions?.length || 0} 項
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-text-secondary-light">
                        {new Date(account.created_at).toLocaleDateString("zh-TW")}
                      </td>
                      <td className="px-6 py-4 text-sm flex gap-3">
                        <button
                          onClick={() => {
                            setEditingSubAccount(account);
                            setSubAccountForm({
                              email: account.email,
                              password: "",
                              name: account.name,
                              permissions: account.permissions || [],
                            });
                            setShowSubAccountModal(true);
                          }}
                          className="text-primary hover:underline"
                        >
                          編輯
                        </button>
                        <button
                          onClick={() => handleDeleteSubAccount(account.user_id)}
                          className="text-danger hover:underline"
                        >
                          刪除
                        </button>
                      </td>
                    </tr>
                  ))}
                  {subAccounts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-text-secondary-light">
                        暫無子帳戶
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {showSubAccountModal && renderSubAccountModal()}
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background-light">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col bg-sidebar-dark text-text-primary-dark p-4">
        <div className="flex items-center gap-3 p-4">
          <div className="size-8 text-primary">
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path d="M44 11.2727C44 14.0109 39.8386 16.3957 33.69 17.6364C39.8386 18.877 44 21.2618 44 24C44 26.7382 39.8386 29.123 33.69 30.3636C39.8386 31.6043 44 33.9891 44 36.7273C44 40.7439 35.0457 44 24 44C12.9543 44 4 40.7439 4 36.7273C4 33.9891 8.16144 31.6043 14.31 30.3636C8.16144 29.123 4 26.7382 4 24C4 21.2618 8.16144 18.877 14.31 17.6364C8.16144 16.3957 4 14.0109 4 11.2727C4 7.25611 12.9543 4 24 4C35.0457 4 44 7.25611 44 11.2727Z" fill="currentColor"></path>
            </svg>
          </div>
          <h2 className="text-xl font-bold">Lsx wholesale</h2>
        </div>

        <div className="flex flex-1 flex-col justify-between">
          <nav className="flex flex-col gap-2 mt-6">
            {filteredNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${activeNav === item.id
                  ? "bg-primary/20 text-primary"
                  : "text-text-secondary-dark hover:bg-primary/10 hover:text-text-primary-dark"
                  }`}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <p className="text-sm font-medium">{item.label}</p>
              </button>
            ))}
          </nav>

          <div className="flex flex-col gap-4">
            <div className="h-px bg-border-dark"></div>
            <div className="flex items-center gap-3">
              <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10" style={{ backgroundColor: "#718096" }}></div>
              <div className="flex flex-col">
                <h1 className="text-base font-medium text-text-primary-dark">管理員</h1>
                <p className="text-sm text-text-secondary-dark">系統管理員</p>
              </div>
            </div>
            <Link href="/" target="_blank" className="flex items-center gap-3 rounded-lg px-3 py-2 text-text-secondary-dark hover:bg-primary/10 hover:text-text-primary-dark">
              <span className="material-symbols-outlined">public</span>
              <p className="text-sm font-medium">返回網站</p>
            </Link>
            <Link href="/" className="flex items-center gap-3 rounded-lg px-3 py-2 text-text-secondary-dark hover:bg-primary/10 hover:text-text-primary-dark">
              <span className="material-symbols-outlined">logout</span>
              <p className="text-sm font-medium">登出</p>
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Top Navigation */}
        <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-border-light px-10 py-4 sticky top-0 z-10 bg-card-light">
          <label className="relative flex items-center min-w-40 h-10! max-w-sm">
            <span className="material-symbols-outlined absolute left-3 text-text-secondary-light">search</span>
            <input
              type="text"
              placeholder="搜尋..."
              className="form-input h-full w-full rounded-lg border border-border-light bg-background-light px-10 text-base text-text-primary-light placeholder:text-text-secondary-light focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </label>
          <div className="flex items-center gap-4">
            <button className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-text-secondary-light hover:bg-primary/10 hover:text-primary">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-text-secondary-light hover:bg-primary/10 hover:text-primary">
              <span className="material-symbols-outlined">help</span>
            </button>
            <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10" style={{ backgroundColor: "#E2E8F0" }}></div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6 md:p-10 overflow-y-auto">
          {/* Tabs */}
          {activeNav === "announcements" && (
            <div className="mb-6">
              <div className="flex gap-4 border-b border-border-light">
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setFormData({ title: "", content: "" });
                  }}
                  className={`px-4 py-2 font-medium border-b-2 transition-colors ${!showForm
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
                  className={`px-4 py-2 font-medium border-b-2 transition-colors ${showForm && !editingId
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
          )}

          {/* Page Heading */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-3xl font-bold text-text-primary-light">
                {activeNav === "announcements"
                  ? "公告管理"
                  : activeNav === "categories"
                    ? "分類管理"
                    : activeNav === "crawler"
                      ? "爬蟲導入"
                      : activeNav === "members"
                        ? "會員管理"
                        : activeNav === "orders"
                          ? "訂單管理"
                          : activeNav === "upgrade_settings"
                            ? "批發升級申請資格設定"
                            : activeNav === "sub_accounts"
                              ? "子帳戶管理"
                              : "儀表看板"}
              </p>
              <p className="text-base text-text-secondary-light">
                {activeNav === "announcements"
                  ? "管理和編輯公告內容"
                  : activeNav === "categories"
                    ? "管理商品分類（L1/L2/L3）與標籤"
                    : activeNav === "crawler"
                      ? "上架前資料檢視與轉換（JSON / Excel 匯入、匯率換算、利潤率）"
                      : activeNav === "members"
                        ? "管理會員資料、會員資格與錢包儲值"
                        : activeNav === "orders"
                          ? "查看與管理會員訂單"
                          : activeNav === "hot_products"
                            ? "管理首頁與專區顯示的熱銷商品"
                            : activeNav === "upgrade_settings"
                              ? "管理會員升級為批發會員的申請資格、銀行帳號與代理費金額"
                              : activeNav === "sub_accounts"
                                ? "新增與管理後台子帳戶及其權限"
                                : "歡迎回來，以下是您商店活動的摘要。"}
              </p>
            </div>
            {activeNav === "dashboard" && (
              <button className="flex h-10 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg bg-primary px-5 text-sm font-bold text-white">
                <span className="material-symbols-outlined">add</span>
                <span>建立報告</span>
              </button>
            )}
          </div>

          {/* Categories Management */}
          {activeNav === "categories" && (
            <div className="py-6 space-y-6">
              {/* 分類管理標題 + 說明按鈕 */}
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

              {/* 三欄：L1 / L2 / L3 */}
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

              {/* Category Relations */}
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

              {/* Category Form Modal */}
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

              {/* Icon Picker Modal */}
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

              {/* 分類使用說明 Modal */}
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
                      {/* 分類結構說明 */}
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

                      {/* 使用情境 1 */}
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

                      {/* 使用情境 2 */}
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

                      {/* 使用情境 3 */}
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

                      {/* 父子關係說明 */}
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

              {/* Tags Management */}
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


              {/* Tag Form Modal */}
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
          )}

          {/* Crawler Import - 上架前資料檢視 */}
          {activeNav === "crawler" && (
            <div className="py-6 space-y-6">
              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3">
                <input id="crawler-file" type="file" accept=".json,.xlsx,.xls" className="hidden" onChange={handleFileChange} />
                <label htmlFor="crawler-file" className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90">
                  <span className="material-symbols-outlined text-white">upload_file</span>
                  <span>選擇檔案</span>
                </label>
                <button onClick={() => setShowSettings((s) => !s)} className="inline-flex items-center gap-2 rounded-lg border border-border-light bg-card-light px-4 py-2 text-sm font-medium text-text-primary-light hover:bg-primary/10">
                  <span className="material-symbols-outlined">tune</span>
                  匯率設定
                </button>
                <div className="text-sm text-text-secondary-light">
                  已載入：<span className="font-medium text-text-primary-light">{crawlerProducts.length}</span> 筆，
                  顯示：<span className="font-medium text-text-primary-light">{crawlerFiltered.length}</span> 筆
                </div>
              </div>

              {/* Settings */}
              {showSettings && (
                <div className="flex flex-wrap items-end gap-4 rounded-xl border border-border-light bg-card-light p-4">
                  <div className="flex flex-col">
                    <label className="text-xs text-text-secondary-light">JPY → TWD</label>
                    <input type="number" step="0.001" value={exchangeRates.jpy_to_twd}
                      onChange={(e) => setExchangeRates({ ...exchangeRates, jpy_to_twd: Number(e.target.value) })}
                      className="mt-1 w-40 rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs text-text-secondary-light">KRW → TWD</label>
                    <input type="number" step="0.0001" value={exchangeRates.krw_to_twd}
                      onChange={(e) => setExchangeRates({ ...exchangeRates, krw_to_twd: Number(e.target.value) })}
                      className="mt-1 w-40 rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs text-text-secondary-light">利潤率 %</label>
                    <input type="number" step="1" value={exchangeRates.profitMargin}
                      onChange={(e) => setExchangeRates({ ...exchangeRates, profitMargin: Number(e.target.value) })}
                      className="mt-1 w-32 rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
                  </div>
                  <div className="ml-auto flex gap-2">
                    <button onClick={saveSettings} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90">保存</button>
                    <button onClick={resetSettings} className="rounded-lg border border-border-light bg-card-light px-4 py-2 text-sm font-medium hover:bg-primary/10">重置</button>
                  </div>
                </div>
              )}

              {/* 上架前：預設分類與標籤 */}
              <div className="rounded-xl border border-border-light bg-card-light p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-text-primary-light">上架前：預設分類與標籤</h3>
                    <p className="text-xs text-text-secondary-light mt-1">必須選擇 L1 和 L2，L3 可選</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-text-primary-light mb-1">L1</label>
                    <select
                      value={selectedCrawlerL1 ?? ""}
                      onChange={(e) => setSelectedCrawlerL1(e.target.value ? Number(e.target.value) : null)}
                      className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm"
                    >
                      <option value="">未選擇</option>
                      {categories
                        .filter((c) => c.level === 1)
                        .sort((a, b) => a.sort - b.sort)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.slug})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary-light mb-1">L2</label>
                    <select
                      value={selectedCrawlerL2 ?? ""}
                      onChange={(e) => setSelectedCrawlerL2(e.target.value ? Number(e.target.value) : null)}
                      className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm"
                    >
                      <option value="">未選擇</option>
                      {categories
                        .filter((c) => c.level === 2)
                        .filter((l2) => !selectedCrawlerL1 || categoryRelations.some((r: any) => r.parent_category_id === selectedCrawlerL1 && r.child_category_id === l2.id))
                        .sort((a, b) => a.sort - b.sort)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.slug})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary-light mb-1">L3</label>
                    <select
                      value={selectedCrawlerL3 ?? ""}
                      onChange={(e) => setSelectedCrawlerL3(e.target.value ? Number(e.target.value) : null)}
                      className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm"
                    >
                      <option value="">未選擇</option>
                      {categories
                        .filter((c) => c.level === 3)
                        .filter((l3) => !selectedCrawlerL2 || categoryRelations.some((r: any) => r.parent_category_id === selectedCrawlerL2 && r.child_category_id === l3.id))
                        .sort((a, b) => a.sort - b.sort)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.slug})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-sm font-medium text-text-primary-light mb-2">標籤（可多選）</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                    {tags
                      .sort((a, b) => a.sort - b.sort)
                      .map((tag) => (
                        <label key={tag.id} className="flex items-center gap-2 rounded-lg border border-border-light bg-background-light px-3 py-2">
                          <input
                            type="checkbox"
                            checked={selectedCrawlerTags.includes(tag.id)}
                            onChange={(e) => {
                              setSelectedCrawlerTags((prev) =>
                                e.target.checked ? [...prev, tag.id] : prev.filter((id) => id !== tag.id)
                              );
                            }}
                          />
                          <span className="text-sm text-text-primary-light">{tag.name}</span>
                          <span className="text-xs text-text-secondary-light">{tag.slug}</span>
                        </label>
                      ))}
                    {tags.length === 0 && <p className="text-sm text-text-secondary-light">
                      尚無標籤
                    </p>}
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <input
                  value={crawlerSearch}
                  onChange={(e) => setCrawlerSearch(e.target.value)}
                  placeholder="搜尋代碼 / 標題 / 描述..."
                  className="flex-1 min-w-60 rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm"
                />
                <select value={crawlerSort} onChange={(e) => setCrawlerSort(e.target.value)} className="rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm">
                  <option value="default">排序：預設</option>
                  <option value="code-asc">代碼 A → Z</option>
                  <option value="code-desc">代碼 Z → A</option>
                  <option value="price-asc">價格 低 → 高</option>
                  <option value="price-desc">價格 高 → 低</option>
                </select>
                <select value={priceSourceMode} onChange={(e) => setPriceSourceMode(e.target.value as any)} className="rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm">
                  <option value="auto">價格來源：自動</option>
                  <option value="jpy">強制 JPY</option>
                  <option value="krw">強制 KRW</option>
                </select>
              </div>

              {/* 批量操作工具欄 */}
              {crawlerFiltered.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border-light bg-card-light p-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCrawlerProducts.size === crawlerFiltered.length && crawlerFiltered.length > 0}
                      onChange={toggleSelectAllCrawler}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium text-text-primary-light">
                      全選 ({selectedCrawlerProducts.size}/{crawlerFiltered.length})
                    </span>
                  </label>

                  {selectedCrawlerProducts.size > 0 && (
                    <>
                      <div className="h-6 w-px bg-border-light"></div>
                      <button
                        onClick={() => setShowBatchPriceAdjust(true)}
                        className="inline-flex items-center gap-2 rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm font-medium text-text-primary-light hover:bg-primary/10"
                      >
                        <span className="material-symbols-outlined text-base">price_change</span>
                        批量調整價格
                      </button>
                      <button
                        onClick={batchPublish}
                        disabled={batchPublishing}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90 disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-base">cloud_upload</span>
                        批量上架 ({selectedCrawlerProducts.size})
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {crawlerFiltered.map((p, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col overflow-hidden rounded-xl border-2 transition-colors ${selectedCrawlerProducts.has(idx)
                      ? "border-primary bg-primary/5"
                      : "border-border-light bg-card-light"
                      }`}
                  >
                    <div className="relative aspect-square w-full bg-gray-100 overflow-hidden">
                      <img src={p.images?.[0] || "https://placehold.co/600x600?text=No+Image"} alt={p.title} className="h-full w-full object-cover" />
                      <label className="absolute top-2 left-2 flex items-center justify-center w-6 h-6 bg-white rounded-md border-2 border-gray-300 cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={selectedCrawlerProducts.has(idx)}
                          onChange={() => toggleSelectProduct(idx)}
                          className="w-4 h-4 cursor-pointer"
                        />
                      </label>
                    </div>
                    <div className="p-3">
                      <div className="text-xs text-text-secondary-light">#{String(p.productCode)}</div>
                      <div className="mt-1 line-clamp-2 text-sm font-semibold text-text-primary-light">{p.title}</div>

                      {/* 成本價 */}
                      <div className="mt-2 flex items-baseline justify-between">
                        <div className="text-base font-bold text-text-primary-light">NT${getPriceTWD(p).toFixed(0)}</div>
                        <div className="text-xs text-text-secondary-light">
                          {p.wholesalePriceJPY ? `¥${Number(p.wholesalePriceJPY).toLocaleString()}` : p.wholesalePriceKRW ? `₩${Number(p.wholesalePriceKRW).toLocaleString()}` : "-"}
                        </div>
                      </div>

                      {/* 批發價和零售價預覽 */}
                      {(p._wholesaleAdjust !== undefined || p._retailAdjust !== undefined) && (
                        <div className="mt-2 rounded-lg bg-blue-50 border border-blue-200 p-2">
                          <div className="text-xs text-blue-900">
                            {p._wholesaleAdjust !== undefined && p._wholesaleAdjust !== 0 && (
                              <div>批發: {p._adjustMode === "fixed" ? `${p._wholesaleAdjust > 0 ? "+" : ""}${p._wholesaleAdjust}` : `${p._wholesaleAdjust > 0 ? "+" : ""}${p._wholesaleAdjust}%`}</div>
                            )}
                            {p._retailAdjust !== undefined && p._retailAdjust !== 0 && (
                              <div>零售: {p._adjustMode === "fixed" ? `${p._retailAdjust > 0 ? "+" : ""}${p._retailAdjust}` : `${p._retailAdjust > 0 ? "+" : ""}${p._retailAdjust}%`}</div>
                            )}
                          </div>
                        </div>
                      )}

                      {p.url && (
                        <a href={p.url} target="_blank" className="mt-2 inline-block text-xs text-primary hover:underline">來源連結</a>
                      )}
                      <div className="mt-3">
                        <button onClick={() => openPublish(p)} className="w-full px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90">
                          上架
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {crawlerFiltered.length === 0 && (
                  <div className="col-span-full text-sm text-text-secondary-light">尚未載入資料或無符合項目</div>
                )}
              </div>
              {/* 上架商品 Modal */}
              {showPublish && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                  <div className="w-full max-w-3xl rounded-xl border border-border-light bg-card-light p-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-text-primary-light">上架商品</h3>
                      <button className="text-text-secondary-light" onClick={() => setShowPublish(false)}>關閉</button>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
                      {/* 左：圖片與排序 */}
                      <div>
                        <div className="text-sm font-medium mb-2">圖片（可調整順序/勾選要上架的圖）</div>
                        <div className="space-y-3 max-h-[50vh] overflow-auto pr-1">
                          {publishForm.image_urls.map((url, i) => (
                            <div key={url} className="flex items-center gap-2">
                              <input type="checkbox" checked={publishForm.image_urls.includes(url)} onChange={() => toggleImage(url)} />
                              <img src={url} alt="img" className="h-14 w-14 object-cover border border-border-light" />
                              <div className="ml-auto flex gap-1">
                                <button className="px-2 py-1 border border-border-light text-xs" onClick={() => moveImage(i, -1)}>上移</button>
                                <button className="px-2 py-1 border border-border-light text-xs" onClick={() => moveImage(i, +1)}>下移</button>
                              </div>
                            </div>
                          ))}
                          {publishForm.image_urls.length === 0 && (
                            <div className="text-sm text-text-secondary-light">此商品無圖片</div>
                          )}
                        </div>
                      </div>

                      {/* 右：基本資料 */}
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm text-text-secondary-light">SKU</label>
                          <input value={publishForm.sku} onChange={(e) => setPublishForm({ ...publishForm, sku: e.target.value })} className="mt-1 w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="text-sm text-text-secondary-light">標題</label>
                          <input value={publishForm.title} onChange={(e) => setPublishForm({ ...publishForm, title: e.target.value })} className="mt-1 w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="text-sm text-text-secondary-light">描述</label>
                          <textarea value={publishForm.description} onChange={(e) => setPublishForm({ ...publishForm, description: e.target.value })} className="mt-1 w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm min-h-24" />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-text-primary-light">價格設定 (台幣整數)</label>
                            <button
                              type="button"
                              onClick={recalculatePrices}
                              className="px-3 py-1 text-xs bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                            >
                              重新計算 (+25%/+35%)
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-sm text-text-secondary-light">成本</label>
                              <input type="number" step={1} min={0} value={publishForm.cost_twd} onChange={(e) => setPublishForm({ ...publishForm, cost_twd: Math.max(0, Math.floor(Number(e.target.value || 0))) })} className="mt-1 w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
                            </div>
                            <div>
                              <label className="text-sm text-text-secondary-light">批發價 (+25%)</label>
                              <input type="number" step={1} min={0} value={publishForm.wholesale_price_twd} onChange={(e) => setPublishForm({ ...publishForm, wholesale_price_twd: Math.max(0, Math.floor(Number(e.target.value || 0))) })} className="mt-1 w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
                            </div>
                            <div>
                              <label className="text-sm text-text-secondary-light">零售價 (+35%)</label>
                              <input type="number" step={1} min={0} value={publishForm.retail_price_twd} onChange={(e) => setPublishForm({ ...publishForm, retail_price_twd: Math.max(0, Math.floor(Number(e.target.value || 0))) })} className="mt-1 w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
                            </div>
                          </div>
                          <div className="mt-1 text-xs text-text-secondary-light">
                            預設：批發價 = 成本 × 1.25，零售價 = 成本 × 1.35，可手動調整
                          </div>
                        </div>
                        {/* 分類選擇 */}
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-sm text-text-secondary-light">L1</label>
                            <select value={publishForm.l1Id ?? ""} onChange={(e) => setPublishForm({ ...publishForm, l1Id: e.target.value ? Number(e.target.value) : null, l2Id: null, l3Id: null })} className="mt-1 w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm">
                              <option value="">未選擇</option>
                              {categories.filter(c => c.level === 1).sort((a, b) => a.sort - b.sort).map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-sm text-text-secondary-light">L2</label>
                            <select value={publishForm.l2Id ?? ""} onChange={(e) => setPublishForm({ ...publishForm, l2Id: e.target.value ? Number(e.target.value) : null, l3Id: null })} className="mt-1 w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm">
                              <option value="">未選擇</option>
                              {categories.filter(c => c.level === 2)
                                .filter(l2 => !publishForm.l1Id || categoryRelations.some((r: any) => r.parent_category_id === publishForm.l1Id && r.child_category_id === l2.id))
                                .sort((a, b) => a.sort - b.sort)
                                .map(c => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-sm text-text-secondary-light">L3</label>
                            <select value={publishForm.l3Id ?? ""} onChange={(e) => setPublishForm({ ...publishForm, l3Id: e.target.value ? Number(e.target.value) : null })} className="mt-1 w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm">
                              <option value="">未選擇</option>
                              {categories.filter(c => c.level === 3)
                                .filter(l3 => !publishForm.l2Id || categoryRelations.some((r: any) => r.parent_category_id === publishForm.l2Id && r.child_category_id === l3.id))
                                .sort((a, b) => a.sort - b.sort)
                                .map(c => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                          </div>
                        </div>
                        {/* 標籤選擇（共用選擇狀態） */}
                        <div>
                          <div className="text-sm text-text-secondary-light mb-1">標籤</div>
                          <div className="flex flex-wrap gap-2">
                            {tags.map((t) => (
                              <label key={t.id} className="inline-flex items-center gap-1 text-sm">
                                <input type="checkbox" checked={selectedCrawlerTags.includes(t.id)} onChange={(e) => {
                                  if (e.target.checked) setSelectedCrawlerTags([...selectedCrawlerTags, t.id]);
                                  else setSelectedCrawlerTags(selectedCrawlerTags.filter(x => x !== t.id));
                                }} />
                                <span>{t.name}</span>
                              </label>
                            ))}
                            {tags.length === 0 && <div className="text-xs text-text-secondary-light">尚無標籤</div>}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                      <button disabled={publishing} onClick={() => setShowPublish(false)} className="px-4 py-2 rounded-lg border border-border-light text-sm disabled:opacity-50">取消</button>
                      <button disabled={publishing} onClick={publishNow} className="px-4 py-2 rounded-lg bg-primary text-white text-sm disabled:opacity-50">確認上架</button>
                    </div>
                  </div>
                </div>
              )}

              {/* 批量調整價格 Modal */}
              {showBatchPriceAdjust && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                  <div className="w-full max-w-2xl rounded-xl border border-border-light bg-card-light p-6 max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-text-primary-light">批量調整價格</h3>
                      <button className="text-text-secondary-light" onClick={() => setShowBatchPriceAdjust(false)}>
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    </div>

                    <div className="space-y-4">
                      {/* 調整方式 */}
                      <div>
                        <label className="block text-sm font-medium text-text-primary-light mb-2">調整方式</label>
                        <div className="flex gap-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="adjust-mode"
                              value="fixed"
                              checked={batchPriceAdjustMode === "fixed"}
                              onChange={(e) => setBatchPriceAdjustMode(e.target.value as any)}
                              className="w-4 h-4"
                            />
                            <span className="text-sm">固定金額 (NT$)</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="adjust-mode"
                              value="percentage"
                              checked={batchPriceAdjustMode === "percentage"}
                              onChange={(e) => setBatchPriceAdjustMode(e.target.value as any)}
                              className="w-4 h-4"
                            />
                            <span className="text-sm">百分比 (%)</span>
                          </label>
                        </div>
                      </div>

                      {/* 成本價調整 */}
                      <div className="rounded-lg border border-border-light bg-background-light p-4">
                        <label className="block text-sm font-medium text-text-primary-light mb-2">
                          成本價調整
                        </label>
                        <input
                          type="number"
                          step={batchPriceAdjustMode === "fixed" ? "1" : "0.1"}
                          value={batchPriceAdjustCost}
                          onChange={(e) => setBatchPriceAdjustCost(Number(e.target.value))}
                          placeholder={batchPriceAdjustMode === "fixed" ? "例：100" : "例：10"}
                          className="w-full rounded-lg border border-border-light bg-card-light px-3 py-2 text-sm"
                        />
                        <p className="mt-2 text-xs text-text-secondary-light">
                          {batchPriceAdjustMode === "fixed"
                            ? `${batchPriceAdjustCost >= 0 ? "增加" : "減少"} NT$${Math.abs(batchPriceAdjustCost)}`
                            : `${batchPriceAdjustCost >= 0 ? "增加" : "減少"} ${Math.abs(batchPriceAdjustCost)}%`}
                        </p>
                      </div>

                      {/* 批發價調整 */}
                      <div className="rounded-lg border border-border-light bg-background-light p-4">
                        <label className="block text-sm font-medium text-text-primary-light mb-2">
                          批發價調整
                        </label>
                        <input
                          type="number"
                          step={batchPriceAdjustMode === "fixed" ? "1" : "0.1"}
                          value={batchPriceAdjustWholesale}
                          onChange={(e) => setBatchPriceAdjustWholesale(Number(e.target.value))}
                          placeholder={batchPriceAdjustMode === "fixed" ? "例：100" : "例：10"}
                          className="w-full rounded-lg border border-border-light bg-card-light px-3 py-2 text-sm"
                        />
                        <p className="mt-2 text-xs text-text-secondary-light">
                          {batchPriceAdjustMode === "fixed"
                            ? `${batchPriceAdjustWholesale >= 0 ? "增加" : "減少"} NT$${Math.abs(batchPriceAdjustWholesale)}`
                            : `${batchPriceAdjustWholesale >= 0 ? "增加" : "減少"} ${Math.abs(batchPriceAdjustWholesale)}%`}
                        </p>
                      </div>

                      {/* 零售價調整 */}
                      <div className="rounded-lg border border-border-light bg-background-light p-4">
                        <label className="block text-sm font-medium text-text-primary-light mb-2">
                          零售價調整
                        </label>
                        <input
                          type="number"
                          step={batchPriceAdjustMode === "fixed" ? "1" : "0.1"}
                          value={batchPriceAdjustRetail}
                          onChange={(e) => setBatchPriceAdjustRetail(Number(e.target.value))}
                          placeholder={batchPriceAdjustMode === "fixed" ? "例：100" : "例：10"}
                          className="w-full rounded-lg border border-border-light bg-card-light px-3 py-2 text-sm"
                        />
                        <p className="mt-2 text-xs text-text-secondary-light">
                          {batchPriceAdjustMode === "fixed"
                            ? `${batchPriceAdjustRetail >= 0 ? "增加" : "減少"} NT$${Math.abs(batchPriceAdjustRetail)}`
                            : `${batchPriceAdjustRetail >= 0 ? "增加" : "減少"} ${Math.abs(batchPriceAdjustRetail)}%`}
                        </p>
                      </div>

                      {/* 提示 */}
                      <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                        <p className="text-xs text-blue-900">
                          將對選中的 <span className="font-bold">{selectedCrawlerProducts.size}</span> 件商品進行價格調整。
                          {(batchPriceAdjustCost !== 0 || batchPriceAdjustWholesale !== 0 || batchPriceAdjustRetail !== 0) && (
                            <span>
                              <br />調整內容：
                              {batchPriceAdjustCost !== 0 && <span>成本價 {batchPriceAdjustMode === "fixed" ? `${batchPriceAdjustCost > 0 ? "+" : ""}${batchPriceAdjustCost}` : `${batchPriceAdjustCost > 0 ? "+" : ""}${batchPriceAdjustCost}%`}</span>}
                              {batchPriceAdjustCost !== 0 && batchPriceAdjustWholesale !== 0 && <span>、</span>}
                              {batchPriceAdjustWholesale !== 0 && <span>批發價 {batchPriceAdjustMode === "fixed" ? `${batchPriceAdjustWholesale > 0 ? "+" : ""}${batchPriceAdjustWholesale}` : `${batchPriceAdjustWholesale > 0 ? "+" : ""}${batchPriceAdjustWholesale}%`}</span>}
                              {(batchPriceAdjustCost !== 0 || batchPriceAdjustWholesale !== 0) && batchPriceAdjustRetail !== 0 && <span>、</span>}
                              {batchPriceAdjustRetail !== 0 && <span>零售價 {batchPriceAdjustMode === "fixed" ? `${batchPriceAdjustRetail > 0 ? "+" : ""}${batchPriceAdjustRetail}` : `${batchPriceAdjustRetail > 0 ? "+" : ""}${batchPriceAdjustRetail}%`}</span>}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                      <button
                        onClick={() => {
                          setShowBatchPriceAdjust(false);
                          setBatchPriceAdjustCost(0);
                          setBatchPriceAdjustWholesale(0);
                          setBatchPriceAdjustRetail(0);
                        }}
                        className="px-4 py-2 rounded-lg border border-border-light text-sm font-medium text-text-primary-light hover:bg-background-light"
                      >
                        取消
                      </button>
                      <button
                        onClick={applyBatchPriceAdjust}
                        className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90"
                      >
                        確認調整
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* XLSX CDN */}
              <Script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js" strategy="afterInteractive" />
            </div>
          )}

          {/* Products Management */}
          {activeNav === "products" && (
            <div className="py-6 space-y-6">
              {/* 標題 */}
              <h2 className="text-2xl font-bold text-text-primary-light">商品管理</h2>

              {/* L1 分類分頁標籤 */}
              <div className="flex gap-2 border-b border-border-light overflow-x-auto pb-2">
                <button
                  onClick={() => {
                    setSelectedProductL1(null);
                    setProductPage(0);
                    fetchProducts(0, null);
                  }}
                  className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${selectedProductL1 === null
                    ? "border-primary text-primary"
                    : "border-transparent text-text-secondary-light hover:text-text-primary-light"
                    }`}
                >
                  全部
                </button>
                {categories
                  .filter((c) => c.level === 1)
                  .sort((a, b) => a.sort - b.sort)
                  .map((l1) => (
                    <button
                      key={l1.id}
                      onClick={() => {
                        setSelectedProductL1(l1.id);
                        setProductPage(0);
                        fetchProducts(0, l1.id);
                      }}
                      className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${selectedProductL1 === l1.id
                        ? "border-primary text-primary"
                        : "border-transparent text-text-secondary-light hover:text-text-primary-light"
                        }`}
                    >
                      {l1.name}
                    </button>
                  ))}
              </div>

              {/* 搜尋欄 */}
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="搜尋商品代碼或名稱..."
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setProductPage(0);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      fetchProducts(0, selectedProductL1);
                    }
                  }}
                  className="flex-1 rounded-lg border border-border-light bg-background-light px-4 py-2 text-sm"
                />
                <button
                  onClick={() => fetchProducts(0, selectedProductL1)}
                  className="px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90"
                >
                  搜尋
                </button>
              </div>

              {/* 工具列：批量操作 */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-text-secondary-light">已選 {selectedProductIds.length} 項</p>
                <div className="flex gap-2">
                  <button onClick={() => batchUpdateStatus('published')} className="px-3 py-1 rounded-lg border border-border-light text-sm hover:bg-background-light">批量上架</button>
                  <button onClick={() => batchUpdateStatus('draft')} className="px-3 py-1 rounded-lg border border-border-light text-sm hover:bg-background-light">批量下架</button>
                  <button onClick={batchDelete} className="px-3 py-1 rounded-lg border border-danger text-danger text-sm hover:bg-danger/10">批量刪除</button>
                </div>
              </div>

              {/* 商品表格 */}
              <div className="rounded-xl border border-border-light bg-card-light overflow-hidden">
                <table className="w-full">
                  <thead className="bg-background-light border-b border-border-light">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-text-primary-light">
                        <input type="checkbox" checked={selectedProductIds.length === products.length && products.length > 0} onChange={toggleSelectAll} />
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-text-primary-light">商品代碼</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-text-primary-light">商品名稱</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-text-primary-light">零售價</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-text-primary-light">批發價</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-text-primary-light">成本</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-text-primary-light">狀態</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-text-primary-light">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productsLoading ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-text-secondary-light">


                          載入中...
                        </td>
                      </tr>
                    ) : products.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-text-secondary-light">
                          暫無商品
                        </td>
                      </tr>
                    ) : (
                      products.map((product) => (
                        <tr key={product.id} className="border-b border-border-light hover:bg-background-light">
                          <td className="px-4 py-3 text-sm"><input type="checkbox" checked={selectedProductIds.includes(product.id)} onChange={() => toggleSelectOne(product.id)} /></td>
                          <td className="px-4 py-3 text-sm text-text-primary-light">{product.sku}</td>
                          <td className="px-4 py-3 text-sm text-text-primary-light line-clamp-2">{product.title_zh || product.title_original || '-'}</td>
                          <td className="px-4 py-3 text-sm text-text-primary-light">NT${Number(product.retail_price_twd || 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-text-primary-light">NT${Number(product.wholesale_price_twd || 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-text-primary-light">NT${Number(product.cost_twd || 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${product.status === 'published'
                              ? "bg-success/20 text-success"
                              : "bg-danger/20 text-danger"
                              }`}>
                              {product.status === 'published' ? "上架" : "草稿"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm flex gap-3">
                            <button className="text-primary hover:underline" onClick={() => openEditProduct(product)}>編輯</button>
                            <button className="text-danger hover:underline" onClick={() => deleteProduct(product.id)}>刪除</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {/* 編輯商品 Modal */}
              {showProductEdit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                  <div className="w-full max-w-xl rounded-xl border border-border-light bg-card-light p-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-text-primary-light">編輯商品</h3>
                      <button onClick={() => setShowProductEdit(false)} className="text-text-secondary-light">關閉</button>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-4">
                      <div>
                        <label className="text-sm text-text-secondary-light">SKU</label>
                        <input value={productEditForm.sku} onChange={(e) => setProductEditForm({ ...productEditForm, sku: e.target.value })} className="mt-1 w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-sm text-text-secondary-light">商品名稱</label>
                        <input value={productEditForm.title_zh} onChange={(e) => setProductEditForm({ ...productEditForm, title_zh: e.target.value })} className="mt-1 w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium text-text-primary-light">價格設定 (台幣整數)</label>
                          <button
                            type="button"
                            onClick={recalculateEditPrices}
                            className="px-3 py-1 text-xs bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                          >
                            重新計算 (+25%/+35%)
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="text-sm text-text-secondary-light">成本 (TWD)</label>
                            <input type="number" step={1} min={0} value={productEditForm.cost_twd} onChange={(e) => setProductEditForm({ ...productEditForm, cost_twd: Math.max(0, Math.floor(Number(e.target.value || 0))) })} className="mt-1 w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
                          </div>
                          <div>
                            <label className="text-sm text-text-secondary-light">批發價 (+25%)</label>
                            <input type="number" step={1} min={0} value={productEditForm.wholesale_price_twd} onChange={(e) => setProductEditForm({ ...productEditForm, wholesale_price_twd: Math.max(0, Math.floor(Number(e.target.value || 0))) })} className="mt-1 w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
                          </div>
                          <div>
                            <label className="text-sm text-text-secondary-light">零售價 (+35%)</label>
                            <input type="number" step={1} min={0} value={productEditForm.retail_price_twd} onChange={(e) => setProductEditForm({ ...productEditForm, retail_price_twd: Math.max(0, Math.floor(Number(e.target.value || 0))) })} className="mt-1 w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
                          </div>
                        </div>
                        <div className="mt-1 text-xs text-text-secondary-light">
                          預設：批發價 = 成本 × 1.25，零售價 = 成本 × 1.35，可手動調整
                        </div>
                      </div>
                      <div>
                        <label className="text-sm text-text-secondary-light">狀態</label>
                        <select value={productEditForm.status} onChange={(e) => setProductEditForm({ ...productEditForm, status: e.target.value as any })} className="mt-1 w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm">
                          <option value="published">上架</option>
                          <option value="draft">草稿</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                      <button onClick={() => setShowProductEdit(false)} className="px-4 py-2 rounded-lg border border-border-light text-sm">取消</button>
                      <button onClick={saveEditProduct} className="px-4 py-2 rounded-lg bg-primary text-white text-sm">保存</button>
                    </div>
                  </div>
                </div>
              )}


              {/* 分頁 */}
              {productTotal > pageSize && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-text-secondary-light">
                    共 {productTotal} 件商品，第 {productPage + 1} 頁
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => fetchProducts(productPage - 1, selectedProductL1)}
                      disabled={productPage === 0}
                      className="px-3 py-1 rounded-lg border border-border-light text-sm hover:bg-background-light disabled:opacity-50"
                    >
                      上一頁
                    </button>
                    <button
                      onClick={() => fetchProducts(productPage + 1, selectedProductL1)}
                      disabled={(productPage + 1) * pageSize >= productTotal}
                      className="px-3 py-1 rounded-lg border border-border-light text-sm hover:bg-background-light disabled:opacity-50"
                    >
                      下一頁
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}


          {/* 橫幅管理 */}
          {activeNav === "banners" && (
            <div className="py-6 space-y-6">
              <h2 className="text-2xl font-bold text-text-primary-light">橫幅管理</h2>

              {/* 內分頁：首頁/商品頁 */}
              <div className="flex gap-2 border-b border-border-light overflow-x-auto pb-2">
                <button
                  onClick={() => setBannerTab("index")}
                  className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${bannerTab === "index"
                    ? "border-primary text-primary"
                    : "border-transparent text-text-secondary-light hover:text-text-primary-light"
                    }`}
                >
                  首頁橫幅
                </button>
                <button
                  onClick={() => setBannerTab("products")}
                  className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${bannerTab === "products"
                    ? "border-primary text-primary"
                    : "border-transparent text-text-secondary-light hover:text-text-primary-light"
                    }`}
                >
                  商品頁橫幅
                </button>
              </div>

              {/* 首頁橫幅：輪播設定 */}
              {bannerTab === "index" && (
                <>
                  <div className="rounded-xl border border-border-light bg-card-light p-4">
                    <div className="flex items-end gap-3 flex-wrap">
                      <div>
                        <label className="text-sm text-text-secondary-light">輪播秒數</label>
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={indexInterval}
                          onChange={(e) => setIndexInterval(Math.max(1, Math.floor(Number(e.target.value || 1))))}
                          className="mt-1 w-32 rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm"
                        />
                      </div>
                      <button onClick={saveIndexInterval} className="px-4 py-2 rounded-lg bg-primary text-white text-sm">保存輪播秒數</button>
                    </div>
                  </div>

                  {/* 新增首頁橫幅 */}
                  <div className="rounded-xl border border-border-light bg-card-light p-4">
                    <h3 className="text-lg font-bold text-text-primary-light mb-3">新增首頁橫幅</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm text-text-secondary-light">圖片網址</label>
                        <input value={newIndexBanner.image_url} onChange={(e) => setNewIndexBanner({ ...newIndexBanner, image_url: e.target.value })} className="mt-1 w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-sm text-text-secondary-light">連結（可選）</label>
                        <input value={newIndexBanner.link_url} onChange={(e) => setNewIndexBanner({ ...newIndexBanner, link_url: e.target.value })} className="mt-1 w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-sm text-text-secondary-light">標題（可選）</label>
                        <input value={newIndexBanner.title} onChange={(e) => setNewIndexBanner({ ...newIndexBanner, title: e.target.value })} className="mt-1 w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-sm text-text-secondary-light">描述（可選）</label>
                        <input value={newIndexBanner.description} onChange={(e) => setNewIndexBanner({ ...newIndexBanner, description: e.target.value })} className="mt-1 w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-sm text-text-secondary-light">排序（數字越小越前面）</label>
                        <input type="number" value={newIndexBanner.sort} onChange={(e) => setNewIndexBanner({ ...newIndexBanner, sort: Number(e.target.value || 0) })} className="mt-1 w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
                      </div>
                      <label className="mt-6 inline-flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={newIndexBanner.active} onChange={(e) => setNewIndexBanner({ ...newIndexBanner, active: e.target.checked })} />
                        啟用
                      </label>
                    </div>
                    <div className="mt-3">
                      <button onClick={createIndexBanner} className="px-4 py-2 rounded-lg bg-primary text-white text-sm">新增</button>
                    </div>
                  </div>

                  {/* 現有首頁橫幅 */}
                  <div className="rounded-xl border border-border-light bg-card-light p-4">
                    <h3 className="text-lg font-bold text-text-primary-light mb-3">現有橫幅</h3>
                    {bannerLoading ? (
                      <p className="text-text-secondary-light">載入中...</p>
                    ) : indexBanners.length === 0 ? (
                      <p className="text-text-secondary-light">暫無資料</p>
                    ) : (
                      <div className="space-y-4">
                        {indexBanners.map((b, idx) => (
                          <div key={b.id} className="flex gap-3 items-start">
                            <img src={b.image_url} alt="" className="h-16 w-28 object-cover border border-border-light bg-background-light" />
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                              <input value={b.image_url} onChange={(e) => setIndexBanners(prev => prev.map((x: any, i: number) => i === idx ? { ...x, image_url: e.target.value } : x))} placeholder="圖片網址" className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
                              <input value={b.title || ""} onChange={(e) => setIndexBanners(prev => prev.map((x: any, i: number) => i === idx ? { ...x, title: e.target.value } : x))} placeholder="標題（可選）" className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
                              <input value={b.description || ""} onChange={(e) => setIndexBanners(prev => prev.map((x: any, i: number) => i === idx ? { ...x, description: e.target.value } : x))} placeholder="描述（可選）" className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
                              <input value={b.link_url || ""} onChange={(e) => setIndexBanners(prev => prev.map((x: any, i: number) => i === idx ? { ...x, link_url: e.target.value } : x))} placeholder="連結（可選）" className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
                              <label className="inline-flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={!!b.active} onChange={(e) => setIndexBanners(prev => prev.map((x: any, i: number) => i === idx ? { ...x, active: e.target.checked } : x))} />
                                啟用
                              </label>
                            </div>
                            <div className="flex flex-col gap-2">
                              <button onClick={() => moveIndexOrder(idx, -1)} disabled={idx === 0} className="px-3 py-1 rounded-lg border border-border-light text-sm disabled:opacity-50">上移</button>
                              <button onClick={() => moveIndexOrder(idx, 1)} disabled={idx === indexBanners.length - 1} className="px-3 py-1 rounded-lg border border-border-light text-sm disabled:opacity-50">下移</button>
                              <button onClick={() => updateIndexBanner(b.id, { image_url: b.image_url, title: b.title, description: b.description, link_url: b.link_url, active: b.active })} className="px-3 py-1 rounded-lg bg-primary text-white text-sm">更新</button>
                              <button onClick={() => deleteIndexBanner(b.id)} className="px-3 py-1 rounded-lg border border-danger text-danger text-sm">刪除</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* 商品頁橫幅 */}
              {bannerTab === "products" && (
                <>
                  {/* 新增商品頁橫幅（僅圖片/排序/啟用） */}
                  <div className="rounded-xl border border-border-light bg-card-light p-4">
                    <h3 className="text-lg font-bold text-text-primary-light mb-3">新增商品頁橫幅</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm text-text-secondary-light">圖片網址</label>
                        <input value={newProductsBanner.image_url} onChange={(e) => setNewProductsBanner({ ...newProductsBanner, image_url: e.target.value })} className="mt-1 w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-sm text-text-secondary-light">排序（數字越小越前面）</label>
                        <input type="number" value={newProductsBanner.sort} onChange={(e) => setNewProductsBanner({ ...newProductsBanner, sort: Number(e.target.value || 0) })} className="mt-1 w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
                      </div>
                      <label className="mt-6 inline-flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={newProductsBanner.active} onChange={(e) => setNewProductsBanner({ ...newProductsBanner, active: e.target.checked })} />
                        啟用
                      </label>
                    </div>
                    <div className="mt-3">
                      <button onClick={createProductsBanner} className="px-4 py-2 rounded-lg bg-primary text-white text-sm">新增</button>
                    </div>
                  </div>

                  {/* 現有商品頁橫幅 */}
                  <div className="rounded-xl border border-border-light bg-card-light p-4">
                    <h3 className="text-lg font-bold text-text-primary-light mb-3">現有橫幅</h3>
                    {bannerLoading ? (
                      <p className="text-text-secondary-light">載入中...</p>
                    ) : productsBanners.length === 0 ? (
                      <p className="text-text-secondary-light">暫無資料</p>
                    ) : (
                      <div className="space-y-4">
                        {productsBanners.map((b, idx) => (
                          <div key={b.id} className="flex gap-3 items-start">
                            <img src={b.image_url} alt="" className="h-16 w-28 object-cover border border-border-light bg-background-light" />
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                              <input value={b.image_url} onChange={(e) => setProductsBanners(prev => prev.map((x: any, i: number) => i === idx ? { ...x, image_url: e.target.value } : x))} placeholder="圖片網址" className="w-full rounded-lg border border-border-light bg-background-light px-3 py-2 text-sm" />
                              <label className="inline-flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={!!b.active} onChange={(e) => setProductsBanners(prev => prev.map((x: any, i: number) => i === idx ? { ...x, active: e.target.checked } : x))} />
                                啟用
                              </label>
                            </div>
                            <div className="flex flex-col gap-2">
                              <button onClick={() => moveProductsOrder(idx, -1)} disabled={idx === 0} className="px-3 py-1 rounded-lg border border-border-light text-sm disabled:opacity-50">上移</button>
                              <button onClick={() => moveProductsOrder(idx, 1)} disabled={idx === productsBanners.length - 1} className="px-3 py-1 rounded-lg border border-border-light text-sm disabled:opacity-50">下移</button>
                              <button onClick={() => updateProductsBanner(b.id, { image_url: b.image_url, active: b.active })} className="px-3 py-1 rounded-lg bg-primary text-white text-sm">更新</button>
                              <button onClick={() => deleteProductsBanner(b.id)} className="px-3 py-1 rounded-lg border border-danger text-danger text-sm">刪除</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {activeNav === "announcements" ? (

            <div className="py-6">
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
                            <h3 className="text-lg font-bold text-text-primary-light">{announcement.title}</h3>
                            <p className="text-sm text-text-secondary-light mt-1">
                              {new Date(announcement.created_at).toLocaleDateString("zh-TW")}
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
                    <label className="block text-sm font-medium text-text-primary-light mb-2">標題</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="輸入公告標題"
                      className="w-full px-4 py-2 rounded-lg border border-border-light bg-background-light text-text-primary-light placeholder:text-text-secondary-light focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary-light mb-2">內容</label>
                    <textarea
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
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
          ) : activeNav === "orders" ? (
            // 訂單管理
            <div className="py-6 space-y-6">
              {/* 搜尋與篩選 */}
              <div className="flex flex-wrap gap-4">
                <input
                  type="text"
                  placeholder="搜尋訂單（訂單編號）"
                  value={ordersSearch}
                  onChange={(e) => setOrdersSearch(e.target.value)}
                  className="flex-1 min-w-[200px] px-4 py-2 border border-border-light rounded-lg"
                />
                <select
                  value={ordersStatusFilter}
                  onChange={(e) => setOrdersStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-border-light rounded-lg"
                >
                  <option value="">全部狀態</option>
                  <option value="PENDING">待處理</option>
                  <option value="PICKING">揀貨中</option>
                  <option value="CHARGED">已扣款</option>
                  <option value="SHIPPED">已出貨</option>
                  <option value="RECEIVED">已收貨</option>
                  <option value="REFUNDED">已退款</option>
                  <option value="CANCELLED">已取消</option>
                </select>
                <button
                  onClick={() => fetchOrders(0)}
                  className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90"
                >
                  搜尋
                </button>
              </div>

              {/* 訂單列表 */}
              {ordersLoading ? (
                <p className="text-text-secondary-light">載入中...</p>
              ) : orders.length === 0 ? (
                <p className="text-text-secondary-light">暫無訂單</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-border-light">
                        <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary-light">
                          訂單編號
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary-light">
                          會員 Email
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary-light">
                          會員名稱
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary-light">
                          金額 (NT$)
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary-light">
                          狀態
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary-light">
                          建立時間
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.id} className="border-b border-border-light hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm">{order.id}</td>
                          <td className="py-3 px-4 text-sm">{order.user_email || "-"}</td>
                          <td className="py-3 px-4 text-sm">{order.user_display_name || "-"}</td>
                          <td className="py-3 px-4 text-sm">
                            {typeof order.total_twd === "number"
                              ? order.total_twd.toLocaleString("zh-TW")
                              : "-"}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${order.status === "PENDING"
                                ? "bg-yellow-100 text-yellow-800"
                                : order.status === "PICKING"
                                  ? "bg-blue-100 text-blue-800"
                                  : order.status === "CHARGED"
                                    ? "bg-purple-100 text-purple-800"
                                    : order.status === "SHIPPED"
                                      ? "bg-teal-100 text-teal-800"
                                      : order.status === "RECEIVED"
                                        ? "bg-green-100 text-green-800"
                                        : order.status === "REFUNDED"
                                          ? "bg-gray-100 text-gray-800"
                                          : order.status === "CANCELLED"
                                            ? "bg-red-100 text-red-800"
                                            : "bg-gray-100 text-gray-800"
                                }`}
                            >
                              {order.status === "PENDING"
                                ? "待處理"
                                : order.status === "PICKING"
                                  ? "揀貨中"
                                  : order.status === "CHARGED"
                                    ? "已扣款"
                                    : order.status === "SHIPPED"
                                      ? "已出貨"
                                      : order.status === "RECEIVED"
                                        ? "已收貨"
                                        : order.status === "REFUNDED"
                                          ? "已退款"
                                          : order.status === "CANCELLED"
                                            ? "已取消"
                                            : order.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {order.created_at
                              ? new Date(order.created_at).toLocaleString("zh-TW")
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 分頁 */}
              {ordersTotal > pageSize && (
                <div className="flex justify-center gap-2 mt-6">
                  <button
                    onClick={() => fetchOrders(Math.max(ordersPage - 1, 0))}
                    disabled={ordersPage === 0}
                    className="px-4 py-2 border border-border-light rounded-lg disabled:opacity-50"
                  >
                    上一頁
                  </button>
                  <span className="text-sm text-text-secondary-light">
                    第 {ordersPage + 1} 頁 / 共 {Math.ceil(ordersTotal / pageSize)} 頁
                  </span>
                  <button
                    onClick={() => {
                      const nextPage = ordersPage + 1;
                      if (nextPage * pageSize < ordersTotal) {
                        fetchOrders(nextPage);
                      }
                    }}
                    disabled={(ordersPage + 1) * pageSize >= ordersTotal}
                    className="px-4 py-2 border border-border-light rounded-lg disabled:opacity-50"
                  >
                    下一頁
                  </button>
                </div>
              )}
            </div>
          ) : activeNav === "members" ? (
            // 會員管理
            <div className="py-6 space-y-6">
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
            </div>
          ) : activeNav === "upgrade_settings" ? (
            // 批發升級申請資格設定
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
          ) : activeNav === "hot_products" ? (
            // 熱銷商品管理
            <div className="py-6 space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-text-primary-light">熱銷商品管理</h2>
                  <p className="text-sm text-text-secondary-light mt-1">設定首頁與熱銷專區顯示的商品，可調整排序</p>
                </div>
                <div className="flex gap-3">
                  {selectedHotProductIds.length > 0 && (
                    <button
                      onClick={handleRemoveHotProducts}
                      className="px-4 py-2 rounded-lg border border-danger text-danger text-sm font-medium hover:bg-danger/10"
                    >
                      移除選取 ({selectedHotProductIds.length})
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowAddHotProduct(true);
                      fetchHotProductCandidates(0);
                      setSelectedHotCandidateIds([]);
                    }}
                    className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90"
                  >
                    新增熱銷商品
                  </button>
                </div>
              </div>

              {hotProductsLoading ? (
                <p className="text-text-secondary-light">載入中...</p>
              ) : hotProducts.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-border-light rounded-xl">
                  <p className="text-text-secondary-light mb-4">尚未設定熱銷商品</p>
                  <button
                    onClick={() => {
                      setShowAddHotProduct(true);
                      fetchHotProductCandidates(0);
                    }}
                    className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium"
                  >
                    立即新增
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-border-light bg-card-light overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-background-light border-b border-border-light">
                      <tr>
                        <th className="px-4 py-3 text-left w-10">
                          <input
                            type="checkbox"
                            checked={selectedHotProductIds.length === hotProducts.length && hotProducts.length > 0}
                            onChange={() => {
                              if (selectedHotProductIds.length === hotProducts.length) setSelectedHotProductIds([]);
                              else setSelectedHotProductIds(hotProducts.map(p => p.id));
                            }}
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-text-primary-light">排序</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-text-primary-light">SKU</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-text-primary-light">商品名稱</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-text-primary-light">價格</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-text-primary-light">標記時間</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hotProducts.map((p, idx) => (
                        <tr key={p.id} className="border-b border-border-light hover:bg-background-light">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedHotProductIds.includes(p.id)}
                              onChange={() => toggleHotProductSelect(p.id)}
                            />
                          </td>
                          <td className="px-4 py-3 text-sm font-mono">{idx + 1}</td>
                          <td className="px-4 py-3 text-sm">{p.sku}</td>
                          <td className="px-4 py-3 text-sm">{p.title_zh || p.title_original}</td>
                          <td className="px-4 py-3 text-sm">NT${Number(p.retail_price_twd).toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-text-secondary-light">
                            {p.hot_marked_at ? new Date(p.hot_marked_at).toLocaleDateString("zh-TW") : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 新增熱銷商品 Modal */}
              {showAddHotProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                  <div className="w-full max-w-3xl rounded-xl border border-border-light bg-card-light p-6 max-h-[90vh] flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-text-primary-light">選擇商品加入熱銷</h3>
                      <button onClick={() => setShowAddHotProduct(false)} className="text-text-secondary-light">
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    </div>

                    <div className="flex gap-3 mb-4">
                      <input
                        type="text"
                        placeholder="搜尋商品..."
                        value={hotProductSearch}
                        onChange={(e) => {
                          setHotProductSearch(e.target.value);
                          setHotProductCandidatePage(0);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") fetchHotProductCandidates(0);
                        }}
                        className="flex-1 rounded-lg border border-border-light px-3 py-2 text-sm"
                      />
                      <button
                        onClick={() => fetchHotProductCandidates(0)}
                        className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium"
                      >
                        搜尋
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto border border-border-light rounded-lg">
                      <table className="w-full">
                        <thead className="bg-background-light sticky top-0">
                          <tr>
                            <th className="px-4 py-2 text-left w-10">
                              <input
                                type="checkbox"
                                checked={hotProductCandidates.length > 0 && hotProductCandidates.every(p => p.is_already_hot || selectedHotCandidateIds.includes(p.id))}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    const newIds = hotProductCandidates.filter(p => !p.is_already_hot).map(p => p.id);
                                    setSelectedHotCandidateIds(prev => Array.from(new Set([...prev, ...newIds])));
                                  } else {
                                    const removeIds = hotProductCandidates.map(p => p.id);
                                    setSelectedHotCandidateIds(prev => prev.filter(id => !removeIds.includes(id)));
                                  }
                                }}
                              />
                            </th>
                            <th className="px-4 py-2 text-left text-sm">SKU</th>
                            <th className="px-4 py-2 text-left text-sm">名稱</th>
                            <th className="px-4 py-2 text-left text-sm">狀態</th>
                          </tr>
                        </thead>
                        <tbody>
                          {hotProductCandidates.length === 0 ? (
                            <tr><td colSpan={4} className="p-4 text-center text-text-secondary-light">查無商品</td></tr>
                          ) : (
                            hotProductCandidates.map(p => (
                              <tr key={p.id} className={`border-b border-border-light ${p.is_already_hot ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'}`}>
                                <td className="px-4 py-2">
                                  <input
                                    type="checkbox"
                                    checked={p.is_already_hot || selectedHotCandidateIds.includes(p.id)}
                                    disabled={p.is_already_hot}
                                    onChange={() => toggleHotCandidate(p.id)}
                                  />
                                </td>
                                <td className="px-4 py-2 text-sm">{p.sku}</td>
                                <td className="px-4 py-2 text-sm line-clamp-1">{p.title_zh || p.title_original}</td>
                                <td className="px-4 py-2 text-sm">
                                  {p.is_already_hot ? (
                                    <span className="text-success text-xs font-bold border border-success px-2 py-0.5 rounded">已熱銷</span>
                                  ) : (
                                    <span className="text-text-secondary-light text-xs">可加入</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination for candidates */}
                    {hotProductCandidateTotal > pageSize && (
                      <div className="flex justify-center gap-2 mt-4">
                        <button
                          onClick={() => fetchHotProductCandidates(hotProductCandidatePage - 1)}
                          disabled={hotProductCandidatePage === 0}
                          className="px-3 py-1 rounded border border-border-light text-sm disabled:opacity-50"
                        >
                          上一頁
                        </button>
                        <span className="text-sm py-1">
                          {hotProductCandidatePage + 1} / {Math.ceil(hotProductCandidateTotal / pageSize)}
                        </span>
                        <button
                          onClick={() => fetchHotProductCandidates(hotProductCandidatePage + 1)}
                          disabled={(hotProductCandidatePage + 1) * pageSize >= hotProductCandidateTotal}
                          className="px-3 py-1 rounded border border-border-light text-sm disabled:opacity-50"
                        >
                          下一頁
                        </button>
                      </div>
                    )}

                    <div className="mt-4 flex justify-end gap-3 pt-4 border-t border-border-light">
                      <button onClick={() => setShowAddHotProduct(false)} className="px-4 py-2 rounded-lg border border-border-light text-sm">取消</button>
                      <button
                        onClick={handleAddHotProducts}
                        disabled={addingHotProducts || selectedHotCandidateIds.length === 0}
                        className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold disabled:opacity-50"
                      >
                        {addingHotProducts ? "加入中..." : `加入選取 (${selectedHotCandidateIds.length})`}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {/* 展示設定 (Display Settings) */}
              <div className="mt-8 border-t border-border-light pt-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-text-primary-light">展示設定</h3>
                    <p className="text-sm text-text-secondary-light mt-1">編輯首頁人氣商品與各國熱銷專區顯示</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { id: "popular", label: "首頁人氣商品", count: displaySettings.popular?.length || 0 },
                    { id: "korea", label: "韓國熱銷商品", count: displaySettings.korea?.length || 0 },
                    { id: "japan", label: "日本熱銷商品", count: displaySettings.japan?.length || 0 },
                    { id: "thailand", label: "泰國趨勢商品", count: displaySettings.thailand?.length || 0 },
                  ].map((item) => (
                    <div key={item.id} className="p-4 rounded-xl border border-border-light bg-card-light flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-text-primary-light">{item.label}</h4>
                        <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded-full">
                          {item.count} 商品
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setActiveDisplayTab(item.id as any);
                          setShowDisplaySettingsDrawer(true);
                          fetchDisplayCandidates(0);
                          setSelectedDisplayCandidateIds([]);
                        }}
                        className="w-full py-2 rounded-lg border border-border-light text-sm font-medium hover:bg-gray-50 transition-colors"
                      >
                        編輯內容
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 展示設定抽屜 (Drawer) */}
              {showDisplaySettingsDrawer && (
                <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
                  <div className="w-full max-w-2xl h-full bg-white shadow-xl flex flex-col animate-in slide-in-from-right duration-300">
                    <div className="flex items-center justify-between p-6 border-b border-border-light">
                      <div>
                        <h3 className="text-xl font-bold text-text-primary-light">
                          {activeDisplayTab === "popular" ? "首頁人氣商品" :
                            activeDisplayTab === "korea" ? "韓國熱銷商品" :
                              activeDisplayTab === "japan" ? "日本熱銷商品" : "泰國趨勢商品"}
                        </h3>
                        <p className="text-sm text-text-secondary-light mt-1">
                          已選擇 {displaySettings[activeDisplayTab]?.length || 0} 個商品
                        </p>
                      </div>
                      <button onClick={() => setShowDisplaySettingsDrawer(false)} className="text-text-secondary-light hover:text-text-primary-light">
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    </div>

                    <div className="p-4 border-b border-border-light bg-gray-50">
                      <div className="flex gap-3">
                        <input
                          type="text"
                          placeholder="搜尋商品..."
                          value={displayCandidateSearch}
                          onChange={(e) => {
                            setDisplayCandidateSearch(e.target.value);
                            setDisplayCandidatePage(0);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") fetchDisplayCandidates(0);
                          }}
                          className="flex-1 rounded-lg border border-border-light px-3 py-2 text-sm"
                        />
                        <button
                          onClick={() => fetchDisplayCandidates(0)}
                          className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium"
                        >
                          搜尋
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4">
                      {displayCandidates.length === 0 ? (
                        <div className="text-center py-10 text-text-secondary-light">查無商品</div>
                      ) : (
                        <div className="space-y-2">
                          {displayCandidates.map((p) => (
                            <div key={p.id} className={`flex items-center gap-3 p-3 rounded-lg border ${p.is_already_added || selectedDisplayCandidateIds.includes(p.id) ? "border-primary/30 bg-primary/5" : "border-border-light bg-white"}`}>
                              <input
                                type="checkbox"
                                checked={p.is_already_added || selectedDisplayCandidateIds.includes(p.id)}
                                onChange={() => {
                                  if (p.is_already_added) {
                                    // 如果已經添加，則移除
                                    handleRemoveDisplayProducts([p.id]);
                                    // 更新本地狀態顯示
                                    p.is_already_added = false;
                                  } else {
                                    // 如果未添加，則加入選取
                                    setSelectedDisplayCandidateIds(prev =>
                                      prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                                    );
                                  }
                                }}
                                className="w-5 h-5 text-primary rounded focus:ring-primary"
                              />
                              <div className="w-12 h-12 bg-gray-100 rounded-md flex-shrink-0 overflow-hidden">
                                {p.cover_image_url ? (
                                  <img src={p.cover_image_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                                    <span className="material-symbols-outlined text-lg">image</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-text-primary-light truncate">{p.title_zh || p.title_original}</p>
                                <p className="text-xs text-text-secondary-light">{p.sku}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-primary">NT$ {p.retail_price_twd}</p>
                                {p.is_already_added && <span className="text-xs text-success font-medium">已加入</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Pagination */}
                      {displayCandidateTotal > pageSize && (
                        <div className="flex justify-center gap-2 mt-6">
                          <button
                            onClick={() => fetchDisplayCandidates(displayCandidatePage - 1)}
                            disabled={displayCandidatePage === 0}
                            className="px-3 py-1 rounded border border-border-light text-sm disabled:opacity-50"
                          >
                            上一頁
                          </button>
                          <span className="text-sm py-1">
                            {displayCandidatePage + 1} / {Math.ceil(displayCandidateTotal / pageSize)}
                          </span>
                          <button
                            onClick={() => fetchDisplayCandidates(displayCandidatePage + 1)}
                            disabled={(displayCandidatePage + 1) * pageSize >= displayCandidateTotal}
                            className="px-3 py-1 rounded border border-border-light text-sm disabled:opacity-50"
                          >
                            下一頁
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="p-4 border-t border-border-light bg-white flex justify-between items-center">
                      <span className="text-sm text-text-secondary-light">
                        已選取 {selectedDisplayCandidateIds.length} 個新商品
                      </span>
                      <div className="flex gap-3">
                        <button onClick={() => setShowDisplaySettingsDrawer(false)} className="px-4 py-2 rounded-lg border border-border-light text-sm">關閉</button>
                        <button
                          onClick={handleAddDisplayProducts}
                          disabled={selectedDisplayCandidateIds.length === 0 || savingDisplaySettings}
                          className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold disabled:opacity-50"
                        >
                          {savingDisplaySettings ? "儲存中..." : "確認加入"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : activeNav === "dashboard" ? (
            // Dashboard Stats
            <div className="grid grid-cols-1 gap-6 py-6 sm:grid-cols-2 lg:grid-cols-3">
              {stats.map((stat, idx) => (
                <div key={idx} className="flex flex-col gap-2 rounded-xl border border-border-light bg-card-light p-6">
                  <p className="text-base font-medium text-text-secondary-light">{stat.label}</p>
                  <p className="text-3xl font-bold tracking-tight text-text-primary-light">{stat.value}</p>
                  <p className={`text-base font-medium ${stat.changeType === "positive" ? "text-success" : "text-danger"}`}>
                    {stat.changeType === "positive" ? "+" : ""}{stat.change}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          {/* Charts Section - Only show on dashboard */}
          {activeNav === "dashboard" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
              {/* Sales Chart */}
              <div className="flex flex-col gap-2 rounded-xl border border-border-light bg-card-light p-6 lg:col-span-3">
                <p className="text-lg font-medium text-text-primary-light">銷售趨勢</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-bold tracking-tight text-text-primary-light">$8,492</p>
                  <p className="text-base font-medium text-success">+12.8%</p>
                </div>
                <p className="text-base text-text-secondary-light">最近 30 天</p>
                <div className="mt-4 flex h-64 w-full flex-col">
                  <svg fill="none" preserveAspectRatio="none" viewBox="0 0 478 150" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0 109C18.1538 109 18.1538 21 36.3077 21C54.4615 21 54.4615 41 72.6154 41C90.7692 41 90.7692 93 108.923 93C127.077 93 127.077 33 145.231 33C163.385 33 163.385 101 181.538 101C199.692 101 199.692 61 217.846 61C236 61 236 45 254.154 45C272.308 45 272.308 121 290.462 121C308.615 121 308.615 149 326.769 149C344.923 149 344.923 1 363.077 1C381.231 1 381.231 81 399.385 81C417.538 81 417.538 129 435.692 129C453.846 129 453.846 25 472 25V149H0V109Z" fill="url(#paint0_linear_chart)"></path>
                    <path d="M0 109C18.1538 109 18.1538 21 36.3077 21C54.4615 21 54.4615 41 72.6154 41C90.7692 41 90.7692 93 108.923 93C127.077 93 127.077 33 145.231 33C163.385 33 163.385 101 181.538 101C199.692 101 199.692 61 217.846 61C236 61 236 45 254.154 45C272.308 45 272.308 121 290.462 121C308.615 121 308.615 149 326.769 149C344.923 149 344.923 1 363.077 1C381.231 1 381.231 81 399.385 81C417.538 81 417.538 129 435.692 129C453.846 129 453.846 25 472 25" stroke="#3182CE" strokeLinecap="round" strokeWidth="3"></path>
                    <defs>
                      <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_chart" x1="236" x2="236" y1="1" y2="149">


                        <stop stopColor="#3182CE" stopOpacity="0.2"></stop>
                        <stop offset="1" stopColor="#3182CE" stopOpacity="0"></stop>
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>

              {/* Categories Chart */}
              <div className="flex flex-col gap-4 rounded-xl border border-border-light bg-card-light p-6 lg:col-span-2">
                <p className="text-lg font-medium text-text-primary-light">分類銷售排行</p>
                <div className="flex flex-col gap-4">
                  {categoryStats.map((cat, idx) => (
                    <div key={idx} className="flex flex-col gap-1">
                      <div className="flex justify-between text-sm font-medium text-text-secondary-light">
                        <span>{cat.name}</span>
                        <span>{cat.percentage}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-primary/20">
                        <div className="h-2 rounded-full bg-primary" style={{ width: `${cat.percentage}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

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

              {/* 儲值記錄 */}
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

export default dynamic(() => Promise.resolve(AdminDashboard), { ssr: false });
