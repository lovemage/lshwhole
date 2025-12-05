"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import "react-quill-new/dist/quill.snow.css";

interface BlogPost {
  id: number;
  title: string;
  content: string;
  cover_image: string | null;
  published_at: string;
  tags: Tag[];
  seo_title: string;
  seo_description: string;
}

interface Tag {
  id: number;
  name: string;
}

export default function BlogPostPage() {
  const { slug } = useParams();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    const fetchPost = async () => {
      try {
        const res = await fetch(`/api/blog-posts?slug=${slug}`);
        if (res.ok) {
          const data = await res.json();
          setPost(data);
          
          if (data.seo_title) document.title = `${data.seo_title} | LshWholesale`;
          else document.title = `${data.title} | LshWholesale`;
          
          if (data.seo_description) {
              const metaDesc = document.querySelector('meta[name="description"]');
              if (metaDesc) metaDesc.setAttribute('content', data.seo_description);
          }
        }
      } catch (e) {
        console.error("Failed to fetch post", e);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [slug]);

  if (loading) {
      return (
          <div className="min-h-screen bg-white flex flex-col">
              <Header />
              <main className="flex-1 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </main>
              <Footer />
          </div>
      );
  }

  if (!post) {
      return (
          <div className="min-h-screen bg-white flex flex-col">
              <Header />
              <main className="flex-1 flex flex-col items-center justify-center space-y-4">
                  <h1 className="text-2xl font-bold text-gray-900">文章未找到</h1>
                  <Link href="/news" className="text-primary hover:underline">返回列表</Link>
              </main>
              <Footer />
          </div>
      );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <nav className="flex items-center text-sm text-gray-500 mb-8">
            <Link href="/" className="hover:text-primary">首頁</Link>
            <span className="mx-2">/</span>
            <Link href="/news" className="hover:text-primary">海外新訊</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900 truncate max-w-[200px]">{post.title}</span>
        </nav>

        <article className="prose prose-lg max-w-none">
            <header className="mb-8 not-prose">
                <div className="flex flex-wrap gap-2 mb-4">
                    {post.tags?.map(tag => (
                        <span key={tag.id} className="text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
                            {tag.name}
                        </span>
                    ))}
                </div>
                <h1 className="text-4xl font-bold text-gray-900 mb-4">{post.title}</h1>
                <div className="text-gray-500 text-sm">
                    {new Date(post.published_at || Date.now()).toLocaleDateString()}
                </div>
            </header>

            {post.cover_image && (
                <div className="mb-10 aspect-[21/9] rounded-2xl overflow-hidden bg-gray-100 not-prose">
                    <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover" />
                </div>
            )}

            <div className="ql-editor !p-0" dangerouslySetInnerHTML={{ __html: post.content }} />
        </article>
        
        <div className="mt-12 pt-8 border-t border-gray-200">
            <Link href="/news" className="inline-flex items-center text-primary font-medium hover:underline">
                <span className="material-symbols-outlined mr-1">arrow_back</span>
                返回列表
            </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
