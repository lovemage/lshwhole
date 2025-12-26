import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

 const ensureHttps = (url: string | null | undefined) =>
  url ? url.replace(/^http:/, "https:") : null;

// 公開商品列表（僅發佈商品），支援搜尋、分類過濾（含子分類）和標籤篩選
export async function GET(request: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") || "48");
    const offset = Number(searchParams.get("offset") || "0");
    const search = searchParams.get("search") || "";
    const categoryIdRaw = searchParams.get("category_id");
    const tagIdsRaw = searchParams.get("tag_ids");

    // 嘗試根據 Authorization header 取得目前會員 tier（零售 / 批發 / VIP）
    let userTier: "retail" | "wholesale" | "vip" | null = null;
    let allowedL1: number[] | null = null;
    const authHeader =
      request.headers.get("Authorization") || request.headers.get("authorization");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (authHeader?.startsWith("Bearer ") && supabaseUrl && supabaseAnonKey) {
      try {
        const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
          global: {
            headers: {
              Authorization: authHeader,
            },
          },
        });

        const {
          data: { user },
        } = await supabaseUser.auth.getUser();

        if (!user) {
          return NextResponse.json({ error: "未登入" }, { status: 401 });
        }

        const { data: profile, error: profileErr } = await admin
          .from("profiles")
          .select("tier, allowed_l1_category_ids")
          .eq("user_id", user.id)
          .single();

        if (profileErr || !profile?.tier) {
          return NextResponse.json({ error: "會員資料不存在" }, { status: 401 });
        }

        if (profile.tier === "guest") {
          return NextResponse.json({ error: "請註冊或登入會員後瀏覽商品" }, { status: 403 });
        }

        userTier = profile.tier as "retail" | "wholesale" | "vip";
        allowedL1 = profile.allowed_l1_category_ids || null;
      } catch (e) {
        console.error("resolve user tier failed in /api/retail/products", e);
        return NextResponse.json({ error: "驗證失敗" }, { status: 401 });
      }
    }

    if (!userTier) {
      return NextResponse.json({ error: "請登入後查看商品" }, { status: 401 });
    }

    const isWholesaleTier = userTier === "wholesale" || userTier === "vip";


    // 先挑出符合條件的商品（僅已上架）
    let baseQuery = admin
      .from("products")
      .select(
        "id, sku, title_zh, title_original, retail_price_twd, wholesale_price_twd, wholesale_price_visible, created_at",
        { count: "exact" }
      )
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (search) {
      baseQuery = baseQuery.or(
        `sku.ilike.%${search}%,title_zh.ilike.%${search}%,title_original.ilike.%${search}%`
      );
    }

    // 收集需要篩選的商品 ID
    let filteredProductIds: number[] | null = null;
    let allowedCategoryIds: number[] | null = null;

    if (allowedL1 && allowedL1.length > 0) {
      const { data: categories, error: catErr } = await admin
        .from("categories")
        .select("id, level");
      if (catErr) return NextResponse.json({ error: catErr.message }, { status: 400 });

      const { data: rels, error: relErr } = await admin
        .from("category_relations")
        .select("parent_category_id, child_category_id");
      if (relErr) return NextResponse.json({ error: relErr.message }, { status: 400 });

      const adj = new Map<number, number[]>();
      rels?.forEach((r) => {
        const arr = adj.get(r.parent_category_id) || [];
        arr.push(r.child_category_id);
        adj.set(r.parent_category_id, arr);
      });

      const allowedSet = new Set<number>();
      const l1Existing = new Set((categories || []).filter((c: any) => c.level === 1).map((c: any) => c.id));
      allowedL1.forEach((id) => {
        if (!l1Existing.has(id)) return;
        const q: number[] = [id];
        while (q.length) {
          const cur = q.shift()!;
          if (allowedSet.has(cur)) continue;
          allowedSet.add(cur);
          (adj.get(cur) || []).forEach((child) => q.push(child));
        }
      });
      allowedCategoryIds = Array.from(allowedSet);

      if (allowedCategoryIds.length === 0) {
        return NextResponse.json({ data: [], count: 0 });
      }
    }

    // 若有傳入分類，過濾商品
    if (categoryIdRaw) {
      const categoryId = Number(categoryIdRaw);

      // 判斷該分類層級
      const { data: cat, error: catErr } = await admin
        .from("categories")
        .select("id, level")
        .eq("id", categoryId)
        .single();
      if (catErr) {
        return NextResponse.json({ error: catErr.message }, { status: 400 });
      }

      if (cat?.level === 1) {
        // L1：強制要求商品有「直接」掛上該 L1，避免因共用 L2/L3 造成跨國家顯示
        const { data: pcm, error: mapErr } = await admin
          .from("product_category_map")
          .select("product_id")
          .eq("category_id", categoryId);
        if (mapErr) return NextResponse.json({ error: mapErr.message }, { status: 400 });
        filteredProductIds = (pcm || []).map((x: any) => x.product_id);
      } else {
        // L2/L3：展開其所有子分類並過濾商品（包含自身）
        const { data: rels, error: relErr } = await admin
          .from("category_relations")
          .select("parent_category_id, child_category_id");
        if (relErr) return NextResponse.json({ error: relErr.message }, { status: 400 });

        // BFS 展開所有後代分類
        const adj = new Map<number, number[]>();
        rels?.forEach((r) => {
          const arr = adj.get(r.parent_category_id) || [];
          arr.push(r.child_category_id);
          adj.set(r.parent_category_id, arr);
        });
        const targetIds = new Set<number>();
        const q: number[] = [categoryId];
        while (q.length) {
          const cur = q.shift()!;
          if (targetIds.has(cur)) continue;
          targetIds.add(cur);
          const children = adj.get(cur) || [];
          children.forEach((c) => q.push(c));
        }

        // 映射到商品
        const { data: pcm, error: mapErr } = await admin
          .from("product_category_map")
          .select("product_id")
          .in("category_id", Array.from(targetIds));
        if (mapErr) return NextResponse.json({ error: mapErr.message }, { status: 400 });
        filteredProductIds = (pcm || []).map((x: any) => x.product_id);
      }
    }

    // 若有傳入標籤，篩選有該標籤的商品 (支援多選, OR 邏輯)
    if (tagIdsRaw) {
      const tagIds = tagIdsRaw.split(',').map(Number).filter(n => !isNaN(n));
      
      if (tagIds.length > 0) {
        const { data: ptm, error: tagMapErr } = await admin
          .from("product_tag_map")
          .select("product_id")
          .in("tag_id", tagIds);
        
        if (tagMapErr) return NextResponse.json({ error: tagMapErr.message }, { status: 400 });

        const tagProductIds = Array.from(new Set((ptm || []).map((x: any) => x.product_id)));

        // 如果已有分類篩選，取交集；否則直接使用標籤篩選結果
        if (filteredProductIds !== null) {
          filteredProductIds = filteredProductIds.filter(id => tagProductIds.includes(id));
        } else {
          filteredProductIds = tagProductIds;
        }
      }
    }

    // 應用篩選結果
    if (allowedCategoryIds && allowedCategoryIds.length > 0) {
      const { data: pcmAllowed, error: pcmAllowedErr } = await admin
        .from("product_category_map")
        .select("product_id")
        .in("category_id", allowedCategoryIds);
      if (pcmAllowedErr) return NextResponse.json({ error: pcmAllowedErr.message }, { status: 400 });
      const allowedProductIds = Array.from(new Set((pcmAllowed || []).map((x: any) => x.product_id)));
      if (allowedProductIds.length === 0) return NextResponse.json({ data: [], count: 0 });

      if (filteredProductIds !== null) {
        filteredProductIds = filteredProductIds.filter((id) => allowedProductIds.includes(id));
      } else {
        filteredProductIds = allowedProductIds;
      }
    }

    if (filteredProductIds !== null) {
      if (filteredProductIds.length === 0) return NextResponse.json({ data: [], count: 0 });
      baseQuery = baseQuery.in("id", filteredProductIds);
    }

    const { data: products, error: prodErr, count } = await baseQuery
      .range(offset, offset + limit - 1);
    if (prodErr) return NextResponse.json({ error: prodErr.message }, { status: 400 });

    const ids = (products || []).map((p: any) => p.id);
    let coverMap = new Map<number, string>();
    let tagsMap = new Map<number, any[]>();

    if (ids.length > 0) {
      // Fetch Images
      const { data: imgs, error: imgErr } = await admin
        .from("product_images")
        .select("product_id, url, sort")
        .in("product_id", ids);
      if (imgErr) return NextResponse.json({ error: imgErr.message }, { status: 400 });

      // 取每個商品 sort 最小的圖片作為封面
      const byProd = new Map<number, { url: string; sort: number }>();
      (imgs || []).forEach((im: any) => {
        const cur = byProd.get(im.product_id);
        if (!cur || im.sort < cur.sort) {
          byProd.set(im.product_id, { url: im.url, sort: im.sort ?? 0 });
        }
      });
      coverMap = new Map(
        Array.from(byProd.entries()).map(([pid, v]) => [pid, v.url])
      );

      // Fetch Tags
      const { data: tagsData, error: tagsErr } = await admin
        .from("product_tag_map")
        .select("product_id, tag_id, tags(id, name, slug, category, sort)")
        .in("product_id", ids);

      if (!tagsErr && tagsData) {
        tagsData.forEach((item: any) => {
          const pid = item.product_id;
          const tag = item.tags;
          if (tag) {
            const currentTags = tagsMap.get(pid) || [];
            currentTags.push(tag);
            tagsMap.set(pid, currentTags);
          }
        });
      }
    }

    const result = (products || []).map((p: any) => ({
      id: p.id,
      title: p.title_zh || p.title_original || p.sku,
      retail_price_twd: p.retail_price_twd,
      wholesale_price_twd:
        isWholesaleTier && p.wholesale_price_visible ? p.wholesale_price_twd : null,
      cover_image_url: ensureHttps(coverMap.get(p.id) || null),
      tags: (tagsMap.get(p.id) || []).sort((a, b) => (a.sort || 0) - (b.sort || 0)),
    }));

    return NextResponse.json({ data: result, count: count || 0 });
  } catch (err) {
    console.error("GET /api/retail/products error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
