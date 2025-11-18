import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  Globe2, 
  Users, 
  Building2, 
  Mail, 
  Sparkles,
  Shield,
  Zap,
  Target
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const About = () => {
  const { t, language } = useLanguage();

  const stats = [
    { value: "500+", label: t('about.stats.clients'), icon: Users },
    { value: "20+", label: t('about.stats.countries'), icon: Globe2 },
    { value: "24/7", label: t('about.stats.team'), icon: Sparkles }
  ];

  const values = [
    {
      icon: Sparkles,
      title: t('about.values.innovation.title'),
      description: t('about.values.innovation.desc')
    },
    {
      icon: Shield,
      title: t('about.values.security.title'),
      description: t('about.values.security.desc')
    },
    {
      icon: Zap,
      title: t('about.values.efficiency.title'),
      description: t('about.values.efficiency.desc')
    },
    {
      icon: Target,
      title: t('about.values.precision.title'),
      description: t('about.values.precision.desc')
    }
  ];

  const contactCards = [
    {
      icon: Users,
      title: t('about.contact.sales.title'),
      email: "sales@exavo.ai",
      description: t('about.contact.sales.desc')
    },
    {
      icon: Shield,
      title: t('about.contact.support.title'),
      email: "support@exavo.ai",
      description: t('about.contact.support.desc')
    },
    {
      icon: Mail,
      title: t('about.contact.general.title'),
      email: "info@exavo.ai",
      description: t('about.contact.general.desc')
    }
  ];

  return (
    <div className="min-h-screen" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <Navigation />
      <main>
        {/* Vision Hero Section */}
        <section className="relative overflow-hidden pt-32 pb-20">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5"></div>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-4xl mx-auto text-center space-y-6 animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-accent border border-primary/20 mb-4">
                <Building2 className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">{t('about.hero.badge')}</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold">
                {t('about.hero.title')}
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                {t('about.hero.subtitle')}
              </p>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 bg-gradient-accent">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {stats.map((stat, index) => (
                <Card 
                  key={index}
                  className="border-border bg-card hover:shadow-card transition-all hover:-translate-y-1 animate-fade-in-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardContent className="pt-6 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-hero flex items-center justify-center shadow-glow">
                      <stat.icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-4xl font-bold text-foreground mb-2">{stat.value}</div>
                    <div className="text-muted-foreground">{stat.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Who We Are Section */}
        <section className="py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="space-y-6 animate-fade-in">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-accent border border-primary/20">
                    <Building2 className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">{t('about.who.badge')}</span>
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-bold">
                    {t('about.who.title')}
                  </h2>
                  <div className="space-y-4 text-lg text-muted-foreground">
                    <p>{t('about.who.para1')}</p>
                    <p>{t('about.who.para2')}</p>
                    <p>{t('about.who.para3')}</p>
                  </div>
                  <div className="flex flex-wrap gap-3 pt-4">
                    <div className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                      {t('about.who.tag1')}
                    </div>
                    <div className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                      {t('about.who.tag2')}
                    </div>
                    <div className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                      {t('about.who.tag3')}
                    </div>
                  </div>
                </div>
                <div className="relative h-96 rounded-2xl overflow-hidden shadow-card animate-fade-in-up">
                  <div className="absolute inset-0 bg-gradient-card"></div>
                  <img 
                    src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=600&fit=crop" 
                    alt={t('about.who.imageAlt')}
                    className="absolute inset-0 w-full h-full object-cover opacity-80"
                  />
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
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                  {t('about.values.title')}
                </h2>
                <p className="text-lg text-muted-foreground">
                  {t('about.values.subtitle')}
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                {values.map((value, index) => (
                  <Card
                    key={index}
                    className="border-border hover:border-primary/50 transition-all hover:-translate-y-2 shadow-card animate-fade-in-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CardContent className="pt-6">
                      <div className="w-12 h-12 rounded-lg bg-gradient-hero flex items-center justify-center mb-4">
                        <value.icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">{value.title}</h3>
                      <p className="text-muted-foreground">{value.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Global Network Section */}
        <section className="py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                  {t('about.global.title')}
                </h2>
                <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                  {t('about.global.subtitle')}
                </p>
              </div>

              <div className="relative h-96 rounded-2xl overflow-hidden border border-border shadow-card">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Globe2 className="w-64 h-64 text-primary/20" strokeWidth={0.5} />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center space-y-4 p-8">
                    <h3 className="text-2xl font-bold">{t('about.global.presence')}</h3>
                    <p className="text-muted-foreground max-w-md">
                      {t('about.global.description')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="py-20 bg-gradient-accent">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                  {t('about.contact.title')}
                </h2>
                <p className="text-lg text-muted-foreground">
                  {t('about.contact.subtitle')}
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                {contactCards.map((card, index) => (
                  <Card
                    key={index}
                    className="border-border hover:border-primary/50 transition-all hover:-translate-y-2 shadow-card animate-fade-in-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CardContent className="pt-6 text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-hero flex items-center justify-center shadow-glow">
                        <card.icon className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">{card.title}</h3>
                      <p className="text-muted-foreground mb-4 text-sm">{card.description}</p>
                      <a 
                        href={`mailto:${card.email}`}
                        className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
                      >
                        <Mail className="w-4 h-4" />
                        {card.email}
                      </a>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="text-center mt-12">
                <Button 
                  variant="hero" 
                  size="lg"
                  onClick={() => window.location.href = '/contact'}
                  className="shadow-glow"
                >
                  {t('about.contact.cta')}
                </Button>
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
