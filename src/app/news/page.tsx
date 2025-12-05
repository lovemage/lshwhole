"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  cover_image: string | null;
  published_at: string;
  tags: Tag[];
}

interface Tag {
  id: number;
  name: string;
}

export default function NewsPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await fetch("/api/blog-posts?status=published");
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
    fetchPosts();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">海外新訊</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                掌握最新的海外批發趨勢、品牌動態與代購技巧。
            </p>
        </div>

        {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse">
                        <div className="bg-gray-200 h-48 rounded-xl mb-4"></div>
                        <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                ))}
            </div>
        ) : posts.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
                目前尚無文章
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {posts.map(post => (
                    <Link key={post.id} href={`/news/${post.slug}`} className="group flex flex-col">
                        <div className="relative aspect-[16/9] mb-4 overflow-hidden rounded-xl bg-gray-100">
                            {post.cover_image ? (
                                <img 
                                    src={post.cover_image} 
                                    alt={post.title} 
                                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                                />
                            ) : (
                                <div className="flex items-center justify-center w-full h-full text-gray-400">
                                    <span className="material-symbols-outlined text-4xl">article</span>
                                </div>
                            )}
                        </div>
                        <div className="flex-1">
                            <div className="flex gap-2 mb-2">
                                {post.tags?.map(tag => (
                                    <span key={tag.id} className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                                        {tag.name}
                                    </span>
                                ))}
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 group-hover:text-primary transition-colors mb-2 line-clamp-2">
                                {post.title}
                            </h2>
                            <p className="text-gray-600 text-sm line-clamp-3 mb-4">
                                {post.excerpt}
                            </p>
                            <div className="text-xs text-gray-500 mt-auto">
                                {new Date(post.published_at || Date.now()).toLocaleDateString()}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
