import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Calendar } from "lucide-react";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import { BlogContent } from "@/components/BlogContent";
import { BlogGallery } from "@/components/BlogGallery";
import { BlogVideoEmbed } from "@/components/BlogVideoEmbed";

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  featured_image: string | null;
  gallery_images: string[];
  uploaded_video: string | null;
  video_url: string | null;
  status: string;
  created_at: string;
};

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const { language } = useLanguage();

  const { data: post, isLoading, error } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .single();

      if (error) throw error;
      return data as BlogPost;
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen" dir={language === "ar" ? "rtl" : "ltr"}>
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen" dir={language === "ar" ? "rtl" : "ltr"}>
        <Navigation />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">Post not found</h1>
          <p className="text-muted-foreground mb-8">
            The post you're looking for doesn't exist or has been removed.
          </p>
          <Button asChild>
            <Link to="/blog">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen" dir={language === "ar" ? "rtl" : "ltr"}>
      <Navigation />
      <main>
        {/* Back button */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <Button variant="ghost" asChild className="mb-6">
            <Link to="/blog">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Link>
          </Button>
        </div>

        {/* Article */}
        <article className="container mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="max-w-3xl mx-auto">
            {/* Featured Image */}
            {post.featured_image && (
              <div className="relative rounded-2xl overflow-hidden mb-8 shadow-card">
                <img
                  src={post.featured_image}
                  alt={post.title}
                  className="w-full aspect-video object-cover"
                />
              </div>
            )}

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl font-bold mb-4">
              {post.title}
            </h1>

            {/* Meta */}
            <div className="flex items-center gap-3 text-muted-foreground mb-8">
              <Calendar className="w-4 h-4" />
              <time dateTime={post.created_at}>
                {format(new Date(post.created_at), "MMMM d, yyyy")}
              </time>
            </div>

            {/* Content */}
            {post.content && <BlogContent content={post.content} />}

            {/* Video */}
            <BlogVideoEmbed
              uploadedVideo={post.uploaded_video}
              videoUrl={post.video_url}
            />

            {/* Gallery */}
            <BlogGallery images={post.gallery_images || []} />

            {/* Share / CTA section */}
            <div className="mt-12 pt-8 border-t border-border">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-muted-foreground">
                  Want to learn more about our AI solutions?
                </p>
                <Button asChild variant="hero">
                  <Link to="/contact">Get in Touch</Link>
                </Button>
              </div>
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
