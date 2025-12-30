import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { EXAMPLE_BLOG_POST } from "@/data/example_blog_post";

export async function GET(request: NextRequest) {
  try {
    const admin = supabaseAdmin();

    // 1. Create Tags
    const tagIds = [];
    for (const tagName of EXAMPLE_BLOG_POST.tags) {
        // Check if exists
        const { data: existingTag } = await admin
            .from("tags")
            .select("id")
            .eq("name", tagName)
            .single();
            
        if (existingTag) {
            tagIds.push(existingTag.id);
        } else {
            // Create
            const slug = "TAG_" + tagName.toUpperCase().replace(/[^A-Z0-9]/g, "_"); // Simple slug
            const { data: newTag, error } = await admin
                .from("tags")
                .insert({
                    name: tagName,
                    slug: slug, // Assuming slug is required and unique
                    sort: 0,
                    category: "A3" // Activity/General category
                })
                .select()
                .single();
            
            if (newTag) tagIds.push(newTag.id);
            else console.error("Failed to create tag", tagName, error);
        }
    }

    // 2. Create Blog Post
    const { tags, ...postData } = EXAMPLE_BLOG_POST;
    
    // Check if post exists by slug
    const { data: existingPost } = await admin
        .from("blog_posts")
        .select("id")
        .eq("slug", postData.slug)
        .single();
        
    if (existingPost) {
        return NextResponse.json({ message: "Example post already exists." });
    }

    const { data: newPost, error: postError } = await admin
        .from("blog_posts")
        .insert({
            ...postData,
            published_at: new Date().toISOString()
        })
        .select()
        .single();

    if (postError) {
        return NextResponse.json({ error: postError.message }, { status: 500 });
    }

    // 3. Link Tags
    if (tagIds.length > 0) {
        const tagMap = tagIds.map(tagId => ({
            blog_post_id: newPost.id,
            tag_id: tagId
        }));
        
        await admin.from("blog_post_tag_map").insert(tagMap);
    }

    return NextResponse.json({ success: true, post: newPost });
  } catch (err) {
    console.error("Migration error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
