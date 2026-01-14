import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ServiceImageCarouselProps {
  images: string[];
  serviceName: string;
  fallbackIcon?: React.ReactNode;
  className?: string;
}

export function ServiceImageCarousel({ 
  images, 
  serviceName, 
  fallbackIcon,
  className 
}: ServiceImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Filter valid URLs
  const validImages = images.filter(
    url => url && (url.startsWith('http://') || url.startsWith('https://'))
  );

  // If no images, show fallback
  if (validImages.length === 0) {
    return (
      <div className={cn("relative h-96 max-w-full rounded-lg bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20 overflow-hidden", className)}>
        <div className="absolute inset-0 w-full h-full flex items-center justify-center">
          {fallbackIcon}
        </div>
      </div>
    );
  }

  // If only one image, show it without carousel controls
  if (validImages.length === 1) {
    return (
      <div className={cn("relative h-96 max-w-full rounded-lg bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20 overflow-hidden", className)}>
        <img 
          src={validImages[0]} 
          alt={serviceName}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
    );
  }

  const goToNext = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev + 1) % validImages.length);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const goToPrevious = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev - 1 + validImages.length) % validImages.length);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const goToIndex = (index: number) => {
    if (isTransitioning || index === currentIndex) return;
    setIsTransitioning(true);
    setCurrentIndex(index);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  return (
    <div className={cn("relative h-96 max-w-full rounded-lg bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20 overflow-hidden group", className)}>
      {/* Main image */}
      <div className="absolute inset-0 w-full h-full">
        {validImages.map((url, index) => (
          <img
            key={url}
            src={url}
            alt={`${serviceName} - Image ${index + 1}`}
            className={cn(
              "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
              index === currentIndex ? "opacity-100" : "opacity-0"
            )}
          />
        ))}
      </div>

      {/* Navigation arrows */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity h-10 w-10 rounded-full"
        onClick={goToPrevious}
        disabled={isTransitioning}
      >
        <ChevronLeft className="h-6 w-6" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity h-10 w-10 rounded-full"
        onClick={goToNext}
        disabled={isTransitioning}
      >
        <ChevronRight className="h-6 w-6" />
      </Button>

      {/* Dot indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {validImages.map((_, index) => (
          <button
            key={index}
            className={cn(
              "w-2.5 h-2.5 rounded-full transition-all",
              index === currentIndex 
                ? "bg-white w-6" 
                : "bg-white/50 hover:bg-white/75"
            )}
            onClick={() => goToIndex(index)}
            aria-label={`Go to image ${index + 1}`}
          />
        ))}
      </div>

      {/* Image counter */}
      <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/60 text-white text-sm rounded-full">
        {currentIndex + 1} / {validImages.length}
      </div>
    </div>
  );
}
