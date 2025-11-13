import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const Blog = () => {
  const posts = [
    {
      title: "The Future of AI in Business: Trends for 2025",
      excerpt: "Explore the emerging AI trends that will reshape business operations and customer experiences in the coming year.",
      category: "AI Trends",
      date: "November 10, 2025",
      readTime: "5 min read",
      image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&auto=format&fit=crop"
    },
    {
      title: "How AI Chatbots Are Revolutionizing Customer Service",
      excerpt: "Learn how intelligent chatbots are transforming customer interactions and driving satisfaction scores to new heights.",
      category: "Customer Experience",
      date: "November 5, 2025",
      readTime: "7 min read",
      image: "https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=800&auto=format&fit=crop"
    },
    {
      title: "Automating Business Processes with Machine Learning",
      excerpt: "Discover practical applications of ML automation that can reduce operational costs by up to 70%.",
      category: "Automation",
      date: "October 28, 2025",
      readTime: "6 min read",
      image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&auto=format&fit=crop"
    },
    {
      title: "AI Ethics and Data Privacy: What Your Business Needs to Know",
      excerpt: "Navigate the complex landscape of AI ethics, data privacy regulations, and best practices for responsible AI implementation.",
      category: "Security & Ethics",
      date: "October 20, 2025",
      readTime: "8 min read",
      image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop"
    },
    {
      title: "Predictive Analytics: Turning Data into Business Intelligence",
      excerpt: "Harness the power of predictive analytics to forecast trends, optimize resources, and make data-driven decisions.",
      category: "Analytics",
      date: "October 15, 2025",
      readTime: "6 min read",
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop"
    },
    {
      title: "Building Your First AI Strategy: A Step-by-Step Guide",
      excerpt: "A comprehensive guide for businesses looking to develop and implement an effective AI transformation strategy.",
      category: "Strategy",
      date: "October 8, 2025",
      readTime: "10 min read",
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop"
    }
  ];

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-32 pb-20">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5"></div>
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
          
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-4xl mx-auto text-center space-y-6 animate-fade-in">
              <Badge className="px-6 py-2 bg-gradient-accent border-0">
                Latest Insights
              </Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold">
                AI Insights & <span className="bg-gradient-hero bg-clip-text text-transparent">Industry News</span>
              </h1>
              <p className="text-xl text-muted-foreground">
                Stay updated with the latest trends, guides, and insights in artificial intelligence and business automation
              </p>
            </div>
          </div>
        </section>

        {/* Featured Post */}
        <section className="py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="max-w-6xl mx-auto overflow-hidden hover:shadow-glow transition-all group">
              <div className="grid md:grid-cols-2 gap-0">
                <div 
                  className="h-64 md:h-auto bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                  style={{ backgroundImage: `url(${posts[0].image})` }}
                />
                <CardContent className="p-8 lg:p-12 flex flex-col justify-center">
                  <Badge className="w-fit mb-4">{posts[0].category}</Badge>
                  <h2 className="text-3xl font-bold mb-4 group-hover:text-primary transition-colors">
                    {posts[0].title}
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    {posts[0].excerpt}
                  </p>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground mb-6">
                    <span className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {posts[0].date}
                    </span>
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {posts[0].readTime}
                    </span>
                  </div>
                  <Button variant="default" className="w-fit group/btn">
                    Read More
                    <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </div>
            </Card>
          </div>
        </section>

        {/* Blog Grid */}
        <section className="py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {posts.slice(1).map((post, index) => (
                  <Card 
                    key={index}
                    className="overflow-hidden hover:shadow-glow transition-all hover:-translate-y-2 group cursor-pointer animate-fade-in-up"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div 
                      className="h-48 bg-cover bg-center group-hover:scale-110 transition-transform duration-500"
                      style={{ backgroundImage: `url(${post.image})` }}
                    />
                    <CardContent className="p-6">
                      <Badge className="mb-3">{post.category}</Badge>
                      <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">
                        {post.title}
                      </h3>
                      <p className="text-muted-foreground mb-4 line-clamp-2">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {post.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {post.readTime}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Newsletter CTA */}
        <section className="py-20 bg-gradient-accent/50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="max-w-4xl mx-auto p-12 text-center bg-gradient-card border-primary/20">
              <h2 className="text-3xl font-bold mb-4">
                Subscribe to Our Newsletter
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Get the latest AI insights and industry updates delivered to your inbox
              </p>
              <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-3 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Button size="lg" className="bg-gradient-hero hover:shadow-glow-lg transition-all">
                  Subscribe
                </Button>
              </div>
            </Card>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Blog;
