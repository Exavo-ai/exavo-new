import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence, PanInfo } from "framer-motion";

interface ServiceImageCarouselProps {
  images: string[];
  serviceName: string;
  fallbackIcon?: React.ReactNode;
  className?: string;
  autoPlayInterval?: number;
}

export function ServiceImageCarousel({ 
  images, 
  serviceName, 
  fallbackIcon,
  className,
  autoPlayInterval = 5000
}: ServiceImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Filter valid URLs
  const validImages = images.filter(
    url => url && (url.startsWith('http://') || url.startsWith('https://'))
  );

  const goToNext = useCallback(() => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % validImages.length);
  }, [validImages.length]);

  // Auto-play effect
  useEffect(() => {
    if (validImages.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      goToNext();
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [validImages.length, isPaused, autoPlayInterval, goToNext]);

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

  const goToPrevious = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + validImages.length) % validImages.length);
  };

  const goToIndex = (index: number) => {
    if (index === currentIndex) return;
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeThreshold = 50;
    const velocityThreshold = 500;

    if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
      goToNext();
    } else if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
      goToPrevious();
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? "100%" : "-100%",
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? "100%" : "-100%",
      opacity: 0,
    }),
  };

  return (
    <div 
      className={cn("relative h-96 max-w-full rounded-lg bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20 overflow-hidden group touch-pan-y", className)}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* Main image with swipe */}
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.img
          key={currentIndex}
          src={validImages[currentIndex]}
          alt={`${serviceName} - Image ${currentIndex + 1}`}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 },
          }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.1}
          onDragEnd={handleDragEnd}
          className="absolute inset-0 w-full h-full object-cover cursor-grab active:cursor-grabbing"
        />
      </AnimatePresence>

      {/* Navigation arrows */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity h-10 w-10 rounded-full z-10"
        onClick={goToPrevious}
      >
        <ChevronLeft className="h-6 w-6" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity h-10 w-10 rounded-full z-10"
        onClick={goToNext}
      >
        <ChevronRight className="h-6 w-6" />
      </Button>

      {/* Dot indicators with progress */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {validImages.map((_, index) => (
          <button
            key={index}
            className={cn(
              "relative h-2.5 rounded-full transition-all overflow-hidden",
              index === currentIndex ? "w-6 bg-white/30" : "w-2.5 bg-white/50 hover:bg-white/75"
            )}
            onClick={() => goToIndex(index)}
            aria-label={`Go to image ${index + 1}`}
          >
            {index === currentIndex && !isPaused && (
              <motion.div
                className="absolute inset-0 bg-white rounded-full origin-left"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: autoPlayInterval / 1000, ease: "linear" }}
                key={`progress-${currentIndex}`}
              />
            )}
            {index === currentIndex && isPaused && (
              <div className="absolute inset-0 bg-white rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Image counter */}
      <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/60 text-white text-sm rounded-full z-10">
        {currentIndex + 1} / {validImages.length}
      </div>
    </div>
  );
}
