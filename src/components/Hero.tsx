import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import DemoRequestDialog from "@/components/DemoRequestDialog";

const Hero = () => {
  const { language } = useLanguage();
  const [demoDialogOpen, setDemoDialogOpen] = useState(false);

  return (
    <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden px-4 sm:px-6 pt-28 sm:pt-32 pb-16">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-primary/15 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-secondary/10 rounded-full blur-[100px]" />

      <div className="container mx-auto relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-6 animate-fade-in">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight text-foreground">
            {language === 'ar' 
              ? 'وكلاء ذكاء اصطناعي لكل عمل'
              : 'AI Agents for Every Business'}
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {language === 'ar'
              ? 'أتمتة سير العمل، تعزيز الإنتاجية، وتوسيع نطاق أعمالك بحلول ذكاء اصطناعي جاهزة للاستخدام.'
              : 'Automate workflows, boost productivity, and scale your business with ready-to-deploy AI solutions.'}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              variant="hero"
              size="lg"
              className="text-base sm:text-lg px-10 h-14 font-semibold shadow-glow"
              onClick={() => setDemoDialogOpen(true)}
            >
              {language === 'ar' ? 'احجز جلسة استراتيجية' : 'Book a Strategy Session'}
              <ArrowRight className="w-5 h-5" />
            </Button>

            <Link to="/playground">
              <Button
                variant="hero"
                size="lg"
                className="text-base sm:text-lg px-10 h-14 font-semibold opacity-85 shadow-md hover:opacity-95 gap-2"
              >
                <Sparkles className="w-5 h-5" />
                {language === 'ar' ? 'جرّب عروضنا' : 'Try Our Demos'}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <DemoRequestDialog open={demoDialogOpen} onOpenChange={setDemoDialogOpen} />
    </section>
  );
};

export default Hero;
