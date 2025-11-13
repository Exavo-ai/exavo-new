import { Button } from "@/components/ui/button";
import { Menu, X, Globe } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border transition-all duration-300">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <a href="/" className="text-xl font-bold bg-gradient-hero bg-clip-text text-transparent hover:scale-105 transition-transform">
              Exavo AI
            </a>
            
            <div className="hidden md:flex items-center gap-6">
              <a href="/" className="text-sm font-medium hover:text-primary transition-all hover:scale-105">
                {t('nav.home')}
              </a>
              <a href="/about" className="text-sm font-medium hover:text-primary transition-all hover:scale-105">
                {t('nav.about')}
              </a>
              <a href="/services" className="text-sm font-medium hover:text-primary transition-all hover:scale-105">
                {t('nav.services')}
              </a>
              <a href="/pricing" className="text-sm font-medium hover:text-primary transition-all hover:scale-105">
                {t('nav.pricing')}
              </a>
              <a href="/contact" className="text-sm font-medium hover:text-primary transition-all hover:scale-105">
                {t('nav.contact')}
              </a>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={toggleLanguage} className="gap-2 hover:scale-105 transition-transform">
              <Globe className="w-4 h-4" />
              <span className="text-sm">{language === 'en' ? 'AR' : 'EN'}</span>
            </Button>
            <a href="/login">
              <Button variant="ghost" className="hover:scale-105 transition-transform">Sign In</Button>
            </a>
            <a href="/booking">
              <Button variant="hero" className="hover:scale-105 transition-transform">{t('hero.cta')}</Button>
            </a>
          </div>
          
          <button className="md:hidden hover:scale-110 transition-transform" onClick={() => setIsOpen(!isOpen)} aria-label="Toggle menu">
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
        
        {isOpen && (
          <div className="md:hidden py-4 space-y-4 border-t border-border animate-fade-in">
            <a href="/" className="block text-sm font-medium hover:text-primary transition-colors hover:translate-x-2">{t('nav.home')}</a>
            <a href="/about" className="block text-sm font-medium hover:text-primary transition-colors hover:translate-x-2">{t('nav.about')}</a>
            <a href="/services" className="block text-sm font-medium hover:text-primary transition-colors hover:translate-x-2">{t('nav.services')}</a>
            <a href="/pricing" className="block text-sm font-medium hover:text-primary transition-colors hover:translate-x-2">{t('nav.pricing')}</a>
            <a href="/contact" className="block text-sm font-medium hover:text-primary transition-colors hover:translate-x-2">{t('nav.contact')}</a>
            <div className="flex flex-col gap-2 pt-4">
              <Button variant="outline" onClick={toggleLanguage} className="w-full gap-2">
                <Globe className="w-4 h-4" />
                {language === 'en' ? 'العربية' : 'English'}
              </Button>
              <Button variant="hero" className="w-full">{t('hero.cta')}</Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
