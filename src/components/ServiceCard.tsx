import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

interface ServiceCardProps {
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

export const ServiceCard = ({
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
}: ServiceCardProps) => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  
  const serviceName = language === 'ar' ? name_ar : name;
  const serviceDescription = language === 'ar' ? description_ar : description;

  return (
    <Card className="overflow-hidden bg-card hover:shadow-glow transition-all duration-300 group">
      {/* Image Section */}
      <div className="relative h-48 bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20 overflow-hidden">
        {image_url ? (
          <img 
            src={image_url} 
            alt={serviceName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon className="w-20 h-20 text-primary/30" strokeWidth={1} />
          </div>
        )}
        
        {/* Icon Badge */}
        <div className="absolute top-4 left-4 w-12 h-12 rounded-lg bg-primary shadow-lg flex items-center justify-center">
          <Icon className="w-6 h-6 text-primary-foreground" strokeWidth={2} />
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6">
        {/* Title */}
        <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-1">
          {serviceName}
        </h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
          {serviceDescription}
        </p>

        {/* Badges */}
        <div className="flex gap-2 mb-4">
          <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground">
            {language === 'ar' ? 'ذكاء اصطناعي' : 'AI Service'}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {language === 'ar' ? 'سنة واحدة' : 'Min 1 year'}
          </Badge>
        </div>

        {/* Price and Meta Info */}
        <div className="flex items-center gap-3 text-sm mb-4 text-muted-foreground">
          <span className="font-bold text-foreground">
            ${price.toLocaleString()}
          </span>
          <span>|</span>
          <span>{new Date().toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { 
            month: 'numeric', 
            day: 'numeric', 
            year: 'numeric' 
          })}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => navigate(`/services/${id}`)}
          >
            {language === 'ar' ? 'التفاصيل' : 'Details'}
          </Button>
          <Button 
            variant="default"
            className="flex-1"
            onClick={onBook}
          >
            {language === 'ar' ? 'احجز الآن' : 'Buy now'}
          </Button>
        </div>
      </div>
    </Card>
  );
};
