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
    
    // Auth
    'auth.welcomeBack': 'Welcome Back',
    'auth.loginSubtitle': 'Sign in to access your dashboard',
    'auth.password': 'Password',
    'auth.signIn': 'Sign In',
    'auth.signingIn': 'Signing in...',
    'auth.signOut': 'Sign Out',
    'auth.noAccount': "Don't have an account?",
    'auth.hasAccount': 'Already have an account?',
    'auth.signUp': 'Sign Up',
    'auth.createAccount': 'Create Account',
    'auth.registerSubtitle': 'Join Exavo AI today',
    'auth.creatingAccount': 'Creating account...',
    'auth.passwordHint': 'Minimum 6 characters',
    'auth.backHome': 'Back to Home',
    'auth.loginSuccess': 'Signed in successfully!',
    'auth.loginError': 'Failed to sign in',
    'auth.registerSuccess': 'Account created! Please sign in.',
    'auth.registerError': 'Failed to create account',
    
    // Dashboard
    'dashboard.adminPanel': 'Admin Panel',
    'dashboard.myDashboard': 'My Dashboard',
    'dashboard.myProfile': 'My Profile',
    'dashboard.overview': 'Overview',
    'dashboard.users': 'Users',
    'dashboard.bookings': 'Bookings',
    'dashboard.allBookings': 'All Bookings',
    'dashboard.totalUsers': 'Total Users',
    'dashboard.totalBookings': 'Total Bookings',
    'dashboard.admins': 'Admins',
    'dashboard.clients': 'Clients',
    'dashboard.recentUsers': 'Recent Users',
    'dashboard.role': 'Role',
    'dashboard.joinedDate': 'Joined',
    'dashboard.profileInfo': 'Profile Information',
    'dashboard.unnamed': 'Unnamed User',
    'dashboard.memberSince': 'Member Since',
    'dashboard.editProfile': 'Edit Profile',
    'dashboard.saveChanges': 'Save Changes',
    'dashboard.cancel': 'Cancel',
    'dashboard.profileUpdated': 'Profile updated successfully',
    'dashboard.myBookings': 'My Bookings',
    'dashboard.newBooking': 'New Booking',
    'dashboard.noBookings': 'You have no bookings yet',
    'dashboard.bookFirstService': 'Book Your First Service',
    'dashboard.viewManageBookings': 'View and manage your service bookings',
    'dashboard.support': 'Support',
    'dashboard.contactSupport': 'Contact our support team',
    'dashboard.cancelBooking': 'Cancel Booking',
    'dashboard.bookingCancelled': 'Booking cancelled successfully',
    
    // About
    'about.title': 'About Exavo AI',
    'about.mission': 'Making AI accessible for every business',
    'about.description': 'We deliver cutting-edge AI tools, business automation, and digital transformation services.',
    
    // Services
    'services.title': 'Our Services',
    'services.subtitle': 'Comprehensive AI solutions tailored to your business needs',
    'services.orderNow': 'Order Now',
    'services.bookConsultation': 'Book Consultation',
    
    // Pricing
    'pricing.title': 'Pricing Plans',
    'pricing.subtitle': 'Choose the perfect plan for your business',
    'pricing.monthly': 'Monthly',
    'pricing.yearly': 'Yearly',
    'pricing.from': 'From',
    
    // Contact
    'contact.title': 'Get in Touch',
    'contact.subtitle': 'We\'re here to help your business thrive with AI',
    'contact.name': 'Full Name',
    'contact.email': 'Email',
    'contact.phone': 'Phone',
    'contact.message': 'Message',
    'contact.send': 'Send Message',
    
    // Booking
    'booking.title': 'Book Service',
    'booking.date': 'Appointment Date',
    'booking.time': 'Appointment Time',
    'booking.pickDate': 'Pick a date',
    'booking.pickTime': 'Pick a time',
    'booking.notes': 'Additional Notes',
    'booking.notesPlaceholder': 'Tell us more about your needs...',
    'booking.submit': 'Book Appointment',
    'booking.submitting': 'Booking...',
    'booking.success': 'Booking confirmed! Check your email.',
    'booking.error': 'Failed to create booking',
    'booking.status': 'Status',
    'booking.pending': 'Pending',
    'booking.confirmed': 'Confirmed',
    'booking.cancelled': 'Cancelled',
    'booking.completed': 'Completed',
    
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
    
    // Auth
    'auth.welcomeBack': 'مرحباً بعودتك',
    'auth.loginSubtitle': 'سجّل دخولك للوصول إلى لوحة التحكم',
    'auth.password': 'كلمة المرور',
    'auth.signIn': 'تسجيل الدخول',
    'auth.signingIn': 'جاري تسجيل الدخول...',
    'auth.signOut': 'تسجيل الخروج',
    'auth.noAccount': 'ليس لديك حساب؟',
    'auth.hasAccount': 'لديك حساب بالفعل؟',
    'auth.signUp': 'إنشاء حساب',
    'auth.createAccount': 'إنشاء حساب جديد',
    'auth.registerSubtitle': 'انضم إلى Exavo AI اليوم',
    'auth.creatingAccount': 'جاري إنشاء الحساب...',
    'auth.passwordHint': 'لا تقل عن 6 أحرف',
    'auth.backHome': 'العودة للرئيسية',
    'auth.loginSuccess': 'تم تسجيل الدخول بنجاح!',
    'auth.loginError': 'فشل تسجيل الدخول',
    'auth.registerSuccess': 'تم إنشاء الحساب! يرجى تسجيل الدخول.',
    'auth.registerError': 'فشل إنشاء الحساب',
    
    // Dashboard
    'dashboard.adminPanel': 'لوحة الإدارة',
    'dashboard.myDashboard': 'لوحة التحكم',
    'dashboard.myProfile': 'ملفي الشخصي',
    'dashboard.overview': 'نظرة عامة',
    'dashboard.users': 'المستخدمون',
    'dashboard.bookings': 'الحجوزات',
    'dashboard.allBookings': 'كل الحجوزات',
    'dashboard.totalUsers': 'إجمالي المستخدمين',
    'dashboard.totalBookings': 'إجمالي الحجوزات',
    'dashboard.admins': 'المشرفون',
    'dashboard.clients': 'العملاء',
    'dashboard.recentUsers': 'المستخدمون الجدد',
    'dashboard.role': 'الدور',
    'dashboard.joinedDate': 'تاريخ الانضمام',
    'dashboard.profileInfo': 'معلومات الملف الشخصي',
    'dashboard.unnamed': 'مستخدم بدون اسم',
    'dashboard.memberSince': 'عضو منذ',
    'dashboard.editProfile': 'تعديل الملف الشخصي',
    'dashboard.saveChanges': 'حفظ التغييرات',
    'dashboard.cancel': 'إلغاء',
    'dashboard.profileUpdated': 'تم تحديث الملف الشخصي بنجاح',
    'dashboard.myBookings': 'حجوزاتي',
    'dashboard.newBooking': 'حجز جديد',
    'dashboard.noBookings': 'ليس لديك حجوزات حتى الآن',
    'dashboard.bookFirstService': 'احجز خدمتك الأولى',
    'dashboard.viewManageBookings': 'عرض وإدارة حجوزات الخدمات',
    'dashboard.support': 'الدعم',
    'dashboard.contactSupport': 'تواصل مع فريق الدعم',
    'dashboard.cancelBooking': 'إلغاء الحجز',
    'dashboard.bookingCancelled': 'تم إلغاء الحجز بنجاح',
    
    // About
    'about.title': 'عن Exavo AI',
    'about.mission': 'نجعل الذكاء الاصطناعي متاحاً لكل عمل',
    'about.description': 'نقدم أدوات ذكاء اصطناعي متطورة وأتمتة الأعمال وخدمات التحول الرقمي.',
    
    // Services
    'services.title': 'خدماتنا',
    'services.subtitle': 'حلول ذكاء اصطناعي شاملة مصممة لاحتياجات عملك',
    'services.orderNow': 'اطلب الآن',
    'services.bookConsultation': 'احجز استشارة',
    
    // Pricing
    'pricing.title': 'خطط الأسعار',
    'pricing.subtitle': 'اختر الخطة المثالية لعملك',
    'pricing.monthly': 'شهري',
    'pricing.yearly': 'سنوي',
    'pricing.from': 'من',
    
    // Contact
    'contact.title': 'تواصل معنا',
    'contact.subtitle': 'نحن هنا لمساعدة عملك على النمو باستخدام الذكاء الاصطناعي',
    'contact.name': 'الاسم الكامل',
    'contact.email': 'البريد الإلكتروني',
    'contact.phone': 'الهاتف',
    'contact.message': 'الرسالة',
    'contact.send': 'إرسال الرسالة',
    
    // Booking
    'booking.title': 'حجز الخدمة',
    'booking.date': 'تاريخ الموعد',
    'booking.time': 'وقت الموعد',
    'booking.pickDate': 'اختر التاريخ',
    'booking.pickTime': 'اختر الوقت',
    'booking.notes': 'ملاحظات إضافية',
    'booking.notesPlaceholder': 'أخبرنا المزيد عن احتياجاتك...',
    'booking.submit': 'احجز الموعد',
    'booking.submitting': 'جاري الحجز...',
    'booking.success': 'تم تأكيد الحجز! تحقق من بريدك الإلكتروني.',
    'booking.error': 'فشل إنشاء الحجز',
    'booking.status': 'الحالة',
    'booking.pending': 'قيد الانتظار',
    'booking.confirmed': 'مؤكد',
    'booking.cancelled': 'ملغى',
    'booking.completed': 'مكتمل',
    
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
