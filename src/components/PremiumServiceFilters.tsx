import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { Search, X, ChevronLeft } from "lucide-react";

interface PremiumServiceFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedCategories: string[];
  onCategoryToggle: (category: string) => void;
  priceRange: [number, number];
  onPriceRangeChange: (range: [number, number]) => void;
  maxPrice: number;
  categoryCounts: Record<string, number>;
  onClearFilters: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

const categories = [
  { id: 'ai', name: 'AI Services', name_ar: 'خدمات الذكاء الاصطناعي', icon: '🤖' },
  { id: 'automation', name: 'Automation', name_ar: 'الأتمتة', icon: '⚡' },
  { id: 'analytics', name: 'Analytics', name_ar: 'التحليلات', icon: '📊' },
  { id: 'marketing', name: 'Marketing', name_ar: 'التسويق', icon: '📱' },
  { id: 'business', name: 'Business Tools', name_ar: 'أدوات الأعمال', icon: '💼' },
];

export const PremiumServiceFilters = ({
  searchQuery,
  onSearchChange,
  selectedCategories,
  onCategoryToggle,
  priceRange,
  onPriceRangeChange,
  maxPrice,
  categoryCounts,
  onClearFilters,
  isOpen,
  onToggle,
}: PremiumServiceFiltersProps) => {
  const { language } = useLanguage();
  const [emailAlert, setEmailAlert] = useState('');

  const hasActiveFilters = searchQuery || selectedCategories.length > 0 || 
    priceRange[0] !== 0 || priceRange[1] !== maxPrice;

  const filterContent = (
    <div className="space-y-4">
      {/* Toggle Button - Desktop Only */}
      <div className="hidden lg:flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <span className="w-1 h-4 bg-primary rounded-full"></span>
          {language === 'ar' ? 'فلاتر' : 'Filters'}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={language === 'ar' ? 'ابحث...' : 'Search...'}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 h-9 bg-card border-border/50 rounded-lg focus:ring-2 focus:ring-primary/20 transition-all text-sm"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Categories */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-foreground">
          {language === 'ar' ? 'الفئات' : 'Categories'}
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((category) => {
            const count = categoryCounts[category.id] || 0;
            const isSelected = selectedCategories.includes(category.id);
            
            return (
              <button
                key={category.id}
                onClick={() => onCategoryToggle(category.id)}
                className={`
                  group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs
                  transition-all duration-300 hover:scale-105
                  ${isSelected 
                    ? 'bg-primary text-primary-foreground shadow-md ring-2 ring-primary/30' 
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }
                `}
              >
                <span className="text-base leading-none">{category.icon}</span>
                <span>{language === 'ar' ? category.name_ar : category.name}</span>
                <Badge 
                  variant="secondary" 
                  className={`ml-1 px-1.5 py-0 text-[10px] min-w-[18px] h-4 flex items-center justify-center
                    ${isSelected ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-background/50'}
                  `}
                >
                  {count}
                </Badge>
              </button>
            );
          })}
        </div>
      </div>

      {/* Price Range */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-foreground">
            {language === 'ar' ? 'نطاق السعر' : 'Price Range'}
          </h3>
          <div className="text-xs font-medium text-primary">
            ${priceRange[0].toLocaleString()} - ${priceRange[1].toLocaleString()}
          </div>
        </div>
        <Slider
          value={priceRange}
          onValueChange={(value) => onPriceRangeChange(value as [number, number])}
          max={maxPrice}
          step={1000}
          className="w-full"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>$0</span>
          <span>${maxPrice.toLocaleString()}</span>
        </div>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={onClearFilters}
          className="w-full h-9 text-xs border-border/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all"
        >
          <X className="w-3 h-3 mr-1" />
          {language === 'ar' ? 'مسح الفلاتر' : 'Clear Filters'}
        </Button>
      )}

      {/* Newsletter Signup */}
      <div className="pt-4 border-t border-border/50">
        <h4 className="text-xs font-semibold text-foreground mb-2">
          {language === 'ar' ? 'اشترك في النشرة' : 'Newsletter'}
        </h4>
        <Input 
          placeholder={language === 'ar' ? 'بريدك الإلكتروني' : 'Your email'}
          className="mb-2 h-9 text-sm"
          value={emailAlert}
          onChange={(e) => setEmailAlert(e.target.value)}
        />
        <Button className="w-full h-9 text-xs bg-gradient-hero">
          {language === 'ar' ? 'اشترك' : 'Subscribe'}
        </Button>
      </div>
    </div>
  );

  // Just return the filter content wrapped in a Card for desktop
  // Mobile will be handled by parent component
  return (
    <Card className="p-4 bg-card/80 backdrop-blur-sm border-border/50">
      {filterContent}
    </Card>
  );
};
