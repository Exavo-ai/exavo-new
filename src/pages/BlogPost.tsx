import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Instagram, Linkedin, Facebook, ArrowLeft, Calendar } from "lucide-react";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";

type SocialPost = {
  id: string;
  platform: "Instagram" | "Facebook" | "LinkedIn";
  caption: string;
  image_url: string;
  status: "pending" | "approved" | "changes_requested";
  created_at: string;
  published_at: string | null;
  slug: string;
};

const platformIcons = {
  Instagram: Instagram,
  Facebook: Facebook,
  LinkedIn: Linkedin,
};

const platformColors = {
  Instagram: "bg-gradient-to-r from-purple-500 to-pink-500",
  Facebook: "bg-blue-600",
  LinkedIn: "bg-blue-700",
};

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const { language } = useLanguage();

  const { data: post, isLoading, error } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_posts")
        .select("*")
        .eq("slug", slug)
        .eq("status", "approved")
        .single();

      if (error) throw error;
      return data as SocialPost;
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

  const PlatformIcon = platformIcons[post.platform];
  const publishDate = post.published_at || post.created_at;

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
            {/* Image */}
            <div className="relative rounded-2xl overflow-hidden mb-8 shadow-card">
              <img
                src={post.image_url}
                alt="Post image"
                className="w-full aspect-video object-cover"
              />
              <Badge
                className={`absolute top-4 left-4 ${platformColors[post.platform]} text-white border-0 text-sm px-3 py-1`}
              >
                <PlatformIcon className="w-4 h-4 mr-1.5" />
                {post.platform}
              </Badge>
            </div>

            {/* Meta */}
            <div className="flex items-center gap-3 text-muted-foreground mb-6">
              <Calendar className="w-4 h-4" />
              <time dateTime={publishDate}>
                {format(new Date(publishDate), "MMMM d, yyyy")}
              </time>
            </div>

            {/* Content */}
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <p className="text-lg leading-relaxed whitespace-pre-wrap">
                {post.caption}
              </p>
            </div>

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
