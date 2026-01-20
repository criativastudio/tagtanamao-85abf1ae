import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { BioTheme } from "@/types/bioPage";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";

interface BioPageGalleryProps {
  photos: string[];
  theme: BioTheme;
}

export const BioPageGallery = ({ photos, theme }: BioPageGalleryProps) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { 
      loop: true,
      align: 'center',
      skipSnaps: false,
    },
    [Autoplay({ delay: 4000, stopOnInteraction: true })]
  );

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCurrentSlide(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback((index: number) => {
    if (emblaApi) emblaApi.scrollTo(index);
  }, [emblaApi]);

  const handlePrevLightbox = () => {
    if (selectedIndex !== null) {
      setSelectedIndex(selectedIndex === 0 ? photos.length - 1 : selectedIndex - 1);
    }
  };

  const handleNextLightbox = () => {
    if (selectedIndex !== null) {
      setSelectedIndex(selectedIndex === photos.length - 1 ? 0 : selectedIndex + 1);
    }
  };

  if (photos.length === 0) return null;

  // Single photo - just show it
  if (photos.length === 1) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="relative rounded-2xl overflow-hidden aspect-video cursor-pointer"
        onClick={() => setSelectedIndex(0)}
        style={{ 
          boxShadow: theme.ledEnabled 
            ? `0 0 30px hsl(${theme.ledColor} / 0.3)` 
            : undefined
        }}
      >
        <img 
          src={photos[0]} 
          alt="Gallery" 
          className="w-full h-full object-cover"
        />
      </motion.div>
    );
  }

  return (
    <>
      <motion.div 
        className="relative"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {/* Carousel Container */}
        <div 
          className="overflow-hidden rounded-2xl"
          ref={emblaRef}
          style={{ 
            boxShadow: theme.ledEnabled 
              ? `0 0 30px hsl(${theme.ledColor} / 0.3)` 
              : undefined
          }}
        >
          <div className="flex">
            {photos.map((photo, index) => (
              <div 
                key={index} 
                className="flex-none w-full relative aspect-video cursor-pointer"
                onClick={() => setSelectedIndex(index)}
              >
                <img 
                  src={photo} 
                  alt={`Gallery ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                {/* LED overlay effect */}
                {theme.ledEnabled && (
                  <div 
                    className="absolute inset-0 pointer-events-none opacity-30"
                    style={{
                      background: `radial-gradient(ellipse at center, transparent 40%, hsl(${theme.ledColor} / 0.3) 100%)`
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Arrows */}
        {photos.length > 1 && (
          <>
            <button
              onClick={scrollPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all hover:scale-110"
              style={{ 
                backgroundColor: `hsl(${theme.cardColor} / 0.8)`,
                backdropFilter: `blur(${theme.blurAmount}px)`,
              }}
            >
              <ChevronLeft className="w-5 h-5" style={{ color: `hsl(${theme.textColor})` }} />
            </button>
            <button
              onClick={scrollNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all hover:scale-110"
              style={{ 
                backgroundColor: `hsl(${theme.cardColor} / 0.8)`,
                backdropFilter: `blur(${theme.blurAmount}px)`,
              }}
            >
              <ChevronRight className="w-5 h-5" style={{ color: `hsl(${theme.textColor})` }} />
            </button>
          </>
        )}

        {/* Dots Indicator */}
        {photos.length > 1 && (
          <div className="flex justify-center gap-2 mt-3">
            {photos.map((_, idx) => (
              <button
                key={idx}
                onClick={() => scrollTo(idx)}
                className="transition-all duration-300"
                style={{
                  width: idx === currentSlide ? '24px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  backgroundColor: idx === currentSlide 
                    ? `hsl(${theme.primaryColor})` 
                    : `hsl(${theme.textColor} / 0.3)`,
                  boxShadow: idx === currentSlide && theme.ledEnabled
                    ? `0 0 10px hsl(${theme.ledColor})`
                    : undefined,
                }}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.95)' }}
            onClick={() => setSelectedIndex(null)}
          >
            <button
              onClick={(e) => { e.stopPropagation(); setSelectedIndex(null); }}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
            >
              <X className="w-6 h-6 text-white" />
            </button>

            {photos.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); handlePrevLightbox(); }}
                className="absolute left-4 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
            )}

            <motion.img
              key={selectedIndex}
              src={photos[selectedIndex]}
              alt={`Gallery ${selectedIndex + 1}`}
              className="max-w-full max-h-[85vh] rounded-xl object-contain"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
            />

            {photos.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); handleNextLightbox(); }}
                className="absolute right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            )}

            {/* Lightbox Dots */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
              {photos.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); setSelectedIndex(idx); }}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === selectedIndex 
                      ? 'bg-white w-6' 
                      : 'bg-white/40 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
