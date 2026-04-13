import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = supabaseAdmin();

    const { data, error } = await admin
      .from("categories")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/categories/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = supabaseAdmin();
    const body = await request.json();
    const { name, sort, description } = body;

    const { data, error } = await admin
      .from("categories")
      .update({
        name,
        sort,
        description,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data[0]);
  } catch (err) {
    console.error("PUT /api/categories/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = supabaseAdmin();
    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "1";

    const categoryId = Number(id);
    if (!Number.isFinite(categoryId)) {
      return NextResponse.json({ error: "Invalid category id" }, { status: 400 });
    }

    const { data: category, error: categoryError } = await admin
      .from("categories")
      .select("id, level, name")
      .eq("id", categoryId)
      .single();

    if (categoryError || !category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const [parentRelRes, childRelRes, productMapRes] = await Promise.all([
      admin
        .from("category_relations")
        .select("parent_category_id", { count: "exact", head: true })
        .eq("child_category_id", categoryId),
      admin
        .from("category_relations")
        .select("child_category_id", { count: "exact", head: true })
        .eq("parent_category_id", categoryId),
      admin
        .from("product_category_map")
        .select("product_id", { count: "exact", head: true })
        .eq("category_id", categoryId),
    ]);

    const dependencyCheckError =
      parentRelRes.error || childRelRes.error || productMapRes.error;

    if (dependencyCheckError) {
      return NextResponse.json(
        { error: dependencyCheckError.message || "Failed to check dependencies" },
        { status: 400 }
      );
    }

    const parentRelationCount = parentRelRes.count || 0;
    const childRelationCount = childRelRes.count || 0;
    const productMappingCount = productMapRes.count || 0;
    const hasDependencies =
      parentRelationCount > 0 || childRelationCount > 0 || productMappingCount > 0;

    if (hasDependencies && !force) {
      return NextResponse.json(
        {
          error: "分類仍有關聯資料，請先清除關聯後再刪除",
          reason: "category_has_dependencies",
          dependency: {
            category_id: categoryId,
            level: category.level,
            name: category.name,
            parent_relation_count: parentRelationCount,
            child_relation_count: childRelationCount,
            product_mapping_count: productMappingCount,
          },
        },
        { status: 409 }
      );
    }

    if (force) {
      const [delParentRel, delChildRel, delProductMap] = await Promise.all([
        admin.from("category_relations").delete().eq("child_category_id", categoryId),
        admin.from("category_relations").delete().eq("parent_category_id", categoryId),
        admin.from("product_category_map").delete().eq("category_id", categoryId),
      ]);

      const forceDeleteError =
        delParentRel.error || delChildRel.error || delProductMap.error;

      if (forceDeleteError) {
        return NextResponse.json(
          { error: forceDeleteError.message || "Failed to clear dependencies" },
          { status: 400 }
        );
      }
    }

    const { error } = await admin
      .from("categories")
      .update({ active: false })
      .eq("id", categoryId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/categories/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
