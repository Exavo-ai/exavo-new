import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { Calendar, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import exavoLogo from "@/assets/exavo-logo.png";
import fallbackImage from "@/assets/ai-pattern.jpg";

interface PremiumServiceCardProps {
  id: string;
  name: string;
  name_ar: string;
  description: string;
  description_ar: string;
  price: number;
  currency: string;
  image_url?: string | null;
  Icon: LucideIcon;
  onBook: () => void;
}

export const PremiumServiceCard = ({
  id,
  name,
  name_ar,
  description,
  description_ar,
  price,
  currency,
  image_url,
  Icon,
  onBook,
}: PremiumServiceCardProps) => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  
  const serviceName = language === 'ar' ? name_ar : name;
  const serviceDescription = language === 'ar' ? description_ar : description;

  // Determine category tags based on service name
  const getTags = () => {
    const tags = [];
    if (name.includes('AI')) tags.push(language === 'ar' ? 'ذكاء اصطناعي' : 'AI');
    if (name.includes('Automation') || name.includes('Bot')) tags.push(language === 'ar' ? 'أتمتة' : 'Automation');
    if (name.includes('Analytics') || name.includes('Prediction')) tags.push(language === 'ar' ? 'تحليلات' : 'Analytics');
    if (name.includes('Marketing') || name.includes('Campaign')) tags.push(language === 'ar' ? 'تسويق' : 'Marketing');
    if (tags.length === 0) tags.push(language === 'ar' ? 'أدوات' : 'Business Tools');
    return tags;
  };

  return (
    <Card className="group overflow-hidden bg-card hover:shadow-2xl transition-all duration-500 flex flex-col border-border/50 hover:border-primary/30 hover:-translate-y-1 h-full">
      {/* Image Section */}
      <div className="relative h-40 sm:h-48 bg-gradient-to-br from-primary/10 via-background to-accent/10 overflow-hidden">
        <img 
          src={image_url || fallbackImage} 
          alt={serviceName}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.onerror = null;
            target.src = fallbackImage;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent"></div>
        
        {/* Logo Badge */}
        <div className="absolute top-3 right-3 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-background/90 backdrop-blur-md shadow-lg flex items-center justify-center ring-2 ring-primary/20 p-2">
          <img src={exavoLogo} alt="Exavo" className="w-full h-full object-contain" />
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4 sm:p-6 flex-1 flex flex-col bg-card/80 backdrop-blur-sm">
        {/* Title */}
        <h3 className="text-lg sm:text-xl font-bold text-foreground mb-2 sm:mb-3 line-clamp-2 min-h-[3rem] sm:min-h-[3.5rem] group-hover:text-primary transition-colors">
          {serviceName}
        </h3>

        {/* Description */}
        <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 line-clamp-2 leading-relaxed flex-1">
          {serviceDescription}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
          {getTags().map((tag, idx) => (
            <Badge 
              key={idx}
              variant="secondary" 
              className="text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 font-medium bg-primary/10 text-primary hover:bg-primary/20 border-0 rounded-full transition-all hover:scale-105"
            >
              {tag}
            </Badge>
          ))}
        </div>

        {/* Metadata Row */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground mb-3 sm:mb-4 pb-3 sm:pb-4 border-t border-border/50 pt-3 sm:pt-4">
          <span className="font-bold text-foreground text-lg">
            ${price.toLocaleString()}
          </span>
          <span className="text-muted-foreground">/</span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span className="hidden sm:inline">
              {new Date().toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { 
                month: 'short', 
                year: 'numeric' 
              })}
            </span>
          </span>
          <span className="text-muted-foreground hidden sm:inline">/</span>
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {language === 'ar' ? 'سحابي' : 'Cloud'}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex-1 rounded-xl hover:bg-secondary transition-all h-9 sm:h-10 text-xs sm:text-sm"
            onClick={() => navigate(`/services/${id}`)}
          >
            {language === 'ar' ? 'التفاصيل' : 'Details'}
          </Button>
          <Button 
            variant="default"
            className="flex-1 rounded-xl bg-gradient-hero hover:opacity-90 shadow-glow transition-all hover:shadow-glow-lg h-9 sm:h-10 text-xs sm:text-sm"
            onClick={onBook}
          >
            {language === 'ar' ? 'اشتر الآن' : 'Buy Now'}
          </Button>
        </div>
      </div>
    </Card>
  );
};
