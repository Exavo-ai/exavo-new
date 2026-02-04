import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Newspaper } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featured_image: string | null;
  status: string;
  created_at: string;
};

export default function Blog() {
  const { language } = useLanguage();

  const { data: posts, isLoading, error } = useQuery({
    queryKey: ["public-blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, featured_image, status, created_at")
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as BlogPost[];
    },
  });

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
              <div className="grid gap-6 sm:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
                {posts?.map((post, index) => (
                  <Link
                    key={post.id}
                    to={`/blog/${post.slug}`}
                    className="group animate-fade-in-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <Card className="overflow-hidden border-border hover:border-primary/50 transition-all hover:-translate-y-2 shadow-card h-full">
                      {/* Image */}
                      <div className="relative aspect-video overflow-hidden bg-muted">
                        {post.featured_image ? (
                          <img
                            src={post.featured_image}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Newspaper className="w-12 h-12 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      <CardContent className="p-5 space-y-3">
                        {/* Date */}
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(post.created_at), "MMMM d, yyyy")}
                        </p>

                        {/* Title */}
                        <h2 className="text-lg font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                          {post.title}
                        </h2>

                        {/* Excerpt */}
                        {post.excerpt && (
                          <p className="text-muted-foreground line-clamp-3">
                            {post.excerpt}
                          </p>
                        )}

                        {/* Read more */}
                        <p className="text-primary font-medium text-sm group-hover:underline">
                          Read more →
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
