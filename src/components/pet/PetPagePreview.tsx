import { motion } from "framer-motion";
import { 
  Instagram, Music2, Youtube, Facebook, Twitter, Linkedin,
  MessageCircle, Phone, Mail, MapPin, Globe, Link,
  LucideIcon, Gift, ChevronLeft, ChevronRight
} from "lucide-react";
import { PetButton } from "./PetButtonEditor";
import { useState, useEffect } from "react";

interface PetPagePreviewProps {
  petName: string | null;
  ownerName: string | null;
  photoUrl: string | null;
  galleryPhotos: string[];
  buttons: PetButton[];
  themeColor: string;
  rewardEnabled?: boolean;
  rewardText?: string;
}

const iconMap: Record<string, LucideIcon> = {
  Instagram,
  Music2,
  Youtube,
  Facebook,
  Twitter,
  Linkedin,
  MessageCircle,
  Phone,
  Mail,
  MapPin,
  Globe,
  Link,
};

const getIcon = (iconName: string): LucideIcon => {
  return iconMap[iconName] || Link;
};

export const PetPagePreview = ({
  petName,
  ownerName,
  photoUrl,
  galleryPhotos,
  buttons,
  themeColor,
  rewardEnabled,
  rewardText
}: PetPagePreviewProps) => {
  const activeButtons = buttons.filter(b => b.enabled).sort((a, b) => a.order - b.order);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto-slide gallery
  useEffect(() => {
    if (galleryPhotos.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % galleryPhotos.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [galleryPhotos.length]);

  const handlePrevSlide = () => {
    setCurrentSlide(prev => prev === 0 ? galleryPhotos.length - 1 : prev - 1);
  };

  const handleNextSlide = () => {
    setCurrentSlide(prev => (prev + 1) % galleryPhotos.length);
  };

  return (
    <div 
      className="min-h-full py-6 px-4 relative overflow-hidden"
      style={{ 
        background: `linear-gradient(180deg, ${themeColor}15 0%, hsl(220 20% 4%) 50%)`,
      }}
    >
      {/* LED Background Glow */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full blur-3xl pointer-events-none"
        style={{ backgroundColor: themeColor, opacity: 0.15 }}
      />

      <div className="relative z-10 max-w-sm mx-auto space-y-5">
        {/* Profile Photo with LED Ring */}
        <motion.div 
          className="flex flex-col items-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="relative">
            {/* LED Ring Animation */}
            <motion.div 
              className="absolute inset-0 rounded-full"
              style={{ 
                boxShadow: `0 0 30px 8px ${themeColor}80, 0 0 60px 15px ${themeColor}40`,
              }}
              animate={{
                boxShadow: [
                  `0 0 30px 8px ${themeColor}80, 0 0 60px 15px ${themeColor}40`,
                  `0 0 40px 12px ${themeColor}90, 0 0 80px 20px ${themeColor}50`,
                  `0 0 30px 8px ${themeColor}80, 0 0 60px 15px ${themeColor}40`,
                ]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            
            <div 
              className="w-24 h-24 rounded-full overflow-hidden border-2 relative z-10"
              style={{ borderColor: themeColor, backgroundColor: 'hsl(220 20% 7%)' }}
            >
              {photoUrl ? (
                <img 
                  src={photoUrl} 
                  alt={petName || "Pet"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl">
                  🐾
                </div>
              )}
            </div>
          </div>

          {/* Name & Owner */}
          <div className="text-center mt-4 space-y-1">
            <h1 
              className="text-xl font-bold text-white"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {petName || "Nome do Pet"}
            </h1>
            {ownerName && (
              <p className="text-sm text-white/60">Tutor: {ownerName}</p>
            )}
          </div>
        </motion.div>

        {/* Reward Banner */}
        {rewardEnabled && rewardText && (
          <motion.div 
            className="rounded-xl p-3 flex items-start gap-2"
            style={{ 
              backgroundColor: `${themeColor}20`,
              border: `1px solid ${themeColor}40`
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Gift className="h-4 w-4 shrink-0 mt-0.5" style={{ color: themeColor }} />
            <div>
              <p className="font-semibold text-sm" style={{ color: themeColor }}>Recompensa!</p>
              <p className="text-xs text-white/70">{rewardText}</p>
            </div>
          </motion.div>
        )}

        {/* Gallery Carousel */}
        {galleryPhotos.length > 0 && (
          <motion.div 
            className="relative rounded-2xl overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="aspect-[4/3] relative">
              {galleryPhotos.map((photo, index) => (
                <motion.img
                  key={photo}
                  src={photo}
                  alt={`Foto ${index + 1}`}
                  className="absolute inset-0 w-full h-full object-cover"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: index === currentSlide ? 1 : 0 }}
                  transition={{ duration: 0.5 }}
                />
              ))}
              
              {/* LED Border */}
              <div 
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{ 
                  boxShadow: `inset 0 0 20px ${themeColor}30, 0 0 15px ${themeColor}20`,
                  border: `1px solid ${themeColor}30`
                }}
              />

              {/* Navigation Arrows */}
              {galleryPhotos.length > 1 && (
                <>
                  <button 
                    onClick={handlePrevSlide}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button 
                    onClick={handleNextSlide}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}

              {/* Dots Indicator */}
              {galleryPhotos.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {galleryPhotos.map((_, index) => (
                    <button
                      key={index}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentSlide 
                          ? 'w-4' 
                          : 'opacity-50'
                      }`}
                      style={{ backgroundColor: themeColor }}
                      onClick={() => setCurrentSlide(index)}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Custom Buttons */}
        {activeButtons.length > 0 && (
          <motion.div 
            className="space-y-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {activeButtons.map((button, index) => {
              const Icon = getIcon(button.icon);
              return (
                <motion.button
                  key={button.id}
                  className="w-full py-3 px-4 rounded-xl flex items-center justify-center gap-3 font-medium relative overflow-hidden group transition-all"
                  style={{ 
                    backgroundColor: `${button.color}20`,
                    border: `1px solid ${button.color}40`,
                    color: 'white'
                  }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* LED Glow on Hover */}
                  <motion.div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-xl"
                    style={{ 
                      boxShadow: `0 0 20px ${button.color}50, inset 0 0 10px ${button.color}20`,
                    }}
                  />
                  <Icon className="w-5 h-5 relative z-10" style={{ color: button.color }} />
                  <span className="relative z-10">{button.label}</span>
                </motion.button>
              );
            })}
          </motion.div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-white/40 pt-4">
          Powered by TagNaMão 🏷️
        </p>
      </div>
    </div>
  );
};
