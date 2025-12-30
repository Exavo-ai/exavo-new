import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Instagram, Linkedin, Facebook, Newspaper } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
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

export default function Blog() {
  const { language } = useLanguage();

  const { data: posts, isLoading, error } = useQuery({
    queryKey: ["blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_posts")
        .select("*")
        .eq("status", "approved")
        .order("published_at", { ascending: false, nullsFirst: false });

      if (error) throw error;
      return data as SocialPost[];
    },
  });

  const truncateCaption = (caption: string, maxLength = 150) => {
    if (caption.length <= maxLength) return caption;
    return caption.substring(0, maxLength).trim() + "...";
  };

  return (
    <div className="min-h-screen" dir={language === "ar" ? "rtl" : "ltr"}>
      <Navigation />
      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-32 pb-20">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5"></div>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-4xl mx-auto text-center space-y-6 animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-accent border border-primary/20 mb-4">
                <Newspaper className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Blog & Updates</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold">
                Latest from Exavo AI
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Stay updated with our latest news, insights, and announcements
              </p>
            </div>
          </div>
        </section>

        {/* Posts Grid */}
        <section className="py-16 bg-gradient-accent">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            {isLoading ? (
              <div className="flex items-center justify-center min-h-[300px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Failed to load posts</p>
              </div>
            ) : posts?.length === 0 ? (
              <div className="text-center py-12">
                <Newspaper className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No posts yet</p>
                <p className="text-muted-foreground">Check back soon for updates!</p>
              </div>
            ) : (
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
                {posts?.map((post, index) => {
                  const PlatformIcon = platformIcons[post.platform];
                  const publishDate = post.published_at || post.created_at;

                  return (
                    <Link
                      key={post.id}
                      to={`/blog/${post.slug}`}
                      className="group animate-fade-in-up"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <Card className="overflow-hidden border-border hover:border-primary/50 transition-all hover:-translate-y-2 shadow-card h-full">
                        {/* Image */}
                        <div className="relative aspect-video overflow-hidden">
                          <img
                            src={post.image_url}
                            alt="Post preview"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <Badge
                            className={`absolute top-3 left-3 ${platformColors[post.platform]} text-white border-0`}
                          >
                            <PlatformIcon className="w-3 h-3 mr-1" />
                            {post.platform}
                          </Badge>
                        </div>

                        <CardContent className="p-5 space-y-3">
                          {/* Date */}
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(publishDate), "MMMM d, yyyy")}
                          </p>

                          {/* Caption preview */}
                          <p className="text-foreground line-clamp-3">
                            {truncateCaption(post.caption)}
                          </p>

                          {/* Read more */}
                          <p className="text-primary font-medium text-sm group-hover:underline">
                            Read more →
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
