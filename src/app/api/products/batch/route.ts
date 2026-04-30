import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

interface TemplateSpec {
  name: string;
  values: string[];
}

const normalizeTemplateSpecs = (input: unknown): TemplateSpec[] => {
  if (!Array.isArray(input)) return [];
  return input
    .map((spec) => {
      const name = typeof spec?.name === "string" ? spec.name.trim() : "";
      const values: string[] = Array.isArray(spec?.values)
        ? Array.from(
            new Set(
              spec.values
                .map((v: unknown) => (typeof v === "string" ? v.trim() : ""))
                .filter(Boolean)
            )
          )
        : [];
      return { name, values };
    })
    .filter((spec) => spec.name && spec.values.length > 0);
};

const buildVariantOptions = (specs: TemplateSpec[]) => {
  if (specs.length === 0) return [] as Array<Record<string, string>>;
  let combinations: Array<Record<string, string>> = [{}];
  for (const spec of specs) {
    const next: Array<Record<string, string>> = [];
    for (const combo of combinations) {
      for (const value of spec.values) {
        next.push({ ...combo, [spec.name]: value });
      }
    }
    combinations = next;
  }
  return combinations;
};

export async function POST(request: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const body = await request.json();
    const { action, ids, status, category_ids, tag_id, spec_template_id } = body || {};

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "缺少 ids" }, { status: 400 });
    }

    if (action === "status") {
      // schema 使用 status: 'draft'|'published'
      const newStatus = status === "published" ? "published" : "draft";
      const { error } = await admin
        .from("products")
        .update({ status: newStatus })
        .in("id", ids);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      const { error } = await admin
        .from("products")
        .delete()
        .in("id", ids);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (action === "category") {
      const categoryIds = Array.isArray(category_ids)
        ? Array.from(
            new Set(
              category_ids
                .map((cid: any) => Number(cid))
                .filter((n: number) => Number.isInteger(n) && n > 0)
            )
          )
        : [];

      if (categoryIds.length === 0) {
        return NextResponse.json({ error: "缺少有效分類" }, { status: 400 });
      }

      const { error: delError } = await admin
        .from("product_category_map")
        .delete()
        .in("product_id", ids);

      if (delError) {
        return NextResponse.json({ error: delError.message }, { status: 400 });
      }

      const rows = ids.flatMap((productId: number) =>
        categoryIds.map((categoryId: number) => ({ product_id: productId, category_id: categoryId }))
      );

      if (rows.length > 0) {
        const { error: insError } = await admin.from("product_category_map").insert(rows);
        if (insError) {
          return NextResponse.json({ error: insError.message }, { status: 400 });
        }
      }

      return NextResponse.json({ success: true });
    }

    if (action === "remove_brand") {
      const { data: brandTags, error: brandTagErr } = await admin
        .from("tags")
        .select("id")
        .eq("category", "A1");

      if (brandTagErr) {
        return NextResponse.json({ error: brandTagErr.message }, { status: 400 });
      }

      const brandTagIds = (brandTags || []).map((t: { id: number }) => t.id);
      if (brandTagIds.length === 0) {
        return NextResponse.json({ success: true });
      }

      const { error: delError } = await admin
        .from("product_tag_map")
        .delete()
        .in("product_id", ids)
        .in("tag_id", brandTagIds);

      if (delError) {
        return NextResponse.json({ error: delError.message }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    if (action === "remove_tag") {
      const tagId = Number(tag_id);
      if (!Number.isInteger(tagId) || tagId <= 0) {
        return NextResponse.json({ error: "缺少有效 tag_id" }, { status: 400 });
      }

      const { error: delError } = await admin
        .from("product_tag_map")
        .delete()
        .in("product_id", ids)
        .eq("tag_id", tagId);

      if (delError) {
        return NextResponse.json({ error: delError.message }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    if (action === "apply_spec_template") {
      const templateId = String(spec_template_id || "").trim();
      if (!templateId) {
        return NextResponse.json({ error: "缺少 spec_template_id" }, { status: 400 });
      }

      const { data: template, error: templateErr } = await admin
        .from("spec_templates")
        .select("id,name,specs")
        .eq("id", templateId)
        .maybeSingle<{ id: string; name: string; specs: unknown }>();

      if (templateErr) {
        return NextResponse.json({ error: templateErr.message }, { status: 400 });
      }

      if (!template) {
        return NextResponse.json({ error: "找不到指定規格範本" }, { status: 404 });
      }

      const specs = normalizeTemplateSpecs(template.specs);
      if (specs.length === 0) {
        return NextResponse.json({ error: "範本規格無有效內容" }, { status: 400 });
      }

      const { data: products, error: productErr } = await admin
        .from("products")
        .select("id,sku,retail_price_twd")
        .in("id", ids)
        .returns<Array<{ id: number; sku: string; retail_price_twd: number | null }>>();

      if (productErr) {
        return NextResponse.json({ error: productErr.message }, { status: 400 });
      }

      const targetProducts = products || [];
      if (targetProducts.length === 0) {
        return NextResponse.json({ error: "找不到可套用的商品" }, { status: 404 });
      }

      const optionCombos = buildVariantOptions(specs);

      const { error: productUpdateErr } = await admin
        .from("products")
        .update({ specs })
        .in("id", targetProducts.map((p) => p.id));

      if (productUpdateErr) {
        return NextResponse.json({ error: productUpdateErr.message }, { status: 400 });
      }

      const { error: deleteVariantErr } = await admin
        .from("product_variants")
        .delete()
        .in("product_id", targetProducts.map((p) => p.id));

      if (deleteVariantErr) {
        return NextResponse.json({ error: deleteVariantErr.message }, { status: 400 });
      }

      if (optionCombos.length > 0) {
        const variantRows = targetProducts.flatMap((product) =>
          optionCombos.map((options, index) => ({
            product_id: product.id,
            name: Object.values(options).join(" / "),
            options,
            price: Number.isFinite(Number(product.retail_price_twd)) ? Math.floor(Number(product.retail_price_twd)) : 0,
            stock: 10,
            sku: `${product.sku}-${index + 1}`,
          }))
        );

        if (variantRows.length > 0) {
          const { error: variantInsertErr } = await admin.from("product_variants").insert(variantRows);
          if (variantInsertErr) {
            return NextResponse.json({ error: variantInsertErr.message }, { status: 400 });
          }
        }
      }

      return NextResponse.json({ success: true, template_name: template.name, products: targetProducts.length });
    }

    return NextResponse.json({ error: "未知動作" }, { status: 400 });
  } catch (err) {
    console.error("POST /api/products/batch error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
