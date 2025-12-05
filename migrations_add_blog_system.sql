-- Create blog_posts table
CREATE TABLE IF NOT EXISTS blog_posts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  content text,
  excerpt text,
  cover_image text,
  seo_title text,
  seo_description text,
  seo_keywords text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create blog_post_tag_map table
CREATE TABLE IF NOT EXISTS blog_post_tag_map (
  blog_post_id bigint REFERENCES blog_posts(id) ON DELETE CASCADE,
  tag_id bigint REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (blog_post_id, tag_id)
);

-- Add index for slug
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
-- Add index for status
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);

-- Enable RLS
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_post_tag_map ENABLE ROW LEVEL SECURITY;

-- Policies for blog_posts
-- Allow public read access to published posts
CREATE POLICY "Public can view published posts" ON blog_posts
  FOR SELECT
  USING (status = 'published');

-- Allow service_role (and admins) full access
CREATE POLICY "Service role full access posts" ON blog_posts
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Policies for blog_post_tag_map
CREATE POLICY "Public can view tag maps" ON blog_post_tag_map
  FOR SELECT
  USING (true);

CREATE POLICY "Service role full access tag maps" ON blog_post_tag_map
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
