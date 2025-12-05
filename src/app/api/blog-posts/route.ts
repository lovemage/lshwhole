import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10") || 10;
    const offset = parseInt(searchParams.get("offset") || "0") || 0;
    const status = searchParams.get("status"); // 'published', 'draft', 'archived', or null for all (admin)
    const slug = searchParams.get("slug");
    
    // If slug provided, return single item
    if (slug) {
        const { data, error } = await admin
            .from("blog_posts")
            .select("*, blog_post_tag_map(tag_id, tags(*))")
            .eq("slug", slug)
            .single();
            
        if (error) return NextResponse.json({ error: error.message }, { status: 404 });
        
        // Format tags
        const formatted = {
            ...data,
            tags: data.blog_post_tag_map?.map((m: any) => m.tags) || [],
            blog_post_tag_map: undefined
        };
        return NextResponse.json(formatted);
    }

    let query = admin
      .from("blog_posts")
      .select("*, blog_post_tag_map(tag_id, tags(*))", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    // Format tags
    const formattedData = (data || []).map((post: any) => ({
        ...post,
        tags: post.blog_post_tag_map?.map((m: any) => m.tags) || [],
        blog_post_tag_map: undefined
    }));

    return NextResponse.json({ data: formattedData, count: count || 0 });
  } catch (err) {
    console.error("GET /api/blog-posts error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const body = await request.json();
    const { tags, ...postData } = body;
    
    // Basic Validation
    if (!postData.title || !postData.slug) {
         return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("blog_posts")
      .insert(postData)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    // Handle Tags
    if (tags && Array.isArray(tags) && tags.length > 0) {
        const tagMap = tags.map((tagId: number) => ({
            blog_post_id: data.id,
            tag_id: tagId
        }));
        
        const { error: tagError } = await admin
            .from("blog_post_tag_map")
            .insert(tagMap);
            
        if (tagError) {
             console.error("Error inserting tags:", tagError);
        }
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("POST /api/blog-posts error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
