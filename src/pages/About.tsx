import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { Target, Eye, Users, Zap } from "lucide-react";

const About = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen">
      <Navigation />
      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-32 pb-20">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5"></div>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-4xl mx-auto text-center space-y-6 animate-fade-in">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold">
                {t('about.title')}
              </h1>
              <p className="text-xl text-muted-foreground">
                {t('about.description')}
              </p>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="space-y-6 animate-fade-in">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-accent border border-primary/20">
                    <Target className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Our Mission</span>
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-bold">
                    {t('about.mission')}
                  </h2>
                  <p className="text-lg text-muted-foreground">
                    At Exavo AI, we believe that artificial intelligence should empower every business, 
                    regardless of size or industry. We're breaking down the barriers to AI adoption by 
                    providing intuitive tools, expert guidance, and seamless integration solutions.
                  </p>
                </div>
                <div className="relative h-96 rounded-2xl overflow-hidden shadow-card animate-fade-in-up">
                  <div className="absolute inset-0 bg-gradient-card"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-64 h-64 bg-primary/20 rounded-full blur-3xl"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-20 bg-gradient-accent">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">Our Core Values</h2>
                <p className="text-lg text-muted-foreground">
                  The principles that guide everything we do
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                  {
                    icon: Target,
                    title: "Innovation",
                    description: "Pushing the boundaries of what's possible with AI"
                  },
                  {
                    icon: Eye,
                    title: "Transparency",
                    description: "Clear communication and honest partnerships"
                  },
                  {
                    icon: Users,
                    title: "Accessibility",
                    description: "Making AI tools available to everyone"
                  },
                  {
                    icon: Zap,
                    title: "Excellence",
                    description: "Delivering exceptional quality in every solution"
                  }
                ].map((value, index) => (
                  <div
                    key={index}
                    className="bg-card rounded-xl p-6 border border-border hover:border-primary/50 transition-all hover:-translate-y-2 shadow-card animate-fade-in-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="w-12 h-12 rounded-lg bg-gradient-hero flex items-center justify-center mb-4">
                      <value.icon className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{value.title}</h3>
                    <p className="text-muted-foreground">{value.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">Meet Our Founder</h2>
                <p className="text-lg text-muted-foreground">
                  Passionate about transforming businesses through AI
                </p>
              </div>
              
              <div className="max-w-2xl mx-auto">
                <div className="bg-card rounded-2xl p-8 border border-border shadow-card text-center">
                  <div className="w-32 h-32 rounded-full bg-gradient-hero mx-auto mb-6"></div>
                  <h3 className="text-2xl font-bold mb-2">Ahmed</h3>
                  <p className="text-primary mb-4">Founder & CEO</p>
                  <p className="text-muted-foreground">
                    "My vision is to democratize AI technology and make it accessible to businesses 
                    of all sizes. At Exavo AI, we're not just building tools – we're building the 
                    future of intelligent business operations."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default About;
