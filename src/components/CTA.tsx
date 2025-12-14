import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import DemoRequestDialog from "@/components/DemoRequestDialog";

const CTA = () => {
  const { language } = useLanguage();
  const [demoDialogOpen, setDemoDialogOpen] = useState(false);
  return (
    <section className="py-16 lg:py-20 relative overflow-hidden bg-muted/30">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/50 to-primary/5"></div>
      
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-20"></div>
      
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground animate-fade-in">
            {language === 'ar' 
              ? 'هل أنت مستعد لتحويل أعمالك؟'
              : 'Ready to Transform Your Business?'}
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.1s' }}>
            {language === 'ar'
              ? 'احجز عرضًا توضيحيًا مجانيًا واكتشف كيف يمكننا مساعدتك'
              : 'Book a free demo and discover how we can help your business grow with AI'}
          </p>
          <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <Button 
              variant="hero" 
              size="lg"
              className="text-base sm:text-lg px-10 h-14 font-semibold"
              onClick={() => setDemoDialogOpen(true)}
            >
              {language === 'ar' ? 'اطلب عرضًا توضيحيًا' : 'Request a Demo'}
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <DemoRequestDialog open={demoDialogOpen} onOpenChange={setDemoDialogOpen} />
    </section>
  );
};

export default CTA;
