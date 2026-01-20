import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { BioTheme } from "@/types/bioPage";

interface BioPageGalleryProps {
  photos: string[];
  theme: BioTheme;
}

export const BioPageGallery = ({ photos, theme }: BioPageGalleryProps) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handlePrev = () => {
    if (selectedIndex !== null) {
      setSelectedIndex(selectedIndex === 0 ? photos.length - 1 : selectedIndex - 1);
    }
  };

  const handleNext = () => {
    if (selectedIndex !== null) {
      setSelectedIndex(selectedIndex === photos.length - 1 ? 0 : selectedIndex + 1);
    }
  };

  return (
    <>
      <motion.div 
        className="grid grid-cols-3 gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {photos.slice(0, 6).map((photo, index) => (
          <motion.button
            key={index}
            onClick={() => setSelectedIndex(index)}
            className="aspect-square rounded-xl overflow-hidden relative group"
            style={{ 
              backdropFilter: `blur(${theme.blurAmount}px)`,
              backgroundColor: `hsl(${theme.cardColor} / 0.5)`,
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <img 
              src={photo} 
              alt={`Gallery ${index + 1}`}
              className="w-full h-full object-cover"
            />
            {theme.ledEnabled && (
              <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ 
                  boxShadow: `inset 0 0 20px hsl(${theme.ledColor} / 0.5)`,
                }}
              />
            )}
          </motion.button>
        ))}
      </motion.div>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
            onClick={() => setSelectedIndex(null)}
          >
            <button
              onClick={(e) => { e.stopPropagation(); setSelectedIndex(null); }}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); handlePrev(); }}
              className="absolute left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>

            <motion.img
              key={selectedIndex}
              src={photos[selectedIndex]}
              alt={`Gallery ${selectedIndex + 1}`}
              className="max-w-full max-h-[80vh] rounded-xl object-contain"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
            />

            <button
              onClick={(e) => { e.stopPropagation(); handleNext(); }}
              className="absolute right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {photos.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); setSelectedIndex(idx); }}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    idx === selectedIndex ? 'bg-white' : 'bg-white/30'
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
