import Navigation from "@/components/Navigation";
import aboutHeroImage from "@/assets/about-hero.jpeg";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  Building2, 
  Mail, 
  Users,
  Shield,
  Layers,
  Target,
  TrendingUp,
  UserCheck,
  Code2,
  ShieldCheck,
  Rocket
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const About = () => {
  const { language } = useLanguage();

  const principles = [
    {
      icon: Layers,
      title: language === "ar" ? "تفكير منظومي" : "Systems Thinking",
      description: language === "ar"
        ? "نصمم بيئات ذكاء اصطناعي مترابطة، وليس أدوات منفصلة."
        : "We design interconnected AI environments, not standalone tools.",
    },
    {
      icon: Target,
      title: language === "ar" ? "تنفيذ منظم" : "Structured Implementation",
      description: language === "ar"
        ? "عملية واضحة، مراحل محددة، ومعالم قابلة للقياس."
        : "Clear process, defined phases, measurable milestones.",
    },
    {
      icon: TrendingUp,
      title: language === "ar" ? "تنفيذ مدفوع بالعائد" : "ROI-Driven Execution",
      description: language === "ar"
        ? "كل نظام يجب أن يحسن الأداء أو الكفاءة."
        : "Every system must improve performance or efficiency.",
    },
    {
      icon: Shield,
      title: language === "ar" ? "تحسين طويل الأمد" : "Long-Term Optimization",
      description: language === "ar"
        ? "أنظمة الذكاء الاصطناعي تتطور مع نمو أعمالك."
        : "AI systems evolve as your business grows.",
    },
  ];

  const implementationModel = [
    {
      icon: UserCheck,
      title: language === "ar" ? "استراتيجيون متخصصون في الذكاء الاصطناعي" : "Dedicated AI Strategists",
      description: language === "ar"
        ? "نقطة اتصال واحدة للمتطلبات وخارطة الطريق والتقدم."
        : "Your single point of contact for requirements, roadmap, and progress.",
    },
    {
      icon: Code2,
      title: language === "ar" ? "فرق التنفيذ التقني" : "Technical Implementation Teams",
      description: language === "ar"
        ? "مهندسون ومتخصصون يبنون وينشرون أنظمة الذكاء الاصطناعي الخاصة بك."
        : "Engineers and specialists who build, integrate, and deploy your AI systems.",
    },
    {
      icon: ShieldCheck,
      title: language === "ar" ? "إشراف الجودة والأداء" : "Quality & Performance Oversight",
      description: language === "ar"
        ? "مراقبة واختبار وتحسين مستمر لضمان نتائج قابلة للقياس."
        : "Continuous monitoring, testing, and optimization to ensure measurable results.",
    },
  ];

  const contactCards = [
    {
      icon: Users,
      title: language === "ar" ? "المبيعات" : "Sales",
      email: "sales@exavo.ai",
      description: language === "ar" ? "تحدث مع فريق المبيعات" : "Talk to our sales team",
    },
    {
      icon: Shield,
      title: language === "ar" ? "الدعم" : "Support",
      email: "support@exavo.ai",
      description: language === "ar" ? "احصل على المساعدة التقنية" : "Get technical help",
    },
    {
      icon: Mail,
      title: language === "ar" ? "عام" : "General",
      email: "info@exavo.ai",
      description: language === "ar" ? "استفسارات عامة" : "General inquiries",
    },
  ];

  return (
    <div className="min-h-screen" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <Navigation />
      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-32 pb-20">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5"></div>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-4xl mx-auto text-center space-y-6 animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-accent border border-primary/20 mb-4">
                <Building2 className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">
                  {language === "ar" ? "من نحن" : "About Exavo"}
                </span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold">
                {language === "ar"
                  ? "بناء بنية تحتية للذكاء الاصطناعي للشركات المستعدة للتوسع"
                  : "Building AI Infrastructure for Companies Ready to Scale"}
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                {language === "ar"
                  ? "Exavo هي وكالة تنفيذ ذكاء اصطناعي قابلة للتوسع تصمم وتنشر أنظمة ذكية عبر العمليات والإيرادات وسير عمل العملاء."
                  : "Exavo is a scalable AI implementation agency designing and deploying intelligent systems across operations, revenue, and customer workflows."}
              </p>
            </div>
          </div>
        </section>

        {/* Who We Are */}
        <section className="py-20 bg-gradient-accent">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="space-y-6 animate-fade-in">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-accent border border-primary/20">
                    <Building2 className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">
                      {language === "ar" ? "من نحن" : "Who We Are"}
                    </span>
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-bold">
                    {language === "ar" ? "من نحن" : "Who We Are"}
                  </h2>
                  <div className="space-y-4 text-lg text-muted-foreground">
                    <p>
                      {language === "ar"
                        ? "Exavo هي وكالة تنفيذ ذكاء اصطناعي تركز على بناء أنظمة ذكاء اصطناعي منظمة وقابلة للتوسع للشركات في مرحلة النمو."
                        : "Exavo is an AI implementation agency focused on building structured, scalable AI systems for growth-stage companies."}
                    </p>
                    <p>
                      {language === "ar"
                        ? "نحن نصمم بنية تحتية تشغيلية — وليس أتمتة معزولة."
                        : "We architect operational infrastructure — not isolated automations."}
                    </p>
                    <p>
                      {language === "ar"
                        ? "يمتد عملنا عبر أنظمة الإيرادات وسير العمل التشغيلي وبيئات الذكاء الاصطناعي متعددة الوكلاء المصممة للتوسع مع أعمالك."
                        : "Our work spans revenue systems, operational workflows, and multi-agent AI environments designed to scale with your business."}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3 pt-4">
                    <div className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                      {language === "ar" ? "أنظمة الإيرادات" : "Revenue Systems"}
                    </div>
                    <div className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                      {language === "ar" ? "البنية التحتية التشغيلية" : "Operational Infrastructure"}
                    </div>
                    <div className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                      {language === "ar" ? "أنظمة متعددة الوكلاء" : "Multi-Agent Systems"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center rounded-2xl shadow-card animate-fade-in-up bg-gradient-card">
                   <img 
                      src={aboutHeroImage}
                      alt={language === "ar" ? "فريق Exavo" : "Exavo AI - End-to-end AI Solutions"}
                      className="w-full h-auto object-contain rounded-2xl"
                   />
                 </div>
              </div>
            </div>
          </div>
        </section>

        {/* Operating Principles */}
        <section className="py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                  {language === "ar" ? "مبادئنا التشغيلية" : "Our Operating Principles"}
                </h2>
                <p className="text-lg text-muted-foreground">
                  {language === "ar"
                    ? "المبادئ التي توجه كل تطبيق نقوم به"
                    : "The principles that guide every implementation we deliver"}
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
                {principles.map((item, index) => (
                  <Card
                    key={index}
                    className="border-border hover:border-primary/50 transition-all hover:-translate-y-2 shadow-card animate-fade-in-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CardContent className="pt-6">
                      <div className="w-12 h-12 rounded-lg bg-gradient-hero flex items-center justify-center mb-4">
                        <item.icon className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                      <p className="text-muted-foreground">{item.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Implementation Model */}
        <section className="py-20 bg-gradient-accent">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                  {language === "ar" ? "نموذج التنفيذ لدينا" : "Our Implementation Model"}
                </h2>
                <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                  {language === "ar"
                    ? "تعمل Exavo من خلال إطار تنفيذ منظم يضمن الموثوقية وقابلية التوسع والتسليم المتسق عبر المشاريع."
                    : "Exavo operates through a structured implementation framework that ensures reliability, scalability, and consistent delivery across projects."}
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
                {implementationModel.map((item, index) => (
                  <Card
                    key={index}
                    className="border-border hover:border-primary/50 transition-all hover:-translate-y-2 shadow-card animate-fade-in-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CardContent className="pt-6 text-center">
                      <div className="w-14 h-14 rounded-full bg-gradient-hero flex items-center justify-center mx-auto mb-6 shadow-glow">
                        <item.icon className="w-7 h-7 text-primary-foreground" strokeWidth={2} />
                      </div>
                      <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Built for Scale */}
        <section className="py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center space-y-6 animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-accent border border-primary/20">
                <Rocket className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">
                  {language === "ar" ? "مبني للتوسع" : "Built for Scale"}
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold">
                {language === "ar" ? "مبني للتوسع" : "Built for Scale"}
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto">
                {language === "ar"
                  ? "لقد صممنا Exavo لدعم الشركات عبر مراحل مختلفة من نضج الذكاء الاصطناعي — من سباقات أنظمة الذكاء الاصطناعي المركزة إلى عمليات نشر البنية التحتية الكاملة وشراكات التحسين طويلة الأمد."
                  : "We've designed Exavo to support companies across different stages of AI maturity — from focused AI System Sprints to full infrastructure deployments and long-term optimization partnerships."}
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto">
                {language === "ar"
                  ? "منهجيتنا المنظمة تسمح لنا بتوسيع التسليم دون المساس بالجودة."
                  : "Our structured methodology allows us to scale delivery without compromising quality."}
              </p>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="py-20 bg-gradient-accent">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                  {language === "ar" ? "تواصل معنا" : "Get in Touch"}
                </h2>
                <p className="text-lg text-muted-foreground">
                  {language === "ar" ? "نحن هنا لمساعدتك" : "We're here to help"}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-8">
                {contactCards.map((card, index) => (
                  <Card
                    key={index}
                    className="border-border hover:border-primary/50 transition-all hover:-translate-y-2 shadow-card animate-fade-in-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CardContent className="pt-6 text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-hero flex items-center justify-center shadow-glow">
                        <card.icon className="w-8 h-8 text-primary-foreground" />
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
                  {language === "ar" ? "تواصل معنا" : "Contact Us"}
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
