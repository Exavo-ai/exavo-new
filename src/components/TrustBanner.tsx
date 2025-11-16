import { useLanguage } from "@/contexts/LanguageContext";

const TrustBanner = () => {
  const { language } = useLanguage();

  const logos = [
    { name: 'Microsoft', src: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg' },
    { name: 'Google', src: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg' },
    { name: 'Amazon', src: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg' },
    { name: 'IBM', src: 'https://upload.wikimedia.org/wikipedia/commons/5/51/IBM_logo.svg' },
    { name: 'Oracle', src: 'https://upload.wikimedia.org/wikipedia/commons/5/50/Oracle_logo.svg' },
  ];

  return (
    <section className="py-16 bg-card/50 backdrop-blur-sm border-y border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {language === 'ar' ? 'موثوق به من قبل الشركات الرائدة' : 'Trusted by Leading Companies'}
          </p>
        </div>
        
        {/* Logo Grid */}
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 lg:gap-16 opacity-70 hover:opacity-100 transition-opacity">
          {logos.map((logo, index) => (
            <div 
              key={index}
              className="grayscale hover:grayscale-0 transition-all duration-300 hover:scale-110"
            >
              <img 
                src={logo.src} 
                alt={logo.name}
                className="h-8 md:h-10 w-auto object-contain filter brightness-0 dark:brightness-100 dark:invert"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustBanner;
