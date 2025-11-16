import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Search, X, Sparkles, Menu } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

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
    (priceRange[0] !== 0 || priceRange[1] !== maxPrice);

  return (
    <div className="space-y-4">
      {/* Toggle Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onToggle}
        className="w-full lg:w-auto flex items-center gap-2 mb-4"
      >
        <Menu className="w-4 h-4" />
        {isOpen ? (language === 'ar' ? 'إخفاء الفلاتر' : 'Hide Filters') : (language === 'ar' ? 'عرض الفلاتر' : 'Show Filters')}
      </Button>

      {isOpen && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={language === 'ar' ? 'ابحث...' : 'Search...'}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 h-10 bg-card border-border/50 rounded-lg focus:ring-2 focus:ring-primary/20 transition-all text-sm"
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
                    ? 'bg-gradient-hero text-primary-foreground shadow-glow' 
                    : 'bg-card border border-border/50 hover:border-primary/30 text-foreground'
                  }
                `}
              >
                <span className="text-sm">{category.icon}</span>
                <span>{language === 'ar' ? category.name_ar : category.name}</span>
                <Badge 
                  variant={isSelected ? "secondary" : "outline"}
                  className={`
                    ml-0.5 h-4 min-w-4 flex items-center justify-center text-xs px-1
                    ${isSelected ? 'bg-white/20 text-white border-0' : ''}
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
      <div className="space-y-3 p-4 bg-card/50 rounded-lg border border-border/50">
        <h3 className="text-xs font-semibold text-foreground">
          {language === 'ar' ? 'نطاق السعر' : 'Price Range'}
        </h3>
        
        <Slider
          value={priceRange}
          onValueChange={(value) => onPriceRangeChange(value as [number, number])}
          max={maxPrice}
          step={100}
          className="w-full"
        />
        
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              {language === 'ar' ? 'الحد الأدنى' : 'Min'}
            </label>
            <Input
              type="number"
              value={priceRange[0]}
              onChange={(e) => onPriceRangeChange([Number(e.target.value), priceRange[1]])}
              className="h-8 rounded-lg text-xs"
              min={0}
              max={priceRange[1]}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              {language === 'ar' ? 'الحد الأقصى' : 'Max'}
            </label>
            <Input
              type="number"
              value={priceRange[1]}
              onChange={(e) => onPriceRangeChange([priceRange[0], Number(e.target.value)])}
              className="h-8 rounded-lg text-xs"
              min={priceRange[0]}
              max={maxPrice}
            />
          </div>
        </div>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button 
          variant="outline" 
          className="w-full rounded-lg hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all text-sm h-9"
          onClick={onClearFilters}
        >
          <X className="w-3 h-3 mr-2" />
          {language === 'ar' ? 'مسح الفلاتر' : 'Clear Filters'}
        </Button>
      )}

        {/* Newsletter */}
        <div className="bg-gradient-accent rounded-xl p-4 border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm text-foreground">
              {language === 'ar' ? 'ابق على اطلاع' : 'Stay in the loop'}
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
            {language === 'ar' 
              ? 'احصل على إشعارات حول الخدمات الجديدة والعروض والمزيد!' 
              : 'Get notified about new services!'}
          </p>
          <Input
            type="email"
            placeholder={language === 'ar' ? 'بريدك الإلكتروني' : 'your@email.com'}
            value={emailAlert}
            onChange={(e) => setEmailAlert(e.target.value)}
            className="mb-2 rounded-lg h-9 text-sm"
          />
          <Button className="w-full rounded-lg bg-gradient-hero hover:opacity-90 shadow-glow h-9 text-sm">
            {language === 'ar' ? 'إنشاء تنبيهات' : 'Create alerts'}
          </Button>
        </div>
      </div>
      )}
    </div>
  );
};
