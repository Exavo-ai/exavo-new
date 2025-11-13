import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const CTA = () => {
  const { t } = useLanguage();

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10"></div>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
            Ready to Transform Your Business with <span className="bg-gradient-hero bg-clip-text text-transparent">AI?</span>
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="lg" className="group shadow-glow">
              {t('common.getStarted')}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="outline" size="lg">
              <Calendar className="w-4 h-4" />
              {t('common.bookDemo')}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
