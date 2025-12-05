import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const admin = supabaseAdmin();
        const { id } = await params;
        
        const { data, error } = await admin
            .from("blog_posts")
            .select("*, blog_post_tag_map(tag_id, tags(*))")
            .eq("id", id)
            .single();
            
        if (error) return NextResponse.json({ error: error.message }, { status: 404 });
        
        // Format tags
        const formatted = {
            ...data,
            tags: data.blog_post_tag_map?.map((m: any) => m.tags) || [],
            blog_post_tag_map: undefined
        };
        return NextResponse.json(formatted);
    } catch (err) {
        console.error("GET /api/blog-posts/[id] error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = supabaseAdmin();
    const { id } = await params;
    
    const body = await request.json();
    const { tags, ...postData } = body;

    const { data, error } = await admin
      .from("blog_posts")
      .update(postData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    // Handle Tags Update (Delete all and re-insert)
    if (tags && Array.isArray(tags)) {
        // Delete existing
        await admin
            .from("blog_post_tag_map")
            .delete()
            .eq("blog_post_id", id);
            
        // Insert new
        if (tags.length > 0) {
            const tagMap = tags.map((tagId: number) => ({
                blog_post_id: id,
                tag_id: tagId
            }));
            
            await admin
                .from("blog_post_tag_map")
                .insert(tagMap);
        }
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("PUT /api/blog-posts/[id] error:", err);
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
    const admin = supabaseAdmin();
    const { id } = await params;

    const { error } = await admin
      .from("blog_posts")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/blog-posts/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
