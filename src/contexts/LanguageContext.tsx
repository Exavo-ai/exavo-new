import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  dir: 'ltr' | 'rtl';
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.about': 'About',
    'nav.services': 'Services',
    'nav.pricing': 'Pricing',
    'nav.contact': 'Contact',
    
    // Hero
    'hero.badge': 'AI Solutions for Modern Business',
    'hero.title': 'Empowering Businesses with',
    'hero.titleHighlight': 'Intelligent AI Solutions',
    'hero.subtitle': 'Connect your business with automation, data, and AI innovation. Making AI accessible for every business.',
    'hero.cta': 'Get Started',
    'hero.ctaSecondary': 'Watch Demo',
    
    // About
    'about.title': 'About Exavo AI',
    'about.mission': 'Making AI accessible for every business',
    'about.description': 'We deliver cutting-edge AI tools, business automation, and digital transformation services.',
    
    // Services
    'services.title': 'Our Services',
    'services.subtitle': 'Comprehensive AI solutions tailored to your business needs',
    
    // Pricing
    'pricing.title': 'Pricing Plans',
    'pricing.subtitle': 'Choose the perfect plan for your business',
    'pricing.monthly': 'Monthly',
    'pricing.yearly': 'Yearly',
    
    // Contact
    'contact.title': 'Get in Touch',
    'contact.subtitle': 'We\'re here to help your business thrive with AI',
    'contact.name': 'Full Name',
    'contact.email': 'Email',
    'contact.phone': 'Phone',
    'contact.message': 'Message',
    'contact.send': 'Send Message',
    
    // Common
    'common.learnMore': 'Learn More',
    'common.getStarted': 'Get Started',
    'common.bookDemo': 'Book a Demo',
  },
  ar: {
    // Navigation
    'nav.home': 'الرئيسية',
    'nav.about': 'من نحن',
    'nav.services': 'الخدمات',
    'nav.pricing': 'الأسعار',
    'nav.contact': 'اتصل بنا',
    
    // Hero
    'hero.badge': 'حلول ذكاء اصطناعي للأعمال الحديثة',
    'hero.title': 'نمكّن الشركات بـ',
    'hero.titleHighlight': 'حلول ذكاء اصطناعي ذكية',
    'hero.subtitle': 'اربط عملك بالأتمتة والبيانات والابتكار في الذكاء الاصطناعي. نجعل الذكاء الاصطناعي في متناول كل عمل.',
    'hero.cta': 'ابدأ الآن',
    'hero.ctaSecondary': 'شاهد العرض',
    
    // About
    'about.title': 'عن Exavo AI',
    'about.mission': 'نجعل الذكاء الاصطناعي متاحاً لكل عمل',
    'about.description': 'نقدم أدوات ذكاء اصطناعي متطورة وأتمتة الأعمال وخدمات التحول الرقمي.',
    
    // Services
    'services.title': 'خدماتنا',
    'services.subtitle': 'حلول ذكاء اصطناعي شاملة مصممة لاحتياجات عملك',
    
    // Pricing
    'pricing.title': 'خطط الأسعار',
    'pricing.subtitle': 'اختر الخطة المثالية لعملك',
    'pricing.monthly': 'شهري',
    'pricing.yearly': 'سنوي',
    
    // Contact
    'contact.title': 'تواصل معنا',
    'contact.subtitle': 'نحن هنا لمساعدة عملك على النمو باستخدام الذكاء الاصطناعي',
    'contact.name': 'الاسم الكامل',
    'contact.email': 'البريد الإلكتروني',
    'contact.phone': 'الهاتف',
    'contact.message': 'الرسالة',
    'contact.send': 'إرسال الرسالة',
    
    // Common
    'common.learnMore': 'اعرف المزيد',
    'common.getStarted': 'ابدأ الآن',
    'common.bookDemo': 'احجز عرضاً',
  }
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const savedLang = localStorage.getItem('language') as Language;
    if (savedLang && (savedLang === 'en' || savedLang === 'ar')) {
      setLanguageState(savedLang);
    }
  }, []);

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    if (language === 'ar') {
      document.body.classList.add('font-arabic');
    } else {
      document.body.classList.remove('font-arabic');
    }
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['en']] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir: language === 'ar' ? 'rtl' : 'ltr' }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
