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
    'nav.login': 'Login',
    'nav.register': 'Register',
    'nav.blog': 'Blog',
    'nav.faq': 'FAQ',
    
    // Hero & Landing
    'hero.badge': 'Next-Generation AI Solutions',
    'hero.title': 'Transform Your Business with',
    'hero.titleHighlight': 'Exavo AI',
    'hero.subtitle': 'Unlock the power of artificial intelligence to drive growth, automate processes, and make smarter decisions.',
    'hero.cta': 'Book a Demo',
    'hero.ctaSecondary': 'Explore Solutions',
    'hero.benefit1': 'Free Consultation',
    'hero.benefit2': 'Custom Solutions',
    'hero.benefit3': 'Proven Results',
    
    // Landing Features
    'landing.featuresTitle': 'Comprehensive AI Solutions',
    'landing.featuresSubtitle': 'Everything you need to harness the power of AI for your business',
    'landing.featuresBadge': 'Our Services',
    'landing.feature1.title': 'AI-Powered Solutions',
    'landing.feature1.desc': 'Cutting-edge artificial intelligence tailored to your business needs',
    'landing.feature2.title': 'Strategic Consulting',
    'landing.feature2.desc': 'Expert guidance to transform your digital presence',
    'landing.feature3.title': 'Growth Optimization',
    'landing.feature3.desc': 'Data-driven strategies that deliver measurable results',
    'landing.feature4.title': 'Rapid Implementation',
    'landing.feature4.desc': 'Fast deployment with seamless integration',
    'landing.feature5.title': '24/7 Support',
    'landing.feature5.desc': 'Round-the-clock assistance from our expert team',
    'landing.feature6.title': 'Custom Solutions',
    'landing.feature6.desc': 'Bespoke AI tools designed for your unique challenges',
    
    // Solutions
    'landing.solutionsTitle': 'Our Solutions',
    'landing.solutionsSubtitle': 'Comprehensive AI services for every business need',
    'landing.solution1': 'AI Chatbot Development',
    'landing.solution2': 'Business Process Automation',
    'landing.solution3': 'Predictive Analytics',
    'landing.solution4': 'Natural Language Processing',
    'landing.solution5': 'Computer Vision Solutions',
    'landing.solution6': 'Machine Learning Models',
    
    // Testimonials
    'testimonials.title': 'Trusted by Industry Leaders',
    'testimonials.subtitle': 'See what our clients say about transforming their businesses with AI',
    'testimonial1.name': 'Sarah Johnson',
    'testimonial1.role': 'CEO, TechCorp',
    'testimonial1.company': 'Technology Services',
    'testimonial1.content': 'Exavo AI transformed our customer service operations. Their AI chatbot reduced response times by 80% and improved customer satisfaction dramatically.',
    'testimonial2.name': 'Ahmed Hassan',
    'testimonial2.role': 'Director of Innovation',
    'testimonial2.company': 'Financial Services',
    'testimonial2.content': 'The predictive analytics solution provided incredible insights into our business patterns. We\'ve seen a 45% improvement in forecasting accuracy.',
    'testimonial3.name': 'Maria Garcia',
    'testimonial3.role': 'CTO',
    'testimonial3.company': 'E-commerce Platform',
    'testimonial3.content': 'Implementation was seamless, and the ROI was immediate. Exavo AI\'s automation tools saved us thousands of hours in manual processing.',
    
    // Stats & Metrics
    'landing.statTitle': 'Proven Results',
    'landing.stat1': 'Active Clients',
    'landing.stat2': 'Success Rate',
    'landing.stat3': 'AI Models Deployed',
    'landing.stat4': 'Countries Served',
    
    // Auth
    'auth.welcomeBack': 'Welcome Back',
    'auth.loginSubtitle': 'Sign in to access your dashboard',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.signIn': 'Sign In',
    'auth.signingIn': 'Signing in...',
    'auth.signOut': 'Sign Out',
    'auth.noAccount': 'Don\'t have an account?',
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
    
    // Client Portal Dashboard
    'portal.dashboard': 'Dashboard',
    'portal.dashboardSubtitle': 'Welcome to your AI workspace overview',
    'portal.totalSpending': 'Total Spending',
    'portal.activeTools': 'Active AI Tools',
    'portal.runningAutomations': 'Running Automations',
    'portal.usageAnalytics': 'Usage Analytics',
    'portal.apiCalls': 'API Calls',
    'portal.automations': 'Automations',
    'portal.aiAssistants': 'AI Assistants',
    'portal.recentTickets': 'Recent Support Tickets',
    'portal.recentOrders': 'Recent Orders',
    'portal.viewAll': 'View All',
    'portal.loading': 'Loading...',
    
    // My Services
    'myServices.title': 'My Services',
    'myServices.subtitle': 'Manage your active AI services and subscriptions',
    'myServices.browse': 'Browse Services',
    'myServices.plan': 'Plan',
    'myServices.price': 'Price',
    'myServices.nextBilling': 'Next billing:',
    'myServices.configure': 'Configure',
    'myServices.viewDetails': 'View Details',
    'myServices.status': 'Status',
    'myServices.active': 'Active',
    'myServices.inactive': 'Inactive',
    
    // Tickets
    'tickets.title': 'Support Tickets',
    'tickets.subtitle': 'Track and manage your support requests',
    'tickets.create': 'Create Ticket',
    'tickets.search': 'Search tickets...',
    'tickets.filters': 'Filters',
    'tickets.subject': 'Subject',
    'tickets.priority': 'Priority',
    'tickets.service': 'Service',
    'tickets.ticketId': 'Ticket ID',
    'tickets.status': 'Status',
    'tickets.created': 'Created',
    'tickets.actions': 'Actions',
    'tickets.view': 'View',
    'tickets.high': 'High',
    'tickets.medium': 'Medium',
    'tickets.low': 'Low',
    'tickets.open': 'Open',
    'tickets.inProgress': 'In Progress',
    'tickets.pending': 'Pending',
    'tickets.resolved': 'Resolved',
    
    // Admin Dashboard
    'admin.dashboard': 'Dashboard',
    'admin.dashboardSubtitle': 'Overview of your platform analytics',
    'admin.totalUsers': 'Total Users',
    'admin.totalServices': 'Total Services',
    'admin.totalBookings': 'Total Bookings',
    'admin.revenue': 'Revenue',
    'admin.monthlyGrowth': 'Monthly Growth',
    'admin.activeUsers': 'Active Users',
    'admin.revenueTrends': 'Revenue Trends',
    'admin.popularServices': 'Popular Services',
    'admin.bookings': 'Bookings',
    'admin.loading': 'Loading dashboard...',
    
    // Admin Users
    'adminUsers.title': 'User Management',
    'adminUsers.subtitle': 'Manage all platform users',
    'adminUsers.search': 'Search users...',
    'adminUsers.name': 'Name',
    'adminUsers.email': 'Email',
    'adminUsers.role': 'Role',
    'adminUsers.joinedDate': 'Joined',
    'adminUsers.actions': 'Actions',
    'adminUsers.edit': 'Edit',
    'adminUsers.suspend': 'Suspend',
    'adminUsers.delete': 'Delete',
    'adminUsers.deleteConfirm': 'Are you sure you want to delete this user? This action cannot be undone.',
    'adminUsers.deleteSuccess': 'User deleted successfully',
    'adminUsers.deleteError': 'Failed to delete user',
    'adminUsers.suspendInfo': 'User suspension feature coming soon.',
    'adminUsers.noUsers': 'No users found',
    'adminUsers.loading': 'Loading users...',
    
    // Admin Bookings
    'adminBookings.title': 'Bookings Management',
    'adminBookings.subtitle': 'View and manage all bookings',
    'adminBookings.allBookings': 'All Bookings',
    'adminBookings.client': 'Client',
    'adminBookings.email': 'Email',
    'adminBookings.date': 'Date',
    'adminBookings.time': 'Time',
    'adminBookings.status': 'Status',
    'adminBookings.actions': 'Actions',
    'adminBookings.view': 'View',
    'adminBookings.noBookings': 'No bookings found',
    'adminBookings.loading': 'Loading bookings...',
    
    // Common
    'common.learnMore': 'Learn More',
    'common.getStarted': 'Get Started',
    'common.bookDemo': 'Book a Demo',
    'common.loading': 'Loading...',
    'common.search': 'Search...',
    'common.filter': 'Filter',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.view': 'View',
    'common.success': 'Success',
    'common.error': 'Error',
  },
  ar: {
    // Navigation
    'nav.home': 'الرئيسية',
    'nav.about': 'من نحن',
    'nav.services': 'الخدمات',
    'nav.pricing': 'الأسعار',
    'nav.contact': 'اتصل بنا',
    'nav.login': 'تسجيل الدخول',
    'nav.register': 'إنشاء حساب',
    'nav.blog': 'المدونة',
    'nav.faq': 'الأسئلة الشائعة',
    
    // Hero & Landing
    'hero.badge': 'حلول ذكاء اصطناعي من الجيل التالي',
    'hero.title': 'حوّل عملك مع',
    'hero.titleHighlight': 'Exavo AI',
    'hero.subtitle': 'أطلق العنان لقوة الذكاء الاصطناعي لدفع النمو وأتمتة العمليات واتخاذ قرارات أذكى.',
    'hero.cta': 'احجز عرضاً توضيحياً',
    'hero.ctaSecondary': 'استكشف الحلول',
    'hero.benefit1': 'استشارة مجانية',
    'hero.benefit2': 'حلول مخصصة',
    'hero.benefit3': 'نتائج مثبتة',
    
    // Landing Features
    'landing.featuresTitle': 'حلول ذكاء اصطناعي شاملة',
    'landing.featuresSubtitle': 'كل ما تحتاجه لتسخير قوة الذكاء الاصطناعي لأعمالك',
    'landing.featuresBadge': 'خدماتنا',
    'landing.feature1.title': 'حلول مدعومة بالذكاء الاصطناعي',
    'landing.feature1.desc': 'ذكاء اصطناعي متطور مصمم خصيصاً لاحتياجات عملك',
    'landing.feature2.title': 'استشارات استراتيجية',
    'landing.feature2.desc': 'إرشادات خبراء لتحويل وجودك الرقمي',
    'landing.feature3.title': 'تحسين النمو',
    'landing.feature3.desc': 'استراتيجيات مدعومة بالبيانات تقدم نتائج قابلة للقياس',
    'landing.feature4.title': 'تنفيذ سريع',
    'landing.feature4.desc': 'نشر سريع مع تكامل سلس',
    'landing.feature5.title': 'دعم على مدار الساعة',
    'landing.feature5.desc': 'مساعدة على مدار الساعة من فريق الخبراء لدينا',
    'landing.feature6.title': 'حلول مخصصة',
    'landing.feature6.desc': 'أدوات ذكاء اصطناعي مخصصة مصممة لتحدياتك الفريدة',
    
    // Solutions
    'landing.solutionsTitle': 'حلولنا',
    'landing.solutionsSubtitle': 'خدمات ذكاء اصطناعي شاملة لكل احتياجات الأعمال',
    'landing.solution1': 'تطوير روبوتات الدردشة بالذكاء الاصطناعي',
    'landing.solution2': 'أتمتة العمليات التجارية',
    'landing.solution3': 'التحليلات التنبؤية',
    'landing.solution4': 'معالجة اللغة الطبيعية',
    'landing.solution5': 'حلول الرؤية الحاسوبية',
    'landing.solution6': 'نماذج التعلم الآلي',
    
    // Testimonials
    'testimonials.title': 'موثوق به من قبل قادة الصناعة',
    'testimonials.subtitle': 'شاهد ما يقوله عملاؤنا حول تحويل أعمالهم بالذكاء الاصطناعي',
    'testimonial1.name': 'سارة جونسون',
    'testimonial1.role': 'الرئيس التنفيذي، TechCorp',
    'testimonial1.company': 'خدمات التكنولوجيا',
    'testimonial1.content': 'حوّل Exavo AI عمليات خدمة العملاء لدينا. قلل روبوت الدردشة الخاص بهم أوقات الاستجابة بنسبة 80٪ وحسّن رضا العملاء بشكل كبير.',
    'testimonial2.name': 'أحمد حسن',
    'testimonial2.role': 'مدير الابتكار',
    'testimonial2.company': 'الخدمات المالية',
    'testimonial2.content': 'قدم حل التحليلات التنبؤية رؤى رائعة في أنماط أعمالنا. لقد شهدنا تحسناً بنسبة 45٪ في دقة التنبؤ.',
    'testimonial3.name': 'ماريا غارسيا',
    'testimonial3.role': 'مدير التكنولوجيا',
    'testimonial3.company': 'منصة التجارة الإلكترونية',
    'testimonial3.content': 'كان التنفيذ سلساً، وكان العائد على الاستثمار فورياً. وفرت لنا أدوات الأتمتة في Exavo AI آلاف الساعات من المعالجة اليدوية.',
    
    // Stats & Metrics
    'landing.statTitle': 'نتائج مثبتة',
    'landing.stat1': 'عملاء نشطون',
    'landing.stat2': 'معدل النجاح',
    'landing.stat3': 'نماذج ذكاء اصطناعي منشورة',
    'landing.stat4': 'دول مخدومة',
    
    // Auth
    'auth.welcomeBack': 'مرحباً بعودتك',
    'auth.loginSubtitle': 'سجّل دخولك للوصول إلى لوحة التحكم',
    'auth.email': 'البريد الإلكتروني',
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
    
    // Client Portal Dashboard
    'portal.dashboard': 'لوحة التحكم',
    'portal.dashboardSubtitle': 'مرحباً بك في نظرة عامة على مساحة العمل الذكية الخاصة بك',
    'portal.totalSpending': 'إجمالي الإنفاق',
    'portal.activeTools': 'أدوات ذكاء اصطناعي نشطة',
    'portal.runningAutomations': 'الأتمتة قيد التشغيل',
    'portal.usageAnalytics': 'تحليلات الاستخدام',
    'portal.apiCalls': 'استدعاءات API',
    'portal.automations': 'الأتمتة',
    'portal.aiAssistants': 'مساعدو الذكاء الاصطناعي',
    'portal.recentTickets': 'تذاكر الدعم الأخيرة',
    'portal.recentOrders': 'الطلبات الأخيرة',
    'portal.viewAll': 'عرض الكل',
    'portal.loading': 'جاري التحميل...',
    
    // My Services
    'myServices.title': 'خدماتي',
    'myServices.subtitle': 'إدارة خدمات الذكاء الاصطناعي والاشتراكات النشطة الخاصة بك',
    'myServices.browse': 'تصفح الخدمات',
    'myServices.plan': 'الخطة',
    'myServices.price': 'السعر',
    'myServices.nextBilling': 'الفاتورة التالية:',
    'myServices.configure': 'تكوين',
    'myServices.viewDetails': 'عرض التفاصيل',
    'myServices.status': 'الحالة',
    'myServices.active': 'نشط',
    'myServices.inactive': 'غير نشط',
    
    // Tickets
    'tickets.title': 'تذاكر الدعم',
    'tickets.subtitle': 'تتبع وإدارة طلبات الدعم الخاصة بك',
    'tickets.create': 'إنشاء تذكرة',
    'tickets.search': 'البحث عن تذاكر...',
    'tickets.filters': 'الفلاتر',
    'tickets.subject': 'الموضوع',
    'tickets.priority': 'الأولوية',
    'tickets.service': 'الخدمة',
    'tickets.ticketId': 'رقم التذكرة',
    'tickets.status': 'الحالة',
    'tickets.created': 'تاريخ الإنشاء',
    'tickets.actions': 'الإجراءات',
    'tickets.view': 'عرض',
    'tickets.high': 'عالية',
    'tickets.medium': 'متوسطة',
    'tickets.low': 'منخفضة',
    'tickets.open': 'مفتوح',
    'tickets.inProgress': 'قيد التنفيذ',
    'tickets.pending': 'معلق',
    'tickets.resolved': 'محلول',
    
    // Admin Dashboard
    'admin.dashboard': 'لوحة التحكم',
    'admin.dashboardSubtitle': 'نظرة عامة على تحليلات المنصة',
    'admin.totalUsers': 'إجمالي المستخدمين',
    'admin.totalServices': 'إجمالي الخدمات',
    'admin.totalBookings': 'إجمالي الحجوزات',
    'admin.revenue': 'الإيرادات',
    'admin.monthlyGrowth': 'النمو الشهري',
    'admin.activeUsers': 'المستخدمون النشطون',
    'admin.revenueTrends': 'اتجاهات الإيرادات',
    'admin.popularServices': 'الخدمات الشائعة',
    'admin.bookings': 'الحجوزات',
    'admin.loading': 'جاري تحميل لوحة التحكم...',
    
    // Admin Users
    'adminUsers.title': 'إدارة المستخدمين',
    'adminUsers.subtitle': 'إدارة جميع مستخدمي المنصة',
    'adminUsers.search': 'البحث عن مستخدمين...',
    'adminUsers.name': 'الاسم',
    'adminUsers.email': 'البريد الإلكتروني',
    'adminUsers.role': 'الدور',
    'adminUsers.joinedDate': 'تاريخ الانضمام',
    'adminUsers.actions': 'الإجراءات',
    'adminUsers.edit': 'تعديل',
    'adminUsers.suspend': 'إيقاف',
    'adminUsers.delete': 'حذف',
    'adminUsers.deleteConfirm': 'هل أنت متأكد أنك تريد حذف هذا المستخدم؟ لا يمكن التراجع عن هذا الإجراء.',
    'adminUsers.deleteSuccess': 'تم حذف المستخدم بنجاح',
    'adminUsers.deleteError': 'فشل حذف المستخدم',
    'adminUsers.suspendInfo': 'ميزة إيقاف المستخدم قادمة قريباً.',
    'adminUsers.noUsers': 'لم يتم العثور على مستخدمين',
    'adminUsers.loading': 'جاري تحميل المستخدمين...',
    
    // Admin Bookings
    'adminBookings.title': 'إدارة الحجوزات',
    'adminBookings.subtitle': 'عرض وإدارة جميع الحجوزات',
    'adminBookings.allBookings': 'جميع الحجوزات',
    'adminBookings.client': 'العميل',
    'adminBookings.email': 'البريد الإلكتروني',
    'adminBookings.date': 'التاريخ',
    'adminBookings.time': 'الوقت',
    'adminBookings.status': 'الحالة',
    'adminBookings.actions': 'الإجراءات',
    'adminBookings.view': 'عرض',
    'adminBookings.noBookings': 'لم يتم العثور على حجوزات',
    'adminBookings.loading': 'جاري تحميل الحجوزات...',
    
    // Common
    'common.learnMore': 'اعرف المزيد',
    'common.getStarted': 'ابدأ الآن',
    'common.bookDemo': 'احجز عرضاً',
    'common.loading': 'جاري التحميل...',
    'common.search': 'بحث...',
    'common.filter': 'تصفية',
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.delete': 'حذف',
    'common.edit': 'تعديل',
    'common.view': 'عرض',
    'common.success': 'نجاح',
    'common.error': 'خطأ',
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
